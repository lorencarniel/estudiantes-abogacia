import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const decks = await prisma.flashcardDeck.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      flashcards: {
        select: {
          id: true,
          front: true,
          back: true,
          interval: true,
          repetitions: true,
          easeFactor: true,
          nextReview: true,
        },
      },
    },
  });

  return NextResponse.json({ decks });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  await prisma.flashcardDeck.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
