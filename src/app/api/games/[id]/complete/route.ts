import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addXP } from "@/lib/xp";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { answers, score, streak } = body;

    if (typeof score !== "number" || score < 0 || score > 100000) {
      return NextResponse.json({ error: "Puntaje inválido" }, { status: 400 });
    }
    if (typeof streak !== "number" || streak < 0 || streak > 1000) {
      return NextResponse.json({ error: "Racha inválida" }, { status: 400 });
    }

    const game = await prisma.gameSession.findFirst({
      where: { id: params.id, userId: session.user.id, completedAt: null },
    });

    if (!game) {
      return NextResponse.json({ error: "Juego no encontrado o ya completado" }, { status: 404 });
    }

    await prisma.gameSession.update({
      where: { id: params.id },
      data: {
        answers: JSON.stringify(answers || []),
        score: Math.round(score),
        streak: Math.round(streak),
        completedAt: new Date(),
      },
    });

    addXP(session.user.id, "game_complete").catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
