import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const [quizzes, games] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { userId, completedAt: { not: null } },
        select: { title: true, score: true, total: true },
      }),
      prisma.gameSession.findMany({
        where: { userId, completedAt: { not: null } },
        select: { title: true, score: true, total: true },
      }),
    ]);

    const topicMap = new Map<
      string,
      { quizScores: number[]; gameScores: number[] }
    >();

    for (const q of quizzes) {
      const key = q.title;
      if (!topicMap.has(key)) topicMap.set(key, { quizScores: [], gameScores: [] });
      topicMap.get(key)!.quizScores.push(
        q.total > 0 ? Math.round(((q.score || 0) / q.total) * 100) : 0
      );
    }

    for (const g of games) {
      const key = g.title;
      if (!topicMap.has(key)) topicMap.set(key, { quizScores: [], gameScores: [] });
      topicMap.get(key)!.gameScores.push(
        g.total > 0 ? Math.round(((g.score || 0) / g.total) * 100) : 0
      );
    }

    const topics = Array.from(topicMap.entries())
      .map(([title, data]) => {
        const quizCount = data.quizScores.length;
        const gameCount = data.gameScores.length;
        const quizAvgScore =
          quizCount > 0
            ? Math.round(data.quizScores.reduce((a, b) => a + b, 0) / quizCount)
            : 0;
        const gameAvgScore =
          gameCount > 0
            ? Math.round(data.gameScores.reduce((a, b) => a + b, 0) / gameCount)
            : 0;
        const totalAttempts = quizCount + gameCount;
        const overallScore =
          totalAttempts > 0
            ? Math.round(
                (quizAvgScore * quizCount + gameAvgScore * gameCount) /
                  totalAttempts
              )
            : 0;

        return {
          title,
          quizCount,
          quizAvgScore,
          gameCount,
          gameAvgScore,
          totalAttempts,
          overallScore,
        };
      })
      .sort((a, b) => a.overallScore - b.overallScore);

    return NextResponse.json({ topics });
  } catch (error) {
    console.error("Error al obtener estadísticas por tema:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas por tema" },
      { status: 500 }
    );
  }
}
