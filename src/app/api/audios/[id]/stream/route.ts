import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const audio = await prisma.audioExplanation.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!audio) {
    return new NextResponse("Audio no encontrado", { status: 404 });
  }

  try {
    const safeName = path.basename(audio.fileName);
    const filePath = path.join(process.cwd(), "storage", "audios", safeName);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Archivo no encontrado", { status: 404 });
  }
}
