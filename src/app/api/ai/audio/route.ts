import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { authOptions } from "@/lib/auth";
import { openai, AI_MODEL, SYSTEM_PROMPT } from "@/lib/ai";
import { audioScriptPrompt, audioScriptSchema } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";
import { addXP } from "@/lib/xp";

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;

const requestSchema = z.object({
  text: z.string().min(80).max(100_000),
  voice: z.enum(VOICES).optional().default("nova"),
  syllabusId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Texto inválido (mínimo 80 caracteres)" }, { status: 400 });
  }

  const { text, voice, syllabusId } = parsed.data;

  let syllabusContent: string | undefined;
  if (syllabusId) {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id: syllabusId, userId: session.user.id },
    });
    if (syllabus) syllabusContent = syllabus.content;
  }

  try {
    const scriptResponse = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: audioScriptPrompt(text, syllabusContent) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "audio_script", strict: true, schema: audioScriptSchema },
      },
      temperature: 0.5,
      max_tokens: 4000,
    });

    const scriptContent = safeJsonParse(scriptResponse.choices[0]?.message?.content, { title: "", script: "" });
    const script = scriptContent.script || "";
    const title = scriptContent.title || "Audio explicativo";

    if (!script || script.length < 50) {
      return NextResponse.json({ error: "No se pudo generar el guión del audio. El material puede ser demasiado corto." }, { status: 502 });
    }

    const TTS_CHAR_LIMIT = 4096;
    let audioBuffer: Buffer;
    try {
      if (script.length <= TTS_CHAR_LIMIT) {
        const ttsResponse = await openai.audio.speech.create({
          model: "tts-1",
          voice: voice,
          input: script,
          response_format: "mp3",
        });
        audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
      } else {
        const chunks: string[] = [];
        let remaining = script;
        while (remaining.length > 0) {
          if (remaining.length <= TTS_CHAR_LIMIT) {
            chunks.push(remaining);
            break;
          }
          let cutAt = remaining.lastIndexOf(". ", TTS_CHAR_LIMIT);
          if (cutAt < TTS_CHAR_LIMIT * 0.5) cutAt = remaining.lastIndexOf(" ", TTS_CHAR_LIMIT);
          if (cutAt < TTS_CHAR_LIMIT * 0.3) cutAt = TTS_CHAR_LIMIT;
          chunks.push(remaining.slice(0, cutAt + 1));
          remaining = remaining.slice(cutAt + 1).trimStart();
        }
        const buffers: Buffer[] = [];
        for (const chunk of chunks) {
          const ttsResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: chunk,
            response_format: "mp3",
          });
          buffers.push(Buffer.from(await ttsResponse.arrayBuffer()));
        }
        audioBuffer = Buffer.concat(buffers);
      }
    } catch (ttsErr) {
      console.error("TTS error:", ttsErr);
      return NextResponse.json({ error: "No se pudo sintetizar el audio. Intentá con un texto más corto." }, { status: 502 });
    }

    const storageDir = path.join(process.cwd(), "storage", "audios");
    await mkdir(storageDir, { recursive: true });

    const fileName = `${Date.now()}-${session.user.id.slice(-6)}.mp3`;
    const filePath = path.join(storageDir, fileName);
    await writeFile(filePath, audioBuffer);

    const durationEstimate = Math.round(script.split(/\s+/).length / 2.5);

    const saved = await prisma.audioExplanation.create({
      data: {
        userId: session.user.id,
        title,
        script,
        fileName,
        duration: durationEstimate,
        voice,
      },
    });

    addXP(session.user.id, "audio").catch(() => {});

    return NextResponse.json({
      id: saved.id,
      title: saved.title,
      script: saved.script,
      duration: saved.duration,
      voice: saved.voice,
      createdAt: saved.createdAt,
    });
  } catch (err) {
    console.error("Audio generation error:", err);
    return NextResponse.json(
      { error: "No se pudo generar el audio. Intentá de nuevo." },
      { status: 502 },
    );
  }
}
