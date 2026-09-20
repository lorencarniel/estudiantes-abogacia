import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const [contents, quizzes, flashDecks, studySchedules, audioExplanations, gameSessions, videoExplanations] = await Promise.all([
    prisma.generatedContent.findMany({
      where: {
        userId: session.user.id,
        ...(type && type !== "quiz" && type !== "flashcard_deck" && type !== "schedule" && type !== "audio" && type !== "game" && type !== "video" ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        createdAt: true,
        content: true,
      },
    }),
    !type || type === "quiz"
      ? prisma.quizAttempt.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            difficulty: true,
            score: true,
            total: true,
            passed: true,
            createdAt: true,
            completedAt: true,
            questions: true,
            answers: true,
          },
        })
      : Promise.resolve([]),
    !type || type === "flashcard_deck"
      ? prisma.flashcardDeck.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            createdAt: true,
            flashcards: {
              select: { id: true, front: true, back: true },
            },
          },
        })
      : Promise.resolve([]),
    !type || type === "schedule"
      ? prisma.studySchedule.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            examDate: true,
            createdAt: true,
            completedDays: true,
            schedule: true,
          },
        })
      : Promise.resolve([]),
    !type || type === "audio"
      ? prisma.audioExplanation.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            duration: true,
            voice: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    !type || type === "game"
      ? prisma.gameSession.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            gameType: true,
            title: true,
            score: true,
            total: true,
            streak: true,
            completedAt: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    !type || type === "video"
      ? prisma.videoExplanation.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            duration: true,
            voice: true,
            slides: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const items = [
    ...contents.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      createdAt: c.createdAt,
      data: safeJsonParse(c.content, {}),
    })),
    ...quizzes.map((q) => ({
      id: q.id,
      type: "quiz" as const,
      title: q.title,
      createdAt: q.createdAt,
      data: {
        difficulty: q.difficulty,
        score: q.score,
        total: q.total,
        passed: q.passed,
        completed: !!q.completedAt,
        questions: safeJsonParse(q.questions, []),
        answers: safeJsonParse(q.answers, null),
      },
    })),
    ...flashDecks.map((d) => ({
      id: d.id,
      type: "flashcard_deck" as const,
      title: d.title,
      createdAt: d.createdAt,
      data: {
        cardCount: d.flashcards.length,
        cards: d.flashcards,
      },
    })),
    ...studySchedules.map((s) => {
      const days = safeJsonParse(s.schedule, []);
      const completed = safeJsonParse(s.completedDays, []);
      return {
        id: s.id,
        type: "schedule" as const,
        title: s.title,
        createdAt: s.createdAt,
        data: {
          examDate: s.examDate,
          totalDays: days.length,
          completedDays: completed.length,
        },
      };
    }),
    ...audioExplanations.map((a) => ({
      id: a.id,
      type: "audio" as const,
      title: a.title,
      createdAt: a.createdAt,
      data: {
        duration: a.duration,
        voice: a.voice,
      },
    })),
    ...gameSessions.map((g) => ({
      id: g.id,
      type: "game" as const,
      title: g.title,
      createdAt: g.createdAt,
      data: {
        gameType: g.gameType,
        score: g.score,
        total: g.total,
        streak: g.streak,
        completed: !!g.completedAt,
      },
    })),
    ...videoExplanations.map((v) => ({
      id: v.id,
      type: "video" as const,
      title: v.title,
      createdAt: v.createdAt,
      data: {
        duration: v.duration,
        voice: v.voice,
        slideCount: safeJsonParse(v.slides, []).length,
      },
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ items });
  } catch (error) {
    console.error("Error al cargar el historial:", error);
    return NextResponse.json({ error: "Error al cargar el historial" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  if (type === "quiz") {
    await prisma.quizAttempt.deleteMany({
      where: { id, userId: session.user.id },
    });
  } else if (type === "flashcard_deck") {
    await prisma.flashcardDeck.deleteMany({
      where: { id, userId: session.user.id },
    });
  } else if (type === "schedule") {
    await prisma.studySchedule.deleteMany({
      where: { id, userId: session.user.id },
    });
  } else if (type === "game") {
    await prisma.gameSession.deleteMany({
      where: { id, userId: session.user.id },
    });
  } else if (type === "video") {
    const video = await prisma.videoExplanation.findFirst({
      where: { id, userId: session.user.id },
    });
    if (video) {
      try {
        const path = await import("path");
        const { unlink } = await import("fs/promises");
        const safeName = path.basename(video.fileName);
        await unlink(path.join(process.cwd(), "storage", "audios", safeName));
      } catch { /* file may not exist */ }
      await prisma.videoExplanation.delete({ where: { id } });
    }
  } else if (type === "audio") {
    const audio = await prisma.audioExplanation.findFirst({
      where: { id, userId: session.user.id },
    });
    if (audio) {
      try {
        const path = await import("path");
        const { unlink } = await import("fs/promises");
        const safeName2 = path.basename(audio.fileName);
        await unlink(path.join(process.cwd(), "storage", "audios", safeName2));
      } catch { /* file may not exist */ }
      await prisma.audioExplanation.delete({ where: { id } });
    }
  } else {
    await prisma.generatedContent.deleteMany({
      where: { id, userId: session.user.id },
    });
  }

  return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar del historial:", error);
    return NextResponse.json({ error: "Error al eliminar del historial" }, { status: 500 });
  }
}
