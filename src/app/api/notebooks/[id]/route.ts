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

  try {
    const notebook = await prisma.notebook.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        materials: {
          select: { id: true, title: true, content: true, fileName: true, charCount: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!notebook) {
      return NextResponse.json({ error: "Cuaderno no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ notebook });
  } catch (error) {
    console.error("Error al obtener cuaderno:", error);
    return NextResponse.json({ error: "Error al obtener cuaderno" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const notebook = await prisma.notebook.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!notebook) {
      return NextResponse.json({ error: "Cuaderno no encontrado" }, { status: 404 });
    }

    const { name, color } = await request.json();
    const data: Record<string, unknown> = {};
    if (name && typeof name === "string" && name.trim().length >= 2) {
      data.name = name.trim();
    }
    if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) {
      data.color = color;
    }

    const updated = await prisma.notebook.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ notebook: updated });
  } catch (error) {
    console.error("Error al actualizar cuaderno:", error);
    return NextResponse.json({ error: "Error al actualizar cuaderno" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const notebook = await prisma.notebook.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!notebook) {
      return NextResponse.json({ error: "Cuaderno no encontrado" }, { status: 404 });
    }

    await prisma.material.updateMany({
      where: { notebookId: params.id },
      data: { notebookId: null },
    });

    await prisma.notebook.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar cuaderno:", error);
    return NextResponse.json({ error: "Error al eliminar cuaderno" }, { status: 500 });
  }
}
