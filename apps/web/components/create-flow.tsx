"use client";

import type { PuzzleSession } from "@puzzled/puzzle-engine";
import {
  orientPuzzleGrid,
  type PuzzleConfiguration,
  type PuzzleDifficulty,
  type PuzzleOrientation,
  resolvePuzzleOrientation,
} from "@puzzled/shared";
import { useEffect, useMemo, useState } from "react";
import { generateSession } from "@/lib/generate-session";
import { useI18n } from "@/lib/i18n";
import {
  processImage,
  readImageDimensions,
  retainImageFile,
  validateImage,
} from "@/lib/image-processing";
import { savePuzzle } from "@/lib/puzzle-db";
import type { PhotoCredit } from "@/lib/unsplash";
import { GameScreen } from "./game-screen";
import { PuzzleBox } from "./puzzle-box";
import { SiteHeader } from "./site-header";
import { UploadConfigurator } from "./upload-configurator";

type Stage = "create" | "generating" | "box" | "game";
const initialConfiguration: PuzzleConfiguration = {
  rows: 6,
  columns: 8,
  totalPieces: 48,
  rotationEnabled: false,
  hintsEnabled: true,
  referenceEnabled: true,
  timerEnabled: true,
};

export function CreateFlow() {
  const { t } = useI18n();
  const [stage, setStage] = useState<Stage>("create");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<Blob | null>(null);
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>("normal");
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [orientation, setOrientation] = useState<PuzzleOrientation>("automatic");
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [photoCredit, setPhotoCredit] = useState<PhotoCredit | null>(null);
  const [session, setSession] = useState<PuzzleSession | null>(null);

  const effectiveImageDimensions = useMemo(() => {
    if (!imageDimensions) return null;
    const quarterTurn = Math.abs(Math.round(rotation / 90)) % 2 === 1;
    return quarterTurn
      ? { width: imageDimensions.height, height: imageDimensions.width }
      : imageDimensions;
  }, [imageDimensions, rotation]);
  const resolvedOrientation = resolvePuzzleOrientation(
    orientation,
    effectiveImageDimensions?.width,
    effectiveImageDimensions?.height,
  );

  function configurationForOrientation(
    current: PuzzleConfiguration,
    nextOrientation: ReturnType<typeof resolvePuzzleOrientation>,
  ) {
    const grid = orientPuzzleGrid(current.rows, current.columns, nextOrientation);
    return { ...current, ...grid, totalPieces: grid.rows * grid.columns };
  }

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  async function chooseFile(next: File | null) {
    setError(null);
    if (!next) {
      setFile(null);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      setPhotoCredit(null);
      setImageDimensions(null);
      return;
    }
    try {
      const retainedFile = await retainImageFile(next);
      await validateImage(retainedFile);
      const dimensions = await readImageDimensions(retainedFile);
      const nextPreviewUrl = URL.createObjectURL(retainedFile);
      setFile(retainedFile);
      setZoom(1);
      setRotation(0);
      setImageDimensions(dimensions);
      const nextOrientation = resolvePuzzleOrientation(
        orientation,
        dimensions.width,
        dimensions.height,
      );
      setConfiguration((current) => configurationForOrientation(current, nextOrientation));
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextPreviewUrl;
      });
      setPhotoCredit(null);
    } catch (caught) {
      setFile(null);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      setError(caught instanceof Error ? caught.message : t("Foto inválida.", "Invalid photo."));
    }
  }

  async function chooseUnsplashPhoto(next: File, credit: PhotoCredit) {
    await chooseFile(next);
    setPhotoCredit(credit);
  }

  function chooseDifficulty(value: PuzzleDifficulty, rows: number, columns: number) {
    setDifficulty(value);
    if (value !== "custom") {
      const grid = orientPuzzleGrid(rows, columns, resolvedOrientation);
      setConfiguration((current) => ({
        ...current,
        ...grid,
        totalPieces: grid.rows * grid.columns,
      }));
    }
  }

  function chooseOrientation(next: PuzzleOrientation) {
    setOrientation(next);
    const resolved = resolvePuzzleOrientation(
      next,
      effectiveImageDimensions?.width,
      effectiveImageDimensions?.height,
    );
    setConfiguration((current) => configurationForOrientation(current, resolved));
  }

  function rotateImage(nextRotation: number) {
    setRotation(nextRotation);
    if (orientation !== "automatic" || !imageDimensions) return;
    const quarterTurn = Math.abs(Math.round(nextRotation / 90)) % 2 === 1;
    const width = quarterTurn ? imageDimensions.height : imageDimensions.width;
    const height = quarterTurn ? imageDimensions.width : imageDimensions.height;
    setConfiguration((current) =>
      configurationForOrientation(current, resolvePuzzleOrientation("automatic", width, height)),
    );
  }

  async function create() {
    if (!file) return;
    setError(null);
    setStage("generating");
    try {
      const image = await processImage(
        file,
        zoom,
        rotation,
        configuration.columns / configuration.rows,
      );
      const puzzleId = crypto.randomUUID();
      const seed = crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
      const nextSession = await generateSession(
        puzzleId,
        configuration.rows,
        configuration.columns,
        seed,
        configuration.rotationEnabled,
      );
      setProcessedImage(image);
      setSession(nextSession);
      await savePuzzle({
        id: puzzleId,
        name: file.name.replace(/\.[^.]+$/, ""),
        image,
        difficulty,
        configuration,
        session: nextSession,
        photoCredit,
        updatedAt: new Date().toISOString(),
      });
      setStage("box");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : t("Não foi possível criar o quebra-cabeça.", "Could not create the puzzle."),
      );
      setStage("create");
    }
  }

  const imageUrl = useMemo(
    () => (processedImage ? URL.createObjectURL(processedImage) : previewUrl),
    [processedImage, previewUrl],
  );
  useEffect(
    () => () => {
      if (processedImage && imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl, processedImage],
  );

  if (stage === "game" && session && processedImage && imageUrl)
    return (
      <GameScreen
        name={file?.name.replace(/\.[^.]+$/, "") ?? t("Minha memória", "My memory")}
        image={processedImage}
        imageUrl={imageUrl}
        difficulty={difficulty}
        configuration={configuration}
        photoCredit={photoCredit}
        initialSession={session}
      />
    );
  return (
    <div className="site-shell creator-shell">
      <SiteHeader active="create" />
      <main>
        {stage === "create" && (
          <UploadConfigurator
            file={file}
            previewUrl={previewUrl}
            difficulty={difficulty}
            configuration={configuration}
            orientation={orientation}
            resolvedOrientation={resolvedOrientation}
            zoom={zoom}
            rotation={rotation}
            error={error}
            photoCredit={photoCredit}
            onFile={chooseFile}
            onUnsplashPhoto={chooseUnsplashPhoto}
            onDifficulty={chooseDifficulty}
            onConfiguration={setConfiguration}
            onOrientation={chooseOrientation}
            onZoom={setZoom}
            onRotation={rotateImage}
            onSubmit={create}
          />
        )}
        {stage === "generating" && (
          <section className="generating">
            <div className="spinner-piece">✦</div>
            <h1>{t("Cortando sua memória em peças…", "Cutting your memory into pieces…")}</h1>
            <p>
              {t(
                "Gerando encaixes complementares e organizando as bandejas sem enviar sua foto.",
                "Creating matching edges and organizing trays without uploading your photo.",
              )}
            </p>
            <div className="generation-bar">
              <i />
            </div>
          </section>
        )}
        {stage === "box" && imageUrl && (
          <PuzzleBox
            imageUrl={imageUrl}
            pieces={configuration.totalPieces}
            difficulty={difficulty}
            aspectRatio={configuration.columns / configuration.rows}
            onOpened={() => setStage("game")}
          />
        )}
      </main>
    </div>
  );
}
