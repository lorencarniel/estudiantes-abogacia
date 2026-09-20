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
  const games = await prisma.gameSession.findMany({
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
  });

  return NextResponse.json({ games });
  } catch (error) {
    console.error("Error al obtener juegos:", error);
    return NextResponse.json({ error: "Error al obtener juegos" }, { status: 500 });
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
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  await prisma.gameSession.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar juego:", error);
    return NextResponse.json({ error: "Error al eliminar juego" }, { status: 500 });
  }
}
