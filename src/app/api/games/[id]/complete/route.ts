import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { answers, score, streak } = body;

  const game = await prisma.gameSession.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!game) {
    return NextResponse.json(
      { error: "Juego no encontrado" },
      { status: 404 }
    );
  }

  await prisma.gameSession.update({
    where: { id: params.id },
    data: {
      answers: JSON.stringify(answers),
      score,
      streak,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
