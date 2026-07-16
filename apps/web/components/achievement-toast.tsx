"use client";

import { useEffect } from "react";
import type { Achievement } from "@/lib/achievements";

interface Props {
  achievement: Achievement;
  platform: "playstation" | "xbox" | "keyboard";
  onDone: () => void;
}

export function AchievementToast({ achievement, platform, onDone }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 5200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <output className={`achievement-toast ${platform}`} aria-live="polite">
      <span className={`achievement-trophy ${achievement.rarity}`} aria-hidden="true">
        ◆
      </span>
      <span>
        <small>CONQUISTA DESBLOQUEADA · +{achievement.points}</small>
        <strong>{achievement.title}</strong>
        <em>{achievement.description}</em>
      </span>
    </output>
  );
}
