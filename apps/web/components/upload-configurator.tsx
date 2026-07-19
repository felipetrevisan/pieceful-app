"use client";

import {
  DIFFICULTIES,
  orientPuzzleGrid,
  type PuzzleConfiguration,
  type PuzzleDifficulty,
  type PuzzleOrientation,
  type ResolvedPuzzleOrientation,
} from "@puzzled/shared";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
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
  orientation: PuzzleOrientation;
  resolvedOrientation: ResolvedPuzzleOrientation;
  zoom: number;
  rotation: number;
  error: string | null;
  photoCredit: PhotoCredit | null;
  onFile: (file: File | null) => Promise<void>;
  onUnsplashPhoto: (file: File, credit: PhotoCredit) => void;
  onDifficulty: (value: PuzzleDifficulty, rows: number, columns: number) => void;
  onConfiguration: (configuration: PuzzleConfiguration) => void;
  onOrientation: (orientation: PuzzleOrientation) => void;
  onZoom: (value: number) => void;
  onRotation: (value: number) => void;
  onSubmit: () => void;
}

export function UploadConfigurator(props: Props) {
  const { language, locale, t } = useI18n();
  const advancedOptionsId = useId();
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

  async function receive(files: FileList | null) {
    const file = files?.item(0);
    if (file) await props.onFile(file);
    if (inputRef.current) inputRef.current.value = "";
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
      setPhotoError(
        error instanceof Error
          ? error.message
          : t("Não foi possível buscar fotos.", "Could not search for photos."),
      );
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
      setPhotoError(
        error instanceof Error
          ? error.message
          : t("Não foi possível escolher a foto.", "Could not select this photo."),
      );
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="creator-layout">
      <section className="photo-panel">
        <span className="section-kicker">{t("NOVO DESAFIO", "NEW CHALLENGE")}</span>
        {!props.previewUrl ? (
          <div className="photo-source-picker">
            <div
              className="photo-source-tabs"
              role="tablist"
              aria-label={t("Origem da foto", "Photo source")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={source === "device"}
                className={source === "device" ? "active" : ""}
                onClick={() => setSource("device")}
              >
                {t("Meu dispositivo", "My device")}
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
                  void receive(event.dataTransfer.files);
                }}
              >
                <span className="upload-orb">
                  <Icon name="upload" size={26} />
                </span>
                <strong>{t("Arraste uma foto para cá", "Drag a photo here")}</strong>
                <span>
                  {t(
                    "ou clique para procurar no seu dispositivo",
                    "or click to browse your device",
                  )}
                </span>
                <small>
                  {t("JPG, PNG ou WEBP · máximo 20 MB", "JPG, PNG or WEBP · maximum 20 MB")}
                </small>
              </button>
            ) : (
              <div className="unsplash-picker">
                <form className="unsplash-search" onSubmit={searchPhotos}>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t(
                      "Busque natureza, cidades, animais…",
                      "Search nature, cities, animals…",
                    )}
                    aria-label={t("Buscar fotos no Unsplash", "Search Unsplash photos")}
                  />
                  <button type="submit" disabled={searching || query.trim().length < 2}>
                    {searching ? t("Buscando…", "Searching…") : t("Buscar", "Search")}
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
                          {t("Foto por", "Photo by")}{" "}
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
                    <strong>
                      {t(
                        "Encontre uma imagem para sua próxima montagem",
                        "Find an image for your next puzzle",
                      )}
                    </strong>
                    <span>
                      {t(
                        "As fotos incluem crédito aos seus criadores.",
                        "Photos include credit for their creators.",
                      )}
                    </span>
                  </div>
                )}
                {photoError && <p className="error-message">{photoError}</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="photo-editor">
            <div
              className={`crop-frame ${props.resolvedOrientation}`}
              style={{ aspectRatio: props.configuration.columns / props.configuration.rows }}
            >
              <img
                src={props.previewUrl}
                alt={t("Prévia da foto escolhida", "Selected photo preview")}
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
                {t("Girar 90°", "Rotate 90°")}
              </button>
              <button
                type="button"
                className="text-button danger"
                onClick={() => void props.onFile(null)}
              >
                {t("Excluir foto", "Remove photo")}
              </button>
            </div>
            {props.photoCredit && (
              <small className="selected-photo-credit">
                {t("Foto por", "Photo by")}{" "}
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
          onChange={(event) => void receive(event.target.files)}
        />
        {props.error && (
          <p className="error-message" role="alert">
            {props.error}
          </p>
        )}
      </section>
      <section className="settings-card glass-card">
        <div className="orientation-section">
          <div className="settings-title compact">
            <span className="number-badge">1</span>
            <div>
              <h2>{t("Formato do quebra-cabeça", "Puzzle orientation")}</h2>
              <p>
                {t(
                  "Detectamos a foto, mas você continua no controle.",
                  "We detect the photo, but you stay in control.",
                )}
              </p>
            </div>
          </div>
          <fieldset className="orientation-picker">
            <legend className="sr-only">{t("Orientação", "Orientation")}</legend>
            {(
              [
                ["automatic", t("Automático", "Automatic"), "auto"],
                ["portrait", t("Vertical", "Portrait"), "portrait"],
                ["landscape", t("Horizontal", "Landscape"), "landscape"],
              ] as const
            ).map(([value, label, preview]) => (
              <button
                type="button"
                aria-pressed={props.orientation === value}
                className={props.orientation === value ? "selected" : ""}
                key={value}
                onClick={() => props.onOrientation(value)}
              >
                <span className={`orientation-shape ${preview}`} aria-hidden="true">
                  {preview === "auto" ? "✦" : ""}
                </span>
                <strong>{label}</strong>
                <small>
                  {value === "automatic"
                    ? !props.file
                      ? t("Após escolher a foto", "After choosing a photo")
                      : props.resolvedOrientation === "portrait"
                        ? t("Detectado: vertical", "Detected: portrait")
                        : t("Detectado: horizontal", "Detected: landscape")
                    : value === "portrait"
                      ? "3:4"
                      : "4:3"}
                </small>
              </button>
            ))}
          </fieldset>
        </div>
        <div className="settings-title">
          <span className="number-badge">2</span>
          <div>
            <h2>{t("Escolha o nível do desafio", "Choose your challenge level")}</h2>
            <p>{t("Quanto mais peças, maior a diversão.", "More pieces, more fun.")}</p>
          </div>
        </div>
        <div className="difficulty-grid">
          {DIFFICULTIES.map((preset) => {
            const displayGrid = orientPuzzleGrid(
              preset.rows,
              preset.columns,
              props.resolvedOrientation,
            );
            return (
              <button
                type="button"
                key={preset.id}
                className={props.difficulty === preset.id ? "selected" : ""}
                onClick={() => props.onDifficulty(preset.id, preset.rows, preset.columns)}
              >
                <strong>{preset.pieces.toLocaleString(locale)}</strong>
                <span>
                  {language === "en"
                    ? (
                        {
                          beginner: "Beginner",
                          easy: "Easy",
                          normal: "Normal",
                          medium: "Medium",
                          hard: "Hard",
                          advanced: "Advanced",
                          master: "Master",
                          legendary: "Legendary",
                          custom: "Custom",
                        } as const
                      )[preset.id]
                    : preset.label}
                </span>
                <small>
                  {displayGrid.rows} × {displayGrid.columns}
                </small>
              </button>
            );
          })}
        </div>
        <section className="advanced-options" aria-labelledby={advancedOptionsId}>
          <div className="advanced-options-heading">
            <span className="number-badge">3</span>
            <div>
              <h3 id={advancedOptionsId}>{t("Opções da partida", "Game options")}</h3>
              <p>
                {t(
                  "Personalize a grade e escolha como você quer jogar.",
                  "Customize the grid and choose how you want to play.",
                )}
              </p>
            </div>
          </div>
          <div className="advanced-grid">
            <label>
              {t("Linhas", "Rows")}
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
              {t("Colunas", "Columns")}
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
              {props.configuration.totalPieces.toLocaleString(locale)} {t("peças", "pieces")}
            </div>
          </div>
          <div className="toggle-list">
            {(
              [
                ["rotationEnabled", t("Rotação das peças", "Piece rotation")],
                ["hintsEnabled", t("Dicas", "Hints")],
                ["referenceEnabled", t("Imagem de referência", "Reference image")],
                ["timerEnabled", t("Cronômetro", "Timer")],
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
        </section>
        {!validTotal && (
          <p className="error-message">
            {t(
              "A grade personalizada deve ter de 6 a 1.000 peças.",
              "The custom grid must contain between 6 and 1,000 pieces.",
            )}
          </p>
        )}
        <button
          type="button"
          className="primary-button wide"
          disabled={!props.file || !validTotal}
          onClick={props.onSubmit}
        >
          <Icon name="play" size={16} /> {t("Criar quebra-cabeça", "Create puzzle")}
        </button>
      </section>
    </div>
  );
}
