import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  cardId: z.string(),
  quality: z.number().int().min(0).max(5),
});

function sm2(
  quality: number,
  repetitions: number,
  easeFactor: number,
  interval: number
): { repetitions: number; easeFactor: number; interval: number } {
  let newEF = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  if (quality < 3) {
    return { repetitions: 0, easeFactor: newEF, interval: 1 };
  }

  let newInterval: number;
  let newReps: number;

  if (repetitions === 0) {
    newInterval = 1;
    newReps = 1;
  } else if (repetitions === 1) {
    newInterval = 6;
    newReps = 2;
  } else {
    newInterval = Math.round(interval * newEF);
    newReps = repetitions + 1;
  }

  return { repetitions: newReps, easeFactor: newEF, interval: newInterval };
}

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
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { cardId, quality } = parsed.data;

  const card = await prisma.flashcard.findFirst({
    where: { id: cardId, deck: { id: params.id, userId: session.user.id } },
  });

  if (!card) {
    return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });
  }

  const result = sm2(quality, card.repetitions, card.easeFactor, card.interval);

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + result.interval);

  const updated = await prisma.flashcard.update({
    where: { id: cardId },
    data: {
      repetitions: result.repetitions,
      easeFactor: result.easeFactor,
      interval: result.interval,
      nextReview,
    },
  });

  return NextResponse.json(updated);
  } catch (error) {
    console.error("Error al registrar revisión de flashcard:", error);
    return NextResponse.json({ error: "Error al registrar revisión de flashcard" }, { status: 500 });
  }
}
