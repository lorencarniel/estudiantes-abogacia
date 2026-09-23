import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT, SIMPLE_MODE_SUFFIX } from "@/lib/ai";
import { unitOutlinePrompt, unitOutlineSchema } from "@/lib/prompts";
import { safeJsonParse } from "@/lib/utils";

const requestSchema = z.object({
  text: z.string().min(80).max(100_000),
  unitTitle: z.string(),
  unitTopics: z.array(z.string()),
  simpleMode: z.boolean().optional(),
});

interface UnitOutlineResult {
  title: string;
  sections: Array<{
    heading: string;
    note: string;
    items: Array<{ text: string; note: string }>;
  }>;
  missing_topics: string[];
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { text, unitTitle, unitTopics, simpleMode } = parsed.data;
  const simpleSuffix = simpleMode ? SIMPLE_MODE_SUFFIX : "";

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: unitOutlinePrompt(text, unitTitle, unitTopics) + simpleSuffix },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "unit_outline", strict: true, schema: unitOutlineSchema },
      },
      temperature: 0.1,
      max_tokens: 16000,
    });

    const content = safeJsonParse(
      response.choices?.[0]?.message?.content,
      { title: unitTitle, sections: [], missing_topics: [] } as UnitOutlineResult
    );
    const finishReason = response.choices?.[0]?.finish_reason;

    if (finishReason === "length" && content.sections.length > 0) {
      const existingHeadings = content.sections.map((s) => s.heading);
      const remainingTopics = unitTopics.filter(
        (t) => !existingHeadings.some((h) => h.toLowerCase().includes(t.toLowerCase().substring(0, 20)))
      );

      if (remainingTopics.length > 0) {
        const contResponse = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: unitOutlinePrompt(text, unitTitle, remainingTopics) + simpleSuffix +
                "\n\nYa se generaron estas secciones: " + existingHeadings.join(", ") +
                ". Generá SOLO las secciones faltantes.",
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "unit_outline", strict: true, schema: unitOutlineSchema },
          },
          temperature: 0.1,
          max_tokens: 16000,
        });

        const contContent = safeJsonParse(
          contResponse.choices?.[0]?.message?.content,
          { title: "", sections: [], missing_topics: [] } as UnitOutlineResult
        );

        if (contContent.sections.length > 0) {
          content.sections.push(...contContent.sections);
        }
        if (contContent.missing_topics.length > 0) {
          const existingMissing = new Set(content.missing_topics);
          for (const t of contContent.missing_topics) {
            if (!existingMissing.has(t)) content.missing_topics.push(t);
          }
        }
      }
    }

    return NextResponse.json(content);
  } catch (err) {
    console.error("Unit outline error:", err);
    return NextResponse.json(
      { error: "No se pudo generar el esquema de esta unidad." },
      { status: 502 }
    );
  }
}
