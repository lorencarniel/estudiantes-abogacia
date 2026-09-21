import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_NOTEBOOKS = 20;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const notebooks = await prisma.notebook.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { materials: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      notebooks: notebooks.map((n) => ({
        id: n.id,
        name: n.name,
        color: n.color,
        materialCount: n._count.materials,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Error al obtener cuadernos:", error);
    return NextResponse.json({ error: "Error al obtener cuadernos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { name, color } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "El nombre es obligatorio (mínimo 2 caracteres)" }, { status: 400 });
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: "El nombre no puede superar los 100 caracteres" }, { status: 400 });
    }

    const count = await prisma.notebook.count({ where: { userId: session.user.id } });
    if (count >= MAX_NOTEBOOKS) {
      return NextResponse.json(
        { error: `Máximo ${MAX_NOTEBOOKS} cuadernos. Eliminá alguno antes de crear otro.` },
        { status: 400 },
      );
    }

    const notebook = await prisma.notebook.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        color: typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#3B82F6",
      },
    });

    return NextResponse.json({ notebook });
  } catch (error) {
    console.error("Error al crear cuaderno:", error);
    return NextResponse.json({ error: "Error al crear cuaderno" }, { status: 500 });
  }
}
