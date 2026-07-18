"use client";

import { useEffect, useMemo, useState } from "react";
import { ACHIEVEMENTS, readUnlockedAchievements } from "@/lib/achievements";
import { useI18n } from "@/lib/i18n";

const englishAchievements: Record<string, { title: string; description: string }> = {
  "first-fit": { title: "First fit", description: "Fit your first piece correctly." },
  momentum: { title: "Finding your rhythm", description: "Fit 10 pieces in the same puzzle." },
  "halfway-there": { title: "Half the memory", description: "Complete 50% of a puzzle." },
  "pure-instinct": {
    title: "Pure instinct",
    description: "Complete a puzzle without using hints.",
  },
  "against-the-clock": {
    title: "Against the clock",
    description: "Complete a puzzle in under 10 minutes.",
  },
  century: { title: "The 100 club", description: "Complete a puzzle with at least 100 pieces." },
  "puzzle-master": {
    title: "Puzzle master",
    description: "Complete a puzzle with at least 500 pieces.",
  },
  "pieceful-legend": {
    title: "Pieceful legend",
    description: "Complete the ultimate 1,000-piece challenge.",
  },
};

export function AchievementGallery() {
  const { language, t } = useI18n();
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const refresh = () => setUnlockedIds(new Set(readUnlockedAchievements().map(({ id }) => id)));
    refresh();
    window.addEventListener("pieceful:achievements-changed", refresh);
    return () => window.removeEventListener("pieceful:achievements-changed", refresh);
  }, []);
  const score = useMemo(
    () =>
      ACHIEVEMENTS.filter(({ id }) => unlockedIds.has(id)).reduce(
        (sum, item) => sum + item.points,
        0,
      ),
    [unlockedIds],
  );

  return (
    <>
      <div className="achievement-summary glass-card">
        <span>
          <strong>{unlockedIds.size}</strong> {t("de", "of")} {ACHIEVEMENTS.length}{" "}
          {t("desbloqueadas", "unlocked")}
        </span>
        <span>
          <strong>{score}</strong> {t("pontos", "points")}
        </span>
      </div>
      <div className="achievement-grid">
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = unlockedIds.has(achievement.id);
          const copy = language === "en" ? englishAchievements[achievement.id] : undefined;
          return (
            <article
              key={achievement.id}
              className={`achievement-card glass-card ${unlocked ? "unlocked" : "locked"}`}
            >
              <span className={`achievement-medal ${achievement.rarity}`} aria-hidden="true">
                ◆
              </span>
              <div>
                <small>
                  {achievement.rarity} · {achievement.points} {t("pontos", "points")}
                </small>
                <h2>
                  {unlocked
                    ? (copy?.title ?? achievement.title)
                    : t("Conquista secreta", "Secret achievement")}
                </h2>
                <p>{copy?.description ?? achievement.description}</p>
              </div>
              <span className="achievement-state">
                {unlocked ? t("Desbloqueada", "Unlocked") : t("Bloqueada", "Locked")}
              </span>
            </article>
          );
        })}
      </div>
    </>
  );
}
