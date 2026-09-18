import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai, AI_MODEL, SYSTEM_PROMPT, MAX_INPUT_LENGTH } from "@/lib/ai";
import { videoSlidesPrompt, videoSlidesSchema } from "@/lib/prompts";

const WORDS_PER_SECOND = 2.5;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { text, voice = "nova", syllabusId } = body;

  if (!text || text.length < 80) {
    return NextResponse.json(
      { error: "El texto debe tener al menos 80 caracteres" },
      { status: 400 }
    );
  }

  if (text.length > MAX_INPUT_LENGTH) {
    return NextResponse.json(
      { error: `El texto supera el límite de ${MAX_INPUT_LENGTH.toLocaleString()} caracteres` },
      { status: 400 }
    );
  }

  const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  if (!validVoices.includes(voice)) {
    return NextResponse.json({ error: "Voz inválida" }, { status: 400 });
  }

  let syllabusContent: string | undefined;
  if (syllabusId) {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id: syllabusId, userId: session.user.id },
    });
    if (syllabus) syllabusContent = syllabus.content;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: videoSlidesPrompt(text, syllabusContent) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "video_slides",
          strict: true,
          schema: videoSlidesSchema,
        },
      },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const raw = JSON.parse(completion.choices[0].message.content || "{}");

    let cumulativeTime = 0;
    const slides = raw.slides.map(
      (s: { slideTitle: string; bullets: string[]; narration: string }) => {
        const wordCount = s.narration.split(/\s+/).length;
        const duration = wordCount / WORDS_PER_SECOND;
        const startTime = cumulativeTime;
        cumulativeTime += duration;
        return {
          slideTitle: s.slideTitle,
          bullets: s.bullets,
          narration: s.narration,
          wordCount,
          startTime: Math.round(startTime * 10) / 10,
          endTime: Math.round(cumulativeTime * 10) / 10,
        };
      }
    );

    const fullScript = slides
      .map((s: { narration: string }) => s.narration)
      .join(" ... ");

    const totalDuration = Math.ceil(cumulativeTime);

    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: fullScript,
      response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const fileName = `video_${session.user.id}_${Date.now()}.mp3`;
    const storageDir = path.join(process.cwd(), "storage", "audios");

    await mkdir(storageDir, { recursive: true });
    await writeFile(path.join(storageDir, fileName), audioBuffer);

    const video = await prisma.videoExplanation.create({
      data: {
        userId: session.user.id,
        title: raw.title,
        slides: JSON.stringify(slides),
        script: fullScript,
        fileName,
        duration: totalDuration,
        voice,
      },
    });

    return NextResponse.json({
      id: video.id,
      title: raw.title,
      slides,
      duration: totalDuration,
      voice,
    });
  } catch (err) {
    console.error("Video generation error:", err);
    return NextResponse.json(
      { error: "Error al generar el video. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
