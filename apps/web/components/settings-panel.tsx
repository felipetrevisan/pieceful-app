"use client";

import { useEffect, useState } from "react";

interface Preferences {
  sound: boolean;
  music: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  snapStrength: number;
}
const defaults: Preferences = {
  sound: true,
  music: false,
  highContrast: false,
  reducedMotion: false,
  snapStrength: 38,
};

export function SettingsPanel() {
  const [preferences, setPreferences] = useState(defaults);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("puzzled-preferences");
    if (stored) {
      try {
        setPreferences({ ...defaults, ...(JSON.parse(stored) as Partial<Preferences>) });
      } catch {
        localStorage.removeItem("puzzled-preferences");
      }
    }
  }, []);
  function update(next: Preferences) {
    setPreferences(next);
    localStorage.setItem("puzzled-preferences", JSON.stringify(next));
    document.documentElement.classList.toggle("high-contrast", next.highContrast);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }
  return (
    <div className="settings-page-grid">
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
