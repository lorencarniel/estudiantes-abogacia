import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const material = await prisma.material.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!material) {
    return NextResponse.json({ error: "Apunte no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: material.id,
    title: material.title,
    content: material.content,
    fileName: material.fileName,
    charCount: material.charCount,
  });
}
