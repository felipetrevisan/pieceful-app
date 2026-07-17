"use client";

import {
  calculateProgress,
  type PuzzlePiece,
  type PuzzleSession,
  type PuzzleTimelapsePiece,
} from "@puzzled/puzzle-engine";
import type { PuzzleConfiguration, PuzzleDifficulty } from "@puzzled/shared";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { type Achievement, unlockAchievements } from "@/lib/achievements";
import { savePuzzle } from "@/lib/puzzle-db";
import type { PhotoCredit } from "@/lib/unsplash";
import { AchievementToast } from "./achievement-toast";
import { CompletionModal } from "./completion-modal";
import { Icon } from "./icons";
import { PuzzleBoard } from "./puzzle-board";

interface Props {
  name: string;
  image: Blob;
  imageUrl: string;
  difficulty: PuzzleDifficulty;
  configuration: PuzzleConfiguration;
  photoCredit?: PhotoCredit | null | undefined;
  initialSession: PuzzleSession;
}

const regions = [
  "superior-esquerda",
  "superior-central",
  "superior-direita",
  "centro-esquerdo",
  "centro",
  "centro-direito",
  "inferior-esquerda",
  "inferior-central",
  "inferior-direita",
];

function framePiece(piece: PuzzlePiece): PuzzleTimelapsePiece {
  return {
    id: piece.id,
    x: piece.currentPosition.x,
    y: piece.currentPosition.y,
    rotation: piece.currentPosition.rotation,
    isPlaced: piece.isPlaced,
    visible: piece.trayId === null,
  };
}

function changedPiece(before: PuzzlePiece, after: PuzzlePiece): boolean {
  return (
    before.currentPosition.x !== after.currentPosition.x ||
    before.currentPosition.y !== after.currentPosition.y ||
    before.currentPosition.rotation !== after.currentPosition.rotation ||
    before.isPlaced !== after.isPlaced ||
    before.trayId !== after.trayId
  );
}

export function GameScreen({
  name,
  image,
  imageUrl,
  difficulty,
  configuration,
  photoCredit,
  initialSession,
}: Props) {
  const [session, setSession] = useState(initialSession);
  const [paused, setPaused] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [controllerName, setControllerName] = useState<string | null>(null);
  const [tray, setTray] = useState<"todas" | "bordas" | "centro" | "grupos">("todas");
  const pauseTitleId = useId();
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">("saved");
  const [activeRegion, setActiveRegion] = useState("centro");
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const saveTimer = useRef<number | null>(null);
  const placedPieces = session.pieces.filter((piece) => piece.isPlaced).length;
  const progress = calculateProgress(placedPieces, session.pieces.length);
  const completed = progress === 100;
  const pauseGame = useCallback(() => setPaused(true), []);
  const sound = useCallback((frequency: number) => {
    try {
      const AudioContextClass = window.AudioContext;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.05, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.16);
    } catch {
      /* O áudio nunca bloqueia a partida. */
    }
  }, []);
  const dismissAchievement = useCallback(
    () => setAchievementQueue((current) => current.slice(1)),
    [],
  );

  useEffect(() => {
    const unlocked = unlockAchievements({
      placedPieces,
      totalPieces: session.pieces.length,
      hintsUsed: session.hintsUsed,
      elapsedTime: session.elapsedTime,
      completed,
    });
    if (unlocked.length > 0) {
      setAchievementQueue((current) => [...current, ...unlocked]);
      sound(880);
      window.setTimeout(() => sound(1174), 120);
    }
  }, [
    completed,
    placedPieces,
    session.elapsedTime,
    session.hintsUsed,
    session.pieces.length,
    sound,
  ]);

  const persist = useCallback(
    async (next: PuzzleSession) => {
      setSaveStatus("saving");
      try {
        await savePuzzle({
          id: next.puzzleId,
          name,
          image,
          difficulty,
          configuration,
          photoCredit,
          session: next,
          updatedAt: new Date().toISOString(),
        });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [configuration, difficulty, image, name, photoCredit],
  );

  useEffect(() => {
    if (paused || completed || !configuration.timerEnabled) return;
    const timer = window.setInterval(
      () => setSession((current) => ({ ...current, elapsedTime: current.elapsedTime + 1 })),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [completed, configuration.timerEnabled, paused]);

  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => persist(session), 900);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [persist, session]);

  useEffect(() => {
    const saveOnHide = () => {
      if (document.visibilityState === "hidden") void persist(session);
    };
    document.addEventListener("visibilitychange", saveOnHide);
    return () => document.removeEventListener("visibilitychange", saveOnHide);
  }, [persist, session]);

  function updatePieces(pieces: PuzzlePiece[]) {
    setSession((current) => {
      const previous = new Map(current.pieces.map((piece) => [piece.id, piece]));
      const changes = pieces
        .filter((piece) => {
          const before = previous.get(piece.id);
          return !before || changedPiece(before, piece);
        })
        .map(framePiece);
      const timelapse = current.timelapse ?? {
        initial: current.pieces.map(framePiece),
        frames: [],
      };
      return {
        ...current,
        pieces,
        completedAt: pieces.every((piece) => piece.isPlaced) ? new Date().toISOString() : null,
        timelapse:
          changes.length > 0
            ? {
                ...timelapse,
                frames: [...timelapse.frames, { at: current.elapsedTime, changes }].slice(-1200),
              }
            : timelapse,
      };
    });
  }

  function useHint() {
    const candidate = session.pieces.find((piece) => !piece.isPlaced);
    if (!candidate) return;
    updatePieces(
      session.pieces.map((piece) =>
        piece.id === candidate.id
          ? {
              ...piece,
              isPlaced: true,
              trayId: null,
              groupId: "tabuleiro",
              currentPosition: { ...piece.correctPosition },
            }
          : piece,
      ),
    );
    setSession((current) => ({ ...current, hintsUsed: current.hintsUsed + 1 }));
    sound(660);
  }

  const trayPieces = useMemo(
    () =>
      session.pieces.filter((piece) => {
        if (piece.trayId === null || piece.isPlaced) return false;
        if (tray === "todas") return true;
        if (tray === "grupos") return piece.groupId !== null;
        return piece.trayId === tray;
      }),
    [session.pieces, tray],
  );

  function moveFromTray(id: string) {
    const index = session.pieces.findIndex((piece) => piece.id === id);
    const piece = session.pieces[index];
    if (!piece) return;
    const offset = (index % 12) / 12;
    updatePieces(
      session.pieces.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              trayId: null,
              currentPosition: {
                ...candidate.currentPosition,
                x: -1 + offset * (configuration.columns + 1),
                y: -0.8,
              },
            }
          : candidate,
      ),
    );
  }

  function replay() {
    setSession({
      ...initialSession,
      elapsedTime: 0,
      hintsUsed: 0,
      completedAt: null,
      timelapse: { initial: initialSession.pieces.map(framePiece), frames: [] },
    });
  }

  const time = new Date(session.elapsedTime * 1000).toISOString().slice(11, 19);
  return (
    <main className="game-shell">
      <header
        className="game-toolbar"
        style={{ "--game-progress": `${progress}%` } as CSSProperties}
      >
        <div>
          <a href="/" className="back-button" aria-label="Voltar ao início">
            ←
          </a>
          <span>
            <strong>{name}</strong>
            <small>Dificuldade: {difficulty}</small>
            {photoCredit && (
              <small className="game-photo-credit">
                Foto por{" "}
                <a href={photoCredit.photographerUrl} target="_blank" rel="noreferrer">
                  {photoCredit.photographer}
                </a>{" "}
                no{" "}
                <a href={photoCredit.unsplashUrl} target="_blank" rel="noreferrer">
                  Unsplash
                </a>
              </small>
            )}
          </span>
        </div>
        <div className="progress-cluster">
          <span>{progress}% concluído</span>
          <small>
            {placedPieces} de {session.pieces.length}
          </small>
        </div>
        <div className="timer">
          ◷ <strong>{time}</strong>
        </div>
        <div>
          <a
            href="/settings"
            className="icon-button"
            aria-label="Abrir configurações"
            title="Configurações"
          >
            <Icon name="settings" />
          </a>
          <button
            type="button"
            className="icon-button"
            onClick={() => setPaused(true)}
            aria-label="Pausar"
          >
            <Icon name="pause" />
          </button>
          <button type="button" className="icon-button" aria-label="Som">
            <Icon name="volume" />
          </button>
        </div>
      </header>
      <section className="game-area">
        <PuzzleBoard
          imageUrl={imageUrl}
          rows={configuration.rows}
          columns={configuration.columns}
          pieces={session.pieces}
          onPiecesChange={updatePieces}
          onProgress={(value) => {
            if (value > progress) sound(520);
          }}
          focusRegion={activeRegion}
          onPause={pauseGame}
          onControllerChange={setControllerName}
          rotationEnabled={configuration.rotationEnabled}
        />
        {configuration.totalPieces >= 500 && (
          <aside className="minimap glass-card">
            <div>
              <strong>Mapa do tabuleiro</strong>
              <span>{activeRegion.replaceAll("-", " ")}</span>
            </div>
            <div className="region-grid">
              {regions.map((region) => (
                <button
                  key={region}
                  type="button"
                  className={activeRegion === region ? "active" : ""}
                  onClick={() => {
                    setActiveRegion(region);
                    setSession((current) => ({ ...current, activeRegion: region }));
                  }}
                  aria-label={`Focar região ${region.replaceAll("-", " ")}`}
                />
              ))}
            </div>
          </aside>
        )}
      </section>
      <section className="game-dock">
        <div className="dock-tools">
          <button type="button">
            <Icon name="puzzle" />
            <span>
              Alternar
              <br />
              peças
            </span>
          </button>
          <button type="button" onClick={() => setControlsOpen(true)}>
            <span className="dock-device-icon" aria-hidden="true">
              ⌨
            </span>
            <span>
              Ver
              <br />
              controles
            </span>
          </button>
          <button type="button">
            <Icon name="grid" />
            <span>
              Organizar
              <br />
              bordas
            </span>
          </button>
          {configuration.referenceEnabled && (
            <button
              type="button"
              className="reference-tool"
              onClick={() => window.open(imageUrl, "referencia", "width=900,height=700")}
            >
              <Icon name="folder" />
              <span>
                Mostrar
                <br />
                referência
              </span>
            </button>
          )}
        </div>
        {configuration.hintsEnabled && (
          <button type="button" className="hint-button" onClick={useHint}>
            ♧ Dar uma dica
          </button>
        )}
        <div className="save-state" aria-live="polite">
          {saveStatus === "saving"
            ? "Salvando…"
            : saveStatus === "saved"
              ? "Progresso salvo"
              : "Não foi possível salvar"}
        </div>
      </section>
      {session.pieces.some((piece) => piece.trayId !== null && !piece.isPlaced) && (
        <aside className="piece-tray glass-card">
          <div className="tray-header">
            <div>
              <strong>Bandejas</strong>
              <span>{trayPieces.length} peças</span>
            </div>
            <div>
              {(["todas", "bordas", "centro", "grupos"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={tray === value ? "active" : ""}
                  onClick={() => setTray(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="virtual-list">
            {trayPieces.slice(0, 60).map((piece) => (
              <button type="button" key={piece.id} onClick={() => moveFromTray(piece.id)}>
                <span className="mini-piece">
                  {piece.row + 1}:{piece.column + 1}
                </span>
                <small>Levar ao tabuleiro</small>
              </button>
            ))}
          </div>
          {trayPieces.length > 60 && (
            <p>Mostrando 60 peças por vez para manter a partida fluida.</p>
          )}
        </aside>
      )}
      {paused && (
        <div className="modal-backdrop">
          <div
            className="pause-modal glass-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={pauseTitleId}
          >
            <span className="card-icon">
              <Icon name="pause" />
            </span>
            <h2 id={pauseTitleId}>Partida pausada</h2>
            <p>Seu progresso está seguro neste dispositivo.</p>
            <button type="button" className="primary-button" onClick={() => setPaused(false)}>
              Continuar montagem
            </button>
            <a href="/" className="secondary-button">
              Sair para o início
            </a>
          </div>
        </div>
      )}
      {controlsOpen && (
        <div className="modal-backdrop">
          <section
            className="controls-panel glass-card"
            role="dialog"
            aria-modal="true"
            aria-label="Controles do jogo"
          >
            <header>
              <div>
                <span className="section-kicker">COMO JOGAR</span>
                <h2>Controles</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setControlsOpen(false)}
                aria-label="Fechar controles"
              >
                ×
              </button>
            </header>
            <div className="controller-status" aria-live="polite">
              <span aria-hidden="true">🎮</span>
              {controllerName
                ? `${controllerName} conectado`
                : "Conecte um controle e pressione um botão"}
            </div>
            <div className="controls-grid">
              <ControlGroup
                icon="☝"
                title="Celular e tablet"
                rows={[
                  ["1 dedo", "Mover peça ou tabuleiro"],
                  ["2 dedos", "Zoom e navegação"],
                  ["Selecionar + ↻", "Rotacionar 90°"],
                ]}
              />
              <ControlGroup
                icon="⌨"
                title="Teclado e mouse"
                rows={[
                  ["Arrastar", "Mover peça ou grupo"],
                  ["↑ ↓ ← →", "Mover peça selecionada"],
                  ["R", "Rotacionar 90°"],
                  ["[  ]", "Peça anterior / próxima"],
                  ["+  −", "Zoom"],
                  ["0", "Centralizar tabuleiro"],
                ]}
              />
              <ControlGroup
                icon="XBOX"
                title="Xbox"
                rows={[
                  ["L", "Mover peça"],
                  ["A", "Próxima peça"],
                  ["B", "Rotacionar"],
                  ["LB / RB", "Alternar peça"],
                  ["LT / RT", "Zoom"],
                  ["MENU", "Pausar"],
                ]}
              />
              <ControlGroup
                icon="PS"
                title="PlayStation"
                rows={[
                  ["L", "Mover peça"],
                  ["×", "Próxima peça"],
                  ["○", "Rotacionar"],
                  ["L1 / R1", "Alternar peça"],
                  ["L2 / R2", "Zoom"],
                  ["OPTIONS", "Pausar"],
                ]}
              />
            </div>
          </section>
        </div>
      )}
      {completed && (
        <CompletionModal
          pieces={configuration.totalPieces}
          elapsed={session.elapsedTime}
          hints={session.hintsUsed}
          imageUrl={imageUrl}
          rows={configuration.rows}
          columns={configuration.columns}
          puzzlePieces={session.pieces}
          timelapse={session.timelapse}
          onReplay={replay}
        />
      )}
      {achievementQueue[0] && (
        <AchievementToast
          key={achievementQueue[0].id}
          achievement={achievementQueue[0]}
          platform={
            controllerName?.toLowerCase().includes("xbox")
              ? "xbox"
              : controllerName?.toLowerCase().includes("playstation") ||
                  controllerName?.toLowerCase().includes("dual")
                ? "playstation"
                : "keyboard"
          }
          onDone={dismissAchievement}
        />
      )}
    </main>
  );
}

function ControlGroup({
  icon,
  title,
  rows,
}: {
  icon: string;
  title: string;
  rows: [string, string][];
}) {
  return (
    <section className="control-group">
      <h3>
        <span aria-hidden="true">{icon}</span> {title}
      </h3>
      <dl>
        {rows.map(([key, action]) => (
          <div key={`${key}-${action}`}>
            <dt>{key}</dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
