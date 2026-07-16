export type AchievementRarity = "bronze" | "silver" | "gold" | "platinum";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  rarity: AchievementRarity;
  points: number;
}

export interface AchievementProgress {
  placedPieces: number;
  totalPieces: number;
  hintsUsed: number;
  elapsedTime: number;
  completed: boolean;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

const STORAGE_KEY = "pieceful-achievements";

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-fit",
    title: "Primeiro encaixe",
    description: "Encaixe sua primeira peça corretamente.",
    rarity: "bronze",
    points: 10,
  },
  {
    id: "momentum",
    title: "Pegando o ritmo",
    description: "Encaixe 10 peças no mesmo quebra-cabeça.",
    rarity: "bronze",
    points: 15,
  },
  {
    id: "halfway-there",
    title: "Metade da memória",
    description: "Complete 50% de um quebra-cabeça.",
    rarity: "silver",
    points: 25,
  },
  {
    id: "pure-instinct",
    title: "Instinto puro",
    description: "Complete um quebra-cabeça sem usar dicas.",
    rarity: "gold",
    points: 50,
  },
  {
    id: "against-the-clock",
    title: "Contra o relógio",
    description: "Complete um quebra-cabeça em menos de 10 minutos.",
    rarity: "silver",
    points: 35,
  },
  {
    id: "century",
    title: "Clube das 100",
    description: "Complete um quebra-cabeça com pelo menos 100 peças.",
    rarity: "silver",
    points: 40,
  },
  {
    id: "puzzle-master",
    title: "Mestre dos quebra-cabeças",
    description: "Complete um quebra-cabeça com pelo menos 500 peças.",
    rarity: "gold",
    points: 75,
  },
  {
    id: "pieceful-legend",
    title: "Lenda Pieceful",
    description: "Complete o desafio máximo de 1.000 peças.",
    rarity: "platinum",
    points: 100,
  },
];

export function eligibleAchievements(
  progress: AchievementProgress,
  unlockedIds: ReadonlySet<string>,
): Achievement[] {
  const percentage = Math.round((progress.placedPieces / progress.totalPieces) * 100);
  const rules: Record<string, boolean> = {
    "first-fit": progress.placedPieces >= 1,
    momentum: progress.placedPieces >= 10,
    "halfway-there": percentage >= 50,
    "pure-instinct": progress.completed && progress.hintsUsed === 0,
    "against-the-clock": progress.completed && progress.elapsedTime <= 600,
    century: progress.completed && progress.totalPieces >= 100,
    "puzzle-master": progress.completed && progress.totalPieces >= 500,
    "pieceful-legend": progress.completed && progress.totalPieces >= 1000,
  };
  return ACHIEVEMENTS.filter(
    (achievement) => rules[achievement.id] && !unlockedIds.has(achievement.id),
  );
}

export function readUnlockedAchievements(): UnlockedAchievement[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? (value as UnlockedAchievement[]) : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function unlockAchievements(progress: AchievementProgress): Achievement[] {
  const unlocked = readUnlockedAchievements();
  const newAchievements = eligibleAchievements(progress, new Set(unlocked.map(({ id }) => id)));
  if (newAchievements.length === 0) return [];
  const unlockedAt = new Date().toISOString();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...unlocked, ...newAchievements.map(({ id }) => ({ id, unlockedAt }))]),
  );
  window.dispatchEvent(new Event("pieceful:achievements-changed"));
  return newAchievements;
}
