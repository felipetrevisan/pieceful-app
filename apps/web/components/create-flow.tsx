"use client";

import type { PuzzleSession } from "@puzzled/puzzle-engine";
import type { PuzzleConfiguration, PuzzleDifficulty } from "@puzzled/shared";
import { useEffect, useMemo, useState } from "react";
import { generateSession } from "@/lib/generate-session";
import { useI18n } from "@/lib/i18n";
import { processImage, retainImageFile, validateImage } from "@/lib/image-processing";
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
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [photoCredit, setPhotoCredit] = useState<PhotoCredit | null>(null);
  const [session, setSession] = useState<PuzzleSession | null>(null);

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
      return;
    }
    try {
      const retainedFile = await retainImageFile(next);
      await validateImage(retainedFile);
      const nextPreviewUrl = URL.createObjectURL(retainedFile);
      setFile(retainedFile);
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
    if (value !== "custom")
      setConfiguration((current) => ({ ...current, rows, columns, totalPieces: rows * columns }));
  }

  async function create() {
    if (!file) return;
    setError(null);
    setStage("generating");
    try {
      const image = await processImage(file, zoom, rotation);
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
            zoom={zoom}
            rotation={rotation}
            error={error}
            photoCredit={photoCredit}
            onFile={chooseFile}
            onUnsplashPhoto={chooseUnsplashPhoto}
            onDifficulty={chooseDifficulty}
            onConfiguration={setConfiguration}
            onZoom={setZoom}
            onRotation={setRotation}
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
            onOpened={() => setStage("game")}
          />
        )}
      </main>
    </div>
  );
}
