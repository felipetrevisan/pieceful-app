"use client";

import { DIFFICULTIES, type PuzzleConfiguration, type PuzzleDifficulty } from "@puzzled/shared";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

interface Props {
  file: File | null;
  previewUrl: string | null;
  difficulty: PuzzleDifficulty;
  configuration: PuzzleConfiguration;
  zoom: number;
  rotation: number;
  error: string | null;
  onFile: (file: File | null) => void;
  onDifficulty: (value: PuzzleDifficulty, rows: number, columns: number) => void;
  onConfiguration: (configuration: PuzzleConfiguration) => void;
  onZoom: (value: number) => void;
  onRotation: (value: number) => void;
  onSubmit: () => void;
}

export function UploadConfigurator(props: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const validTotal =
    props.configuration.totalPieces >= 6 && props.configuration.totalPieces <= 1000;
  const gridCells = Array.from(
    { length: Math.min(props.configuration.totalPieces, 1000) },
    (_, index) => `celula-${index + 1}`,
  );

  useEffect(() => {
    const prevent = (event: DragEvent) => event.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  function receive(files: FileList | null) {
    const file = files?.item(0);
    if (file) props.onFile(file);
  }

  function customDimension(key: "rows" | "columns", value: number) {
    const next = {
      ...props.configuration,
      [key]: value,
      totalPieces:
        key === "rows" ? value * props.configuration.columns : props.configuration.rows * value,
    };
    props.onConfiguration(next);
  }

  return (
    <div className="creator-layout">
      <section className="photo-panel">
        <span className="section-kicker">NOVO DESAFIO</span>
        {!props.previewUrl ? (
          <button
            type="button"
            className={`drop-zone ${dragging ? "dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              setDragging(false);
              receive(event.dataTransfer.files);
            }}
          >
            <span className="upload-orb">
              <Icon name="upload" size={26} />
            </span>
            <strong>Arraste uma foto para cá</strong>
            <span>ou clique para procurar no seu dispositivo</span>
            <small>JPG, PNG ou WEBP · máximo 20 MB</small>
          </button>
        ) : (
          <div className="photo-editor">
            <div className="crop-frame">
              <img
                src={props.previewUrl}
                alt="Prévia da foto escolhida"
                style={{ transform: `scale(${props.zoom}) rotate(${props.rotation}deg)` }}
              />
              <div
                className="grid-overlay"
                style={{
                  gridTemplateColumns: `repeat(${props.configuration.columns}, 1fr)`,
                  gridTemplateRows: `repeat(${props.configuration.rows}, 1fr)`,
                }}
              >
                {gridCells.map((key) => (
                  <span key={key} />
                ))}
              </div>
            </div>
            <div className="editor-controls">
              <label>
                Zoom{" "}
                <input
                  type="range"
                  min="1"
                  max="2.4"
                  step="0.05"
                  value={props.zoom}
                  onChange={(event) => props.onZoom(Number(event.target.value))}
                />
              </label>
              <button
                type="button"
                className="secondary-button"
                onClick={() => props.onRotation((props.rotation + 90) % 360)}
              >
                Girar 90°
              </button>
              <button
                type="button"
                className="text-button danger"
                onClick={() => props.onFile(null)}
              >
                Excluir foto
              </button>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => receive(event.target.files)}
        />
        {props.error && (
          <p className="error-message" role="alert">
            {props.error}
          </p>
        )}
      </section>
      <section className="settings-card glass-card">
        <div className="settings-title">
          <span className="number-badge">1</span>
          <div>
            <h2>Escolha o nível do desafio</h2>
            <p>Quanto mais peças, maior a diversão.</p>
          </div>
        </div>
        <div className="difficulty-grid">
          {DIFFICULTIES.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={props.difficulty === preset.id ? "selected" : ""}
              onClick={() => props.onDifficulty(preset.id, preset.rows, preset.columns)}
            >
              <strong>{preset.pieces.toLocaleString("pt-BR")}</strong>
              <span>{preset.label}</span>
              <small>
                {preset.rows} × {preset.columns}
              </small>
            </button>
          ))}
        </div>
        <details>
          <summary>Opções avançadas e grade personalizada</summary>
          <div className="advanced-grid">
            <label>
              Linhas
              <input
                type="number"
                min="2"
                max="40"
                value={props.configuration.rows}
                onChange={(event) => {
                  props.onDifficulty(
                    "custom",
                    props.configuration.rows,
                    props.configuration.columns,
                  );
                  customDimension("rows", Number(event.target.value));
                }}
              />
            </label>
            <label>
              Colunas
              <input
                type="number"
                min="2"
                max="50"
                value={props.configuration.columns}
                onChange={(event) => {
                  props.onDifficulty(
                    "custom",
                    props.configuration.rows,
                    props.configuration.columns,
                  );
                  customDimension("columns", Number(event.target.value));
                }}
              />
            </label>
            <div className={`total-pill ${validTotal ? "" : "invalid"}`}>
              {props.configuration.totalPieces.toLocaleString("pt-BR")} peças
            </div>
          </div>
          <div className="toggle-list">
            {(
              [
                ["rotationEnabled", "Rotação das peças"],
                ["hintsEnabled", "Dicas"],
                ["referenceEnabled", "Imagem de referência"],
                ["timerEnabled", "Cronômetro"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={props.configuration[key]}
                  onChange={(event) =>
                    props.onConfiguration({ ...props.configuration, [key]: event.target.checked })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </details>
        {!validTotal && (
          <p className="error-message">A grade personalizada deve ter de 6 a 1.000 peças.</p>
        )}
        <button
          type="button"
          className="primary-button wide"
          disabled={!props.file || !validTotal}
          onClick={props.onSubmit}
        >
          <Icon name="play" size={16} /> Criar quebra-cabeça
        </button>
      </section>
    </div>
  );
}
