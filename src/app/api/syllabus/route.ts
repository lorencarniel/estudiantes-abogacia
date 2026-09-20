import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_SYLLABUS_LENGTH = 10_000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
  const syllabi = await prisma.syllabus.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, fileName: true, createdAt: true },
  });

  return NextResponse.json({ syllabi });
  } catch (error) {
    console.error("Error al obtener programas:", error);
    return NextResponse.json({ error: "Error al obtener programas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
  const body = await request.json();
  const { title, content, fileName } = body;

  if (!title || !content) {
    return NextResponse.json(
      { error: "Título y contenido son requeridos" },
      { status: 400 }
    );
  }

  if (content.length < 50) {
    return NextResponse.json(
      { error: "El programa debe tener al menos 50 caracteres" },
      { status: 400 }
    );
  }

  const trimmed = content.length > MAX_SYLLABUS_LENGTH
    ? content.substring(0, MAX_SYLLABUS_LENGTH)
    : content;

  const count = await prisma.syllabus.count({
    where: { userId: session.user.id },
  });

  if (count >= 20) {
    return NextResponse.json(
      { error: "Máximo 20 programas guardados. Eliminá alguno para agregar otro." },
      { status: 400 }
    );
  }

  const syllabus = await prisma.syllabus.create({
    data: {
      userId: session.user.id,
      title,
      content: trimmed,
      fileName: fileName || null,
    },
  });

  return NextResponse.json({
    id: syllabus.id,
    title: syllabus.title,
    fileName: syllabus.fileName,
    createdAt: syllabus.createdAt,
    truncated: content.length > MAX_SYLLABUS_LENGTH,
  });
  } catch (error) {
    console.error("Error al guardar programa:", error);
    return NextResponse.json({ error: "Error al guardar programa" }, { status: 500 });
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

  const syllabus = await prisma.syllabus.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!syllabus) {
    return NextResponse.json({ error: "Programa no encontrado" }, { status: 404 });
  }

  await prisma.syllabus.delete({ where: { id } });
  return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar programa:", error);
    return NextResponse.json({ error: "Error al eliminar programa" }, { status: 500 });
  }
}
