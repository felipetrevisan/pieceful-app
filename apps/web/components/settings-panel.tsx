"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  applyPreferences,
  defaultPreferences,
  PREFERENCES_KEY,
  type Preferences,
  readPreferences,
  type ThemeId,
} from "@/lib/preferences";

const themes: { id: ThemeId; icon: string; name: string; description: [string, string] }[] = [
  {
    id: "classic",
    icon: "✦",
    name: "Cosmic Night",
    description: ["O visual original do Pieceful", "The original Pieceful look"],
  },
  {
    id: "candy",
    icon: "🍭",
    name: "Candy Pop",
    description: ["Interface clara e arredondada", "Bright and rounded interface"],
  },
  {
    id: "jungle",
    icon: "🦖",
    name: "Jungle Party",
    description: ["Folhagem, madeira e aventura tropical", "Foliage, wood and tropical adventure"],
  },
  {
    id: "rainbow",
    icon: "🌈",
    name: "Rainbow Sky",
    description: ["Céu, nuvens e cartões flutuantes", "Sky, clouds and floating cards"],
  },
  {
    id: "ocean",
    icon: "🐳",
    name: "Ocean Splash",
    description: [
      "Ondas, bolhas e aventura submarina",
      "Waves, bubbles and an underwater adventure",
    ],
  },
  {
    id: "arcade",
    icon: "👾",
    name: "Pixel Arcade",
    description: ["Pixels, neon e energia retrô", "Pixels, neon and retro energy"],
  },
  {
    id: "castle",
    icon: "🏰",
    name: "Magic Castle",
    description: ["Estrelas, ouro e fantasia encantada", "Stars, gold and enchanted fantasy"],
  },
  {
    id: "storybook",
    icon: "📖",
    name: "Storybook",
    description: ["Papel, tinta e livro de histórias", "Paper, ink and storybook charm"],
  },
  {
    id: "cyberpunk",
    icon: "🌆",
    name: "Cyberpunk City",
    description: [
      "Neon intenso, painéis angulares e cidade digital",
      "Intense neon, angular panels and a digital city",
    ],
  },
  {
    id: "hologram",
    icon: "◈",
    name: "Holographic UI",
    description: [
      "Vidro translúcido, scanners e luz holográfica",
      "Translucent glass, scanners and holographic light",
    ],
  },
  {
    id: "space",
    icon: "🛰️",
    name: "Space Station",
    description: [
      "Metal, estrelas e interface de nave espacial",
      "Metal, stars and a spaceship interface",
    ],
  },
];

export function SettingsPanel() {
  const { language, t } = useI18n();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const stored = readPreferences(localStorage);
    setPreferences(stored);
    applyPreferences(stored);
  }, []);
  function update(next: Preferences) {
    setPreferences(next);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    applyPreferences(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }
  return (
    <div className="settings-page-grid">
      <section className="glass-card language-settings">
        <h2>{t("Idioma", "Language")}</h2>
        <p>
          {t(
            "Escolha o idioma usado em toda a interface.",
            "Choose the language used throughout the interface.",
          )}
        </p>
        <div className="language-options" role="radiogroup" aria-label={t("Idioma", "Language")}>
          <button
            type="button"
            className={preferences.language === "pt-BR" ? "selected" : ""}
            aria-pressed={preferences.language === "pt-BR"}
            onClick={() => update({ ...preferences, language: "pt-BR" })}
          >
            <span>🇧🇷</span>
            <strong>Português</strong>
            <small>Brasil</small>
          </button>
          <button
            type="button"
            className={preferences.language === "en" ? "selected" : ""}
            aria-pressed={preferences.language === "en"}
            onClick={() => update({ ...preferences, language: "en" })}
          >
            <span>🇺🇸</span>
            <strong>English</strong>
            <small>United States</small>
          </button>
        </div>
      </section>
      <section className="glass-card theme-settings">
        <h2>{t("Temas", "Themes")}</h2>
        <p>
          {t(
            "Escolha o clima do jogo. Os temas infantis têm cores vivas e movimento suave.",
            "Choose the game's mood. Kids' themes feature bright colors and gentle motion.",
          )}
        </p>
        <div className="theme-grid">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`theme-option theme-preview-${theme.id} ${preferences.theme === theme.id ? "selected" : ""}`}
              aria-pressed={preferences.theme === theme.id}
              onClick={() => update({ ...preferences, theme: theme.id })}
            >
              <span className="theme-preview" aria-hidden="true">
                <strong>{theme.icon}</strong>
                <i />
                <i />
                <i />
              </span>
              <span>
                <strong>{theme.name}</strong>
                <small>{language === "en" ? theme.description[1] : theme.description[0]}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="glass-card">
        <h2>{t("Som e ambiente", "Sound and ambience")}</h2>
        <p>
          {t(
            "O áudio só começa depois da sua primeira interação.",
            "Audio starts only after your first interaction.",
          )}
        </p>
        <label className="setting-row">
          <span>
            <strong>{t("Efeitos sonoros", "Sound effects")}</strong>
            <small>{t("Encaixes, grupos e conquistas", "Snaps, groups and achievements")}</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.sound}
            onChange={(event) => update({ ...preferences, sound: event.target.checked })}
          />
        </label>
        <label className="setting-row">
          <span>
            <strong>{t("Música ambiente", "Background music")}</strong>
            <small>{t("Trilha suave durante a montagem", "Gentle music while you assemble")}</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.music}
            onChange={(event) => update({ ...preferences, music: event.target.checked })}
          />
        </label>
      </section>
      <section className="glass-card">
        <h2>{t("Acessibilidade", "Accessibility")}</h2>
        <p>
          {t(
            "Ajustes aplicados à interface e às animações.",
            "Settings applied to the interface and animations.",
          )}
        </p>
        <label className="setting-row">
          <span>
            <strong>{t("Alto contraste", "High contrast")}</strong>
            <small>
              {t("Realça bordas e estados de foco", "Emphasizes borders and focus states")}
            </small>
          </span>
          <input
            type="checkbox"
            checked={preferences.highContrast}
            onChange={(event) => update({ ...preferences, highContrast: event.target.checked })}
          />
        </label>
        <label className="setting-row">
          <span>
            <strong>{t("Movimento reduzido", "Reduced motion")}</strong>
            <small>
              {t("Encurta animações cinematográficas", "Shortens cinematic animations")}
            </small>
          </span>
          <input
            type="checkbox"
            checked={preferences.reducedMotion}
            onChange={(event) => update({ ...preferences, reducedMotion: event.target.checked })}
          />
        </label>
      </section>
      <section className="glass-card">
        <h2>{t("Montagem", "Assembly")}</h2>
        <p>
          {t(
            "Defina quão perto uma peça precisa estar para encaixar.",
            "Set how close a piece must be before it snaps into place.",
          )}
        </p>
        <label className="range-setting">
          {t("Força do encaixe", "Snap strength")} <strong>{preferences.snapStrength}%</strong>
          <input
            type="range"
            min="20"
            max="60"
            value={preferences.snapStrength}
            onChange={(event) =>
              update({ ...preferences, snapStrength: Number(event.target.value) })
            }
          />
        </label>
      </section>
      {saved && <output className="toast">{t("Preferências salvas", "Preferences saved")}</output>}
    </div>
  );
}
