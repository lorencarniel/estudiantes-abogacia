import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

const profileSchema = z.object({
  university: z.string().max(200).optional(),
  careerYear: z.number().int().min(1).max(6).nullable().optional(),
  subjects: z.array(z.string().max(100)).max(20).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (profile) {
    return NextResponse.json({
      profile: {
        ...profile,
        subjects: safeJsonParse(profile.subjects, []),
      },
    });
  }

  return NextResponse.json({ profile: null });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
  const body = await request.json();
  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const data = {
    university: parsed.data.university,
    careerYear: parsed.data.careerYear,
    subjects: parsed.data.subjects ? JSON.stringify(parsed.data.subjects) : undefined,
  };

  const profile = await prisma.profile.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  return NextResponse.json({
    profile: {
      ...profile,
      subjects: safeJsonParse(profile.subjects, []),
    },
  });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}
