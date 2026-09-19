import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { expandNodePrompt, expandNodeSchema } from "@/lib/prompts";

const requestSchema = z.object({
  text: z.string().min(80).max(100_000),
  parentId: z.string(),
  parentLabel: z.string(),
  parentCategory: z.string(),
  existingLabels: z.array(z.string()),
});

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

  const { text, parentId, parentLabel, parentCategory, existingLabels } = parsed.data;

  try {
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: expandNodePrompt(text, parentLabel, parentCategory, existingLabels) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "expand_node", strict: true, schema: expandNodeSchema },
      },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = JSON.parse(response.choices[0].message.content || "{}");

    const prefix = parentId;
    const nodes = content.nodes.map((n: { id: string; label: string; category: string; expandable: boolean }, i: number) => ({
      ...n,
      id: `${prefix}-${i + 1}`,
    }));

    const edges = nodes.map((n: { id: string; label: string; category: string }, i: number) => ({
      source: parentId,
      target: n.id,
      label: content.edges[i]?.label || "se relaciona con",
    }));

    return NextResponse.json({ nodes, edges });
  } catch (err) {
    console.error("Expand node error:", err);
    return NextResponse.json(
      { error: "No se pudo expandir el nodo. Intentá de nuevo." },
      { status: 502 },
    );
  }
}
