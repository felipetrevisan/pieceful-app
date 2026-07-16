"use client";

import { DIFFICULTIES, type PuzzleConfiguration, type PuzzleDifficulty } from "@puzzled/shared";
import { useEffect, useRef, useState } from "react";
import {
  type PhotoCredit,
  searchUnsplashPhotos,
  selectUnsplashPhoto,
  type UnsplashPhoto,
} from "@/lib/unsplash";
import { Icon } from "./icons";

interface Props {
  file: File | null;
  previewUrl: string | null;
  difficulty: PuzzleDifficulty;
  configuration: PuzzleConfiguration;
  zoom: number;
  rotation: number;
  error: string | null;
  photoCredit: PhotoCredit | null;
  onFile: (file: File | null) => void;
  onUnsplashPhoto: (file: File, credit: PhotoCredit) => void;
  onDifficulty: (value: PuzzleDifficulty, rows: number, columns: number) => void;
  onConfiguration: (configuration: PuzzleConfiguration) => void;
  onZoom: (value: number) => void;
  onRotation: (value: number) => void;
  onSubmit: () => void;
}

export function UploadConfigurator(props: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState<"device" | "unsplash">("device");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [searching, setSearching] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
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

  async function searchPhotos(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setPhotoError(null);
    try {
      setPhotos(await searchUnsplashPhotos(query.trim()));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Não foi possível buscar fotos.");
    } finally {
      setSearching(false);
    }
  }

  async function chooseUnsplashPhoto(photo: UnsplashPhoto) {
    setSearching(true);
    setPhotoError(null);
    try {
      const file = await selectUnsplashPhoto(photo);
      props.onUnsplashPhoto(file, photo);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Não foi possível escolher a foto.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="creator-layout">
      <section className="photo-panel">
        <span className="section-kicker">NOVO DESAFIO</span>
        {!props.previewUrl ? (
          <div className="photo-source-picker">
            <div className="photo-source-tabs" role="tablist" aria-label="Origem da foto">
              <button
                type="button"
                role="tab"
                aria-selected={source === "device"}
                className={source === "device" ? "active" : ""}
                onClick={() => setSource("device")}
              >
                Meu dispositivo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={source === "unsplash"}
                className={source === "unsplash" ? "active" : ""}
                onClick={() => setSource("unsplash")}
              >
                Unsplash
              </button>
            </div>
            {source === "device" ? (
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
              <div className="unsplash-picker">
                <form className="unsplash-search" onSubmit={searchPhotos}>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Busque natureza, cidades, animais…"
                    aria-label="Buscar fotos no Unsplash"
                  />
                  <button type="submit" disabled={searching || query.trim().length < 2}>
                    {searching ? "Buscando…" : "Buscar"}
                  </button>
                </form>
                {photos.length > 0 ? (
                  <div className="unsplash-grid">
                    {photos.map((photo) => (
                      <article key={photo.id}>
                        <button
                          type="button"
                          disabled={searching}
                          onClick={() => chooseUnsplashPhoto(photo)}
                        >
                          <img src={photo.thumbnailUrl} alt={photo.description} />
                        </button>
                        <small>
                          Foto por{" "}
                          <a href={photo.photographerUrl} target="_blank" rel="noreferrer">
                            {photo.photographer}
                          </a>{" "}
                          no{" "}
                          <a href={photo.unsplashUrl} target="_blank" rel="noreferrer">
                            Unsplash
                          </a>
                        </small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="unsplash-empty">
                    <strong>Encontre uma imagem para sua próxima montagem</strong>
                    <span>As fotos incluem crédito aos seus criadores.</span>
                  </div>
                )}
                {photoError && <p className="error-message">{photoError}</p>}
              </div>
            )}
          </div>
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
            {props.photoCredit && (
              <small className="selected-photo-credit">
                Foto por{" "}
                <a href={props.photoCredit.photographerUrl} target="_blank" rel="noreferrer">
                  {props.photoCredit.photographer}
                </a>{" "}
                no{" "}
                <a href={props.photoCredit.unsplashUrl} target="_blank" rel="noreferrer">
                  Unsplash
                </a>
              </small>
            )}
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
