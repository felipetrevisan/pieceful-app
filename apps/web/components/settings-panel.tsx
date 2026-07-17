"use client";

import { useEffect, useState } from "react";
import {
  applyPreferences,
  defaultPreferences,
  PREFERENCES_KEY,
  type Preferences,
  readPreferences,
  type ThemeId,
} from "@/lib/preferences";

const themes: { id: ThemeId; icon: string; name: string; description: string }[] = [
  { id: "classic", icon: "✦", name: "Cosmic Night", description: "O visual original do Pieceful" },
  { id: "candy", icon: "🍭", name: "Candy Pop", description: "Rosa, lilás e confeitos brilhantes" },
  {
    id: "jungle",
    icon: "🦖",
    name: "Jungle Party",
    description: "Verde, laranja e aventura tropical",
  },
  { id: "rainbow", icon: "🌈", name: "Rainbow Sky", description: "Um céu alegre cheio de cores" },
];

export function SettingsPanel() {
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
      <section className="glass-card theme-settings">
        <h2>Temas</h2>
        <p>Escolha o clima do jogo. Os temas infantis têm cores vivas e movimento suave.</p>
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
                <small>{theme.description}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="glass-card">
        <h2>Som e ambiente</h2>
        <p>O áudio só começa depois da sua primeira interação.</p>
        <label className="setting-row">
          <span>
            <strong>Efeitos sonoros</strong>
            <small>Encaixes, grupos e conquistas</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.sound}
            onChange={(event) => update({ ...preferences, sound: event.target.checked })}
          />
        </label>
        <label className="setting-row">
          <span>
            <strong>Música ambiente</strong>
            <small>Trilha suave durante a montagem</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.music}
            onChange={(event) => update({ ...preferences, music: event.target.checked })}
          />
        </label>
      </section>
      <section className="glass-card">
        <h2>Acessibilidade</h2>
        <p>Ajustes aplicados à interface e às animações.</p>
        <label className="setting-row">
          <span>
            <strong>Alto contraste</strong>
            <small>Realça bordas e estados de foco</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.highContrast}
            onChange={(event) => update({ ...preferences, highContrast: event.target.checked })}
          />
        </label>
        <label className="setting-row">
          <span>
            <strong>Movimento reduzido</strong>
            <small>Encurta animações cinematográficas</small>
          </span>
          <input
            type="checkbox"
            checked={preferences.reducedMotion}
            onChange={(event) => update({ ...preferences, reducedMotion: event.target.checked })}
          />
        </label>
      </section>
      <section className="glass-card">
        <h2>Montagem</h2>
        <p>Defina quão perto uma peça precisa estar para encaixar.</p>
        <label className="range-setting">
          Força do encaixe <strong>{preferences.snapStrength}%</strong>
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
      {saved && <output className="toast">Preferências salvas</output>}
    </div>
  );
}
