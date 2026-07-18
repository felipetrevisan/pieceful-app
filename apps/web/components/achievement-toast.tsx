"use client";

import { useEffect } from "react";
import type { Achievement } from "@/lib/achievements";
import { useI18n } from "@/lib/i18n";

interface Props {
  achievement: Achievement;
  platform: "playstation" | "xbox" | "keyboard";
  onDone: () => void;
}

export function AchievementToast({ achievement, platform, onDone }: Props) {
  const { t } = useI18n();
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
        <small>
          {t("CONQUISTA DESBLOQUEADA", "ACHIEVEMENT UNLOCKED")} · +{achievement.points}
        </small>
        <strong>{achievement.title}</strong>
        <em>{achievement.description}</em>
      </span>
    </output>
  );
}
