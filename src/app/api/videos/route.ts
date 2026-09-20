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
  const videos = await prisma.videoExplanation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slides: true,
      duration: true,
      voice: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    videos: videos.map((v) => ({
      ...v,
      slides: safeJsonParse(v.slides, []),
    })),
  });
  } catch (error) {
    console.error("Error al obtener videos:", error);
    return NextResponse.json({ error: "Error al obtener videos" }, { status: 500 });
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

  const video = await prisma.videoExplanation.findFirst({
    where: { id, userId: session.user.id },
  });

  if (video) {
    try {
      const path = await import("path");
      const { unlink } = await import("fs/promises");
      const safeName = path.basename(video.fileName);
      await unlink(
        path.join(process.cwd(), "storage", "audios", safeName)
      );
    } catch {
      /* file may not exist */
    }
    await prisma.videoExplanation.delete({ where: { id } });
  }

  return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar video:", error);
    return NextResponse.json({ error: "Error al eliminar video" }, { status: 500 });
  }
}
