import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
  const userId = session.user.id;

  const [
    contentCount,
    quizzes,
    flashdeckCount,
    flashcardCount,
    schedules,
    audioCount,
    games,
    videoCount,
    recentContent,
    recentQuizzes,
    recentFlashdecks,
    recentGames,
  ] = await Promise.all([
    prisma.generatedContent.count({ where: { userId } }),
    prisma.quizAttempt.findMany({
      where: { userId, completedAt: { not: null } },
      select: { score: true, total: true, passed: true },
    }),
    prisma.flashcardDeck.count({ where: { userId } }),
    prisma.flashcard.count({ where: { deck: { userId } } }),
    prisma.studySchedule.findMany({
      where: { userId },
      select: { completedDays: true },
    }),
    prisma.audioExplanation.count({ where: { userId } }),
    prisma.gameSession.findMany({
      where: { userId, completedAt: { not: null } },
      select: { score: true, total: true, streak: true },
    }),
    prisma.videoExplanation.count({ where: { userId } }),
    prisma.generatedContent.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.quizAttempt.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.flashcardDeck.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.gameSession.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const passedQuizzes = quizzes.filter((q) => q.passed);
  const avgQuizScore =
    quizzes.length > 0
      ? Math.round(
          quizzes.reduce(
            (acc, q) => acc + ((q.score || 0) / q.total) * 100,
            0
          ) / quizzes.length
        )
      : 0;

  const avgGameScore =
    games.length > 0
      ? Math.round(
          games.reduce((acc, g) => acc + (g.score || 0), 0) / games.length
        )
      : 0;
  const bestStreak = games.reduce((max, g) => Math.max(max, g.streak), 0);

  const scheduleDaysCompleted = schedules.reduce((acc, s) => {
    return acc + safeJsonParse(s.completedDays, []).length;
  }, 0);

  const totalItems =
    contentCount +
    quizzes.length +
    flashdeckCount +
    schedules.length +
    audioCount +
    games.length +
    videoCount;

  const allDates = [
    ...recentContent.map((c) => c.createdAt),
    ...recentQuizzes.map((q) => q.createdAt),
    ...recentFlashdecks.map((f) => f.createdAt),
    ...recentGames.map((g) => g.createdAt),
  ];

  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const activityByDay = last7.map((day) => ({
    date: day,
    count: allDates.filter(
      (d) => new Date(d).toISOString().split("T")[0] === day
    ).length,
  }));

  const uniqueDays = new Set(
    allDates.map((d) => new Date(d).toISOString().split("T")[0])
  );
  let studyStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    if (uniqueDays.has(key)) {
      studyStreak++;
    } else {
      break;
    }
  }

  return NextResponse.json({
    totalItems,
    studyStreak,
    quizzes: {
      total: quizzes.length,
      passed: passedQuizzes.length,
      avgScore: avgQuizScore,
    },
    flashcards: { decks: flashdeckCount, cards: flashcardCount },
    games: { total: games.length, avgScore: avgGameScore, bestStreak },
    schedules: { total: schedules.length, daysCompleted: scheduleDaysCompleted },
    audios: audioCount,
    videos: videoCount,
    content: contentCount,
    activityByDay,
  });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 });
  }
}
