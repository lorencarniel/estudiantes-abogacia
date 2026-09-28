import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import mammoth from "mammoth";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let fileName = "";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.name) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }

    fileName = file.name;

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo supera el límite de 20 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse/lib/pdf-parse") as (
          buf: Buffer,
          options?: Record<string, unknown>,
        ) => Promise<{ text: string; numpages: number }>;
        let pageNum = 0;
        const data = await pdfParse(buffer, {
          pagerender: (pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) =>
            pageData.getTextContent().then((content) => {
              pageNum++;
              const pageText = content.items.map((item) => item.str).join(" ");
              return `\n[Página ${pageNum}]\n${pageText}`;
            }),
        });
        text = data.text;
      } catch (pdfErr) {
        console.error("PDF parse error:", pdfErr);
        return NextResponse.json(
          { error: "No se pudo leer el PDF. Puede estar dañado, protegido o ser un escaneo sin texto." },
          { status: 422 }
        );
      }
    } else if (
      lowerName.endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } catch (docErr) {
        console.error("DOCX parse error:", docErr);
        return NextResponse.json(
          { error: "No se pudo leer el archivo Word. Asegurate de que sea un .docx válido." },
          { status: 422 }
        );
      }
    } else if (lowerName.endsWith(".doc")) {
      return NextResponse.json(
        { error: "El formato .doc (Word antiguo) no está soportado. Abrí el archivo en Word y guardalo como .docx, o exportalo como PDF." },
        { status: 400 }
      );
    } else if (lowerName.endsWith(".txt")) {
      text = buffer.toString("utf-8");
    } else {
      const ext = lowerName.split(".").pop() || "desconocido";
      return NextResponse.json(
        { error: `Formato .${ext} no soportado. Podés subir: PDF, Word (.docx) o texto (.txt).` },
        { status: 400 }
      );
    }

    const cleaned = text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^ +| +$/gm, "")
      .trim();

    if (cleaned.length < 80) {
      return NextResponse.json(
        { error: "El archivo no tiene suficiente texto extraíble (se encontraron solo " + cleaned.length + " caracteres, se necesitan 80). Si es un PDF escaneado (imágenes), probá pegando el texto manualmente." },
        { status: 422 }
      );
    }

    const pageMarkers = (cleaned.match(/\[Página \d+\]/g) || []).length;
    const charsPerPage = pageMarkers > 0 ? cleaned.length / pageMarkers : cleaned.length;
    let scanWarning: string | undefined;
    if (pageMarkers > 2 && charsPerPage < 200) {
      scanWarning = `El archivo parece ser un PDF escaneado o con muy poco texto extraíble (${Math.round(charsPerPage)} caracteres por página). Si el contenido no se ve bien, probá pegando el texto manualmente.`;
    }

    if (cleaned.length > 100_000) {
      const truncated = cleaned.substring(0, 100_000);
      const lastPageMatch = truncated.match(/\[Página (\d+)\][^[]*$/);
      const lastPage = lastPageMatch ? lastPageMatch[1] : "?";
      return NextResponse.json({
        text: truncated,
        truncated: true,
        originalLength: cleaned.length,
        message: `El texto fue recortado a 100.000 caracteres (original: ${cleaned.length.toLocaleString()}). Se conservaron hasta la página ${lastPage}. Para procesar el resto, subí las páginas restantes por separado.`,
      });
    }

    return NextResponse.json({
      text: cleaned,
      truncated: false,
      fileName,
      charCount: cleaned.length,
      pageCount: pageMarkers || undefined,
      ...(scanWarning ? { warning: scanWarning } : {}),
    });
  } catch (err) {
    console.error("Extract error for file:", fileName, err);
    return NextResponse.json(
      { error: "No se pudo procesar el archivo. Probá con otro o pegá el texto manualmente." },
      { status: 500 }
    );
  }
}
