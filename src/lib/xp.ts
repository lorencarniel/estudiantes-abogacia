import { prisma } from "./prisma";

export const XP_ACTIONS: Record<string, number> = {
  summary: 30,
  outline: 30,
  quiz_complete: 50,
  quiz_pass: 25,
  flashcard_deck: 30,
  game_complete: 40,
  game_perfect: 30,
  schedule: 20,
  audio: 25,
  video: 25,
  practical_case: 50,
  oral_exam: 60,
  mnemonic: 20,
  glossary: 20,
  concept_map: 30,
  comparison: 25,
  highlight: 25,
};

const LEVELS = [
  { level: 1, xp: 0, name: "Aspirante" },
  { level: 2, xp: 100, name: "Estudiante" },
  { level: 3, xp: 300, name: "Aplicado" },
  { level: 4, xp: 600, name: "Avanzado" },
  { level: 5, xp: 1000, name: "Destacado" },
  { level: 6, xp: 1500, name: "Experto" },
  { level: 7, xp: 2200, name: "Erudito" },
  { level: 8, xp: 3000, name: "Maestro" },
  { level: 9, xp: 4000, name: "Doctor" },
  { level: 10, xp: 5500, name: "Juez Supremo" },
];

export function getLevelInfo(totalXP: number) {
  let current = LEVELS[0];
  let next = LEVELS[1];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || null;
      break;
    }
  }

  const xpInLevel = totalXP - current.xp;
  const xpForNext = next ? next.xp - current.xp : 0;
  const progress = next ? Math.min((xpInLevel / xpForNext) * 100, 100) : 100;

  return {
    level: current.level,
    name: current.name,
    totalXP,
    xpInLevel,
    xpForNext,
    progress,
    nextLevelName: next?.name || null,
  };
}

export async function addXP(userId: string, action: string): Promise<void> {
  const amount = XP_ACTIONS[action];
  if (!amount) return;

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "America/Buenos_Aires" });

  const existing = await prisma.userXP.findUnique({ where: { userId } });

  if (existing) {
    const lastStr = existing.lastActivityDate.toLocaleDateString("en-CA", { timeZone: "America/Buenos_Aires" });
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Buenos_Aires" });

    let newStreak = existing.streak;
    if (lastStr !== todayStr) {
      newStreak = lastStr === yesterdayStr ? existing.streak + 1 : 1;
    }

    const newTotal = existing.totalXP + amount;
    const levelInfo = getLevelInfo(newTotal);

    await prisma.userXP.update({
      where: { userId },
      data: {
        totalXP: newTotal,
        level: levelInfo.level,
        streak: newStreak,
        lastActivityDate: now,
      },
    });
  } else {
    const levelInfo = getLevelInfo(amount);
    await prisma.userXP.create({
      data: {
        userId,
        totalXP: amount,
        level: levelInfo.level,
        streak: 1,
        lastActivityDate: now,
      },
    });
  }
}
