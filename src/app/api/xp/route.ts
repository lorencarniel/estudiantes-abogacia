import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLevelInfo } from "@/lib/xp";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userXP = await prisma.userXP.findUnique({
    where: { userId: session.user.id },
  });

  if (!userXP) {
    return NextResponse.json(getLevelInfo(0));
  }

  return NextResponse.json({
    ...getLevelInfo(userXP.totalXP),
    streak: userXP.streak,
  });
}
