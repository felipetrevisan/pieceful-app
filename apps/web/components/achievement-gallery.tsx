"use client";

import { useEffect, useMemo, useState } from "react";
import { ACHIEVEMENTS, readUnlockedAchievements } from "@/lib/achievements";

export function AchievementGallery() {
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
          <strong>{unlockedIds.size}</strong> de {ACHIEVEMENTS.length} desbloqueadas
        </span>
        <span>
          <strong>{score}</strong> pontos
        </span>
      </div>
      <div className="achievement-grid">
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = unlockedIds.has(achievement.id);
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
                  {achievement.rarity} · {achievement.points} pontos
                </small>
                <h2>{unlocked ? achievement.title : "Conquista secreta"}</h2>
                <p>{achievement.description}</p>
              </div>
              <span className="achievement-state">{unlocked ? "Desbloqueada" : "Bloqueada"}</span>
            </article>
          );
        })}
      </div>
    </>
  );
}
