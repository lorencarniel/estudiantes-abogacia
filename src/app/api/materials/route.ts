import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_MATERIALS = 30;
const MAX_CONTENT_LENGTH = 100_000;
const MIN_CONTENT_LENGTH = 80;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const materials = await prisma.material.findMany({
    where: { userId: session.user.id },
    select: { id: true, title: true, fileName: true, charCount: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ materials });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, fileName } = body;

  if (!title || typeof title !== "string" || title.trim().length < 2) {
    return NextResponse.json({ error: "El título es obligatorio (mínimo 2 caracteres)" }, { status: 400 });
  }

  if (!content || typeof content !== "string" || content.trim().length < MIN_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `El contenido debe tener al menos ${MIN_CONTENT_LENGTH} caracteres` },
      { status: 400 },
    );
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `El contenido supera el límite de ${MAX_CONTENT_LENGTH.toLocaleString()} caracteres` },
      { status: 400 },
    );
  }

  const count = await prisma.material.count({ where: { userId: session.user.id } });
  if (count >= MAX_MATERIALS) {
    return NextResponse.json(
      { error: `Máximo ${MAX_MATERIALS} apuntes guardados. Eliminá alguno antes de agregar otro.` },
      { status: 400 },
    );
  }

  const material = await prisma.material.create({
    data: {
      userId: session.user.id,
      title: title.trim(),
      content: content.trim(),
      fileName: fileName || null,
      charCount: content.trim().length,
    },
  });

  return NextResponse.json({
    id: material.id,
    title: material.title,
    fileName: material.fileName,
    charCount: material.charCount,
    createdAt: material.createdAt,
  });
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

  const material = await prisma.material.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!material) {
    return NextResponse.json({ error: "Apunte no encontrado" }, { status: 404 });
  }

  await prisma.material.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
