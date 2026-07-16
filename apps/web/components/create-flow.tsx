"use client";

import type { PuzzleSession } from "@puzzled/puzzle-engine";
import type { PuzzleConfiguration, PuzzleDifficulty } from "@puzzled/shared";
import { useEffect, useMemo, useState } from "react";
import { generateSession } from "@/lib/generate-session";
import { processImage, validateImage } from "@/lib/image-processing";
import { savePuzzle } from "@/lib/puzzle-db";
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
  const [stage, setStage] = useState<Stage>("create");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<Blob | null>(null);
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>("normal");
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PuzzleSession | null>(null);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  async function chooseFile(next: File | null) {
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!next) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    try {
      await validateImage(next);
      setFile(next);
      setPreviewUrl(URL.createObjectURL(next));
    } catch (caught) {
      setFile(null);
      setPreviewUrl(null);
      setError(caught instanceof Error ? caught.message : "Foto inválida.");
    }
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
        updatedAt: new Date().toISOString(),
      });
      setStage("box");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Não foi possível criar o quebra-cabeça.",
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
        name={file?.name.replace(/\.[^.]+$/, "") ?? "Minha memória"}
        image={processedImage}
        imageUrl={imageUrl}
        difficulty={difficulty}
        configuration={configuration}
        initialSession={session}
      />
    );
  return (
    <div className="site-shell creator-shell">
      <SiteHeader active="criar" />
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
            onFile={chooseFile}
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
            <h1>Cortando sua memória em peças…</h1>
            <p>Gerando encaixes complementares e organizando as bandejas sem enviar sua foto.</p>
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
