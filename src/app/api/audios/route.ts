import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import path from "path";
import { unlink } from "fs/promises";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
  const audios = await prisma.audioExplanation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      script: true,
      duration: true,
      voice: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ audios });
  } catch (error) {
    console.error("Error al obtener audios:", error);
    return NextResponse.json({ error: "Error al obtener audios" }, { status: 500 });
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

  const audio = await prisma.audioExplanation.findFirst({
    where: { id, userId: session.user.id },
  });

  if (audio) {
    try {
      const safeName = path.basename(audio.fileName);
      const filePath = path.join(process.cwd(), "storage", "audios", safeName);
      await unlink(filePath);
    } catch { /* file may not exist */ }

    await prisma.audioExplanation.delete({ where: { id } });
  }

  return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar audio:", error);
    return NextResponse.json({ error: "Error al eliminar audio" }, { status: 500 });
  }
}
