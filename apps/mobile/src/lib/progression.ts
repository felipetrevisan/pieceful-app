import type { AgeGroup, MobilePuzzle, MobileTheme } from "@/state/app-provider";

export const MAX_PLAYER_LEVEL = 100;
export type LevelRewardKind = "hints" | "theme" | "avatar" | "frame" | "pack" | "title";

export interface LevelReward {
  id: string; level: number; kind: LevelRewardKind; amount?: number; contentKey?: string;
  icon: string; titlePt: string; titleEn: string; descriptionPt: string; descriptionEn: string;
}

export interface PlayerProgression {
  totalXp: number; level: number; levelStartXp: number; nextLevelXp: number;
  xpIntoLevel: number; xpForNextLevel: number; progressPercent: number;
  completedPuzzles: number; placedPieces: number;
}

const childThemes: MobileTheme[] = ["rainbow", "storybook", "arcade", "castle", "jungle"];
const standardThemes: MobileTheme[] = ["ocean", "cyberpunk", "hologram", "space", "cosmic"];
const childAvatars = ["happy", "rocket", "paw", "planet", "star", "trophy"];
const adultFrames = ["neon", "aurora", "carbon", "galaxy", "platinum", "legend"];

export function xpToReachLevel(level: number) {
  const bounded = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(level)));
  const steps = bounded - 1;
  return steps * 500 + (steps * (steps - 1) * 25) / 2;
}

export function getPuzzleXp(puzzle: MobilePuzzle) {
  const placed = puzzle.session.pieces.filter((piece) => piece.isPlaced).length;
  if (!puzzle.session.completedAt) return placed;
  const difficultyBonus = Math.min(250, Math.max(0, puzzle.configuration.totalPieces - 48) / 4);
  const rotationBonus = puzzle.configuration.rotationEnabled ? 100 : 0;
  const noHintsBonus = puzzle.configuration.hintsEnabled && puzzle.session.hintsUsed === 0 ? 100 : 0;
  return Math.round(placed + 500 + difficultyBonus + rotationBonus + noHintsBonus);
}

export function getPlayerProgression(puzzles: MobilePuzzle[]): PlayerProgression {
  const totalXp = puzzles.reduce((sum, puzzle) => sum + getPuzzleXp(puzzle), 0);
  return getProgressionFromXp(totalXp, puzzles);
}

export function getProgressionFromXp(totalXp: number, puzzles: MobilePuzzle[] = []): PlayerProgression {
  let level = 1;
  while (level < MAX_PLAYER_LEVEL && totalXp >= xpToReachLevel(level + 1)) level += 1;
  const levelStartXp = xpToReachLevel(level);
  const nextLevelXp = level === MAX_PLAYER_LEVEL ? levelStartXp : xpToReachLevel(level + 1);
  const xpForNextLevel = Math.max(1, nextLevelXp - levelStartXp);
  const xpIntoLevel = level === MAX_PLAYER_LEVEL ? xpForNextLevel : totalXp - levelStartXp;
  return {
    totalXp, level, levelStartXp, nextLevelXp, xpIntoLevel, xpForNextLevel,
    progressPercent: level === MAX_PLAYER_LEVEL ? 100 : (xpIntoLevel / xpForNextLevel) * 100,
    completedPuzzles: puzzles.filter((puzzle) => puzzle.session.completedAt).length,
    placedPieces: puzzles.reduce((sum, puzzle) => sum + puzzle.session.pieces.filter((piece) => piece.isPlaced).length, 0),
  };
}

function rewardForLevel(level: number, childMode: boolean): LevelReward {
  const audience = childMode ? "child" : "standard";
  const base = { id: `${audience}-level-${level}`, level };
  if (level === MAX_PLAYER_LEVEL) return {
    ...base, kind: "title", contentKey: childMode ? "rainbow-legend" : "pieceful-legend", icon: "diamond-outline",
    titlePt: childMode ? "Lenda do arco-íris" : "Lenda Pieceful", titleEn: childMode ? "Rainbow Legend" : "Pieceful Legend",
    descriptionPt: "Título e moldura lendários exclusivos do nível 100.", descriptionEn: "An exclusive legendary title and frame for reaching level 100.",
  };
  if (level % 10 === 0) return {
    ...base, kind: "pack", contentKey: `${audience}-level-pack-${level}`, icon: "images-outline",
    titlePt: childMode ? "Pacote surpresa colorido" : "Pacote premium de imagens", titleEn: childMode ? "Colorful surprise pack" : "Premium image pack",
    descriptionPt: "Um pacote especial reservado para este marco de nível.", descriptionEn: "A special image pack reserved for this level milestone.",
  };
  if (level % 5 === 0) {
    const index = Math.floor(level / 5 - 1);
    return {
      ...base, kind: childMode ? "avatar" : "frame", contentKey: childMode ? childAvatars[index % childAvatars.length] : adultFrames[index % adultFrames.length],
      icon: childMode ? "happy-outline" : "albums-outline", titlePt: childMode ? "Novo avatar" : "Nova moldura de perfil", titleEn: childMode ? "New avatar" : "New profile frame",
      descriptionPt: childMode ? "Um avatar divertido para personalizar seu perfil." : "Uma moldura cosmética para destacar seu cartão de perfil.",
      descriptionEn: childMode ? "A fun avatar to personalize your profile." : "A cosmetic frame to highlight your profile card.",
    };
  }
  if (level % 3 === 0) {
    const themes = childMode ? childThemes : standardThemes;
    return {
      ...base, kind: "theme", contentKey: themes[(Math.floor(level / 3) - 1) % themes.length], icon: "color-palette-outline",
      titlePt: "Tema bônus", titleEn: "Bonus theme", descriptionPt: "Uma nova aparência para deixar o Pieceful com a sua cara.", descriptionEn: "A new look to make Pieceful feel like your own.",
    };
  }
  const amount = level % 4 === 0 ? 3 : 2;
  return {
    ...base, kind: "hints", amount, icon: "bulb-outline", titlePt: `${amount} dicas grátis`, titleEn: `${amount} free hints`,
    descriptionPt: "Use durante a montagem sem precisar assistir a um anúncio.", descriptionEn: "Use them while playing without watching a rewarded ad.",
  };
}

export function getLevelRewards(ageGroup: AgeGroup | null) {
  return Array.from({ length: MAX_PLAYER_LEVEL - 1 }, (_, index) => rewardForLevel(index + 2, ageGroup === "child"));
}

export function getNextLevelReward(ageGroup: AgeGroup | null, level: number) {
  return getLevelRewards(ageGroup).find((reward) => reward.level > level) ?? null;
}
