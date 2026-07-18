"use client";

import { calculateProgress } from "@puzzled/puzzle-engine";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createTimelapse } from "@/lib/create-timelapse";
import { useI18n } from "@/lib/i18n";
import { deletePuzzle, listPuzzles, type SavedPuzzle } from "@/lib/puzzle-db";
import { Icon } from "./icons";

export function SavedPuzzles() {
  const { language, locale, t } = useI18n();
  const [puzzles, setPuzzles] = useState<SavedPuzzle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [processingVideo, setProcessingVideo] = useState<{ id: string; progress: number } | null>(
    null,
  );
  const [generatedVideos, setGeneratedVideos] = useState<Map<string, Blob>>(() => new Map());
  const [videoNotice, setVideoNotice] = useState<{
    message: string;
    status: "processing" | "success" | "error";
  } | null>(null);
  const noticeTimer = useRef<number | null>(null);
  useEffect(() => {
    listPuzzles()
      .then(setPuzzles)
      .catch(() =>
        setError(
          t(
            "Não foi possível abrir suas partidas. Verifique o armazenamento do navegador.",
            "Could not open your games. Check your browser storage.",
          ),
        ),
      );
  }, [t]);
  useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  function safePuzzleName(puzzle: SavedPuzzle) {
    return (
      puzzle.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "pieceful-puzzle"
    );
  }

  async function generatePuzzleVideo(puzzle: SavedPuzzle) {
    if (processingVideo) return;
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setProcessingVideo({ id: puzzle.id, progress: 0 });
    setVideoNotice({
      message: t(
        `Gerando o vídeo de “${puzzle.name}”…`,
        `Generating the video for “${puzzle.name}”…`,
      ),
      status: "processing",
    });
    const imageUrl = URL.createObjectURL(puzzle.image);
    try {
      const video = await createTimelapse({
        imageUrl,
        rows: puzzle.configuration.rows,
        columns: puzzle.configuration.columns,
        pieces: puzzle.session.pieces,
        timelapse: puzzle.session.timelapse,
        elapsed: puzzle.session.elapsedTime,
        language,
        onProgress: (progress) =>
          setProcessingVideo((current) =>
            current?.id === puzzle.id ? { ...current, progress } : current,
          ),
      });
      setGeneratedVideos((current) => new Map(current).set(puzzle.id, video));
      setVideoNotice({
        message: t(
          `O vídeo de “${puzzle.name}” está pronto para baixar.`,
          `The video for “${puzzle.name}” is ready to download.`,
        ),
        status: "success",
      });
    } catch (caught) {
      setVideoNotice({
        message:
          caught instanceof Error
            ? caught.message
            : t("Não foi possível gerar o vídeo.", "Could not generate the video."),
        status: "error",
      });
    } finally {
      URL.revokeObjectURL(imageUrl);
      setProcessingVideo(null);
    }
  }

  function downloadPuzzleVideo(puzzle: SavedPuzzle, video: Blob) {
    const extension = video.type === "video/mp4" ? "mp4" : "webm";
    const safeName = safePuzzleName(puzzle);
    const url = URL.createObjectURL(video);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}-timelapse.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setVideoNotice({
      message: t(
        `Download do vídeo de “${puzzle.name}” iniciado.`,
        `Video download for “${puzzle.name}” started.`,
      ),
      status: "success",
    });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setVideoNotice(null), 4_000);
  }
  async function removePuzzle(puzzle: SavedPuzzle) {
    const confirmed = window.confirm(
      t(
        `Excluir “${puzzle.name}”? A imagem e todo o progresso serão apagados deste dispositivo.`,
        `Delete “${puzzle.name}”? The image and all progress will be removed from this device.`,
      ),
    );
    if (!confirmed) return;
    setDeletingId(puzzle.id);
    try {
      await deletePuzzle(puzzle.id);
      setPuzzles((current) => current?.filter(({ id }) => id !== puzzle.id) ?? []);
    } catch {
      setError(
        t(
          "Não foi possível excluir o quebra-cabeça. Tente novamente.",
          "Could not delete the puzzle. Try again.",
        ),
      );
    } finally {
      setDeletingId(null);
    }
  }
  if (error)
    return (
      <div className="empty-state">
        <h2>{t("Não conseguimos carregar suas partidas", "We couldn't load your games")}</h2>
        <p>{error}</p>
        <button type="button" className="secondary-button" onClick={() => window.location.reload()}>
          {t("Tentar novamente", "Try again")}
        </button>
      </div>
    );
  if (!puzzles)
    return (
      <div className="generating compact">
        <div className="spinner-piece">✦</div>
        <p>{t("Carregando suas memórias…", "Loading your memories…")}</p>
      </div>
    );
  if (puzzles.length === 0)
    return (
      <div className="empty-state">
        <span className="card-icon">
          <Icon name="folder" size={28} />
        </span>
        <h2>{t("Sua estante está esperando", "Your shelf is waiting")}</h2>
        <p>
          {t(
            "Crie o primeiro quebra-cabeça e ele ficará salvo aqui, neste dispositivo.",
            "Create your first puzzle and it will be saved here on this device.",
          )}
        </p>
        <Link className="primary-button" href="/create">
          {t("Criar agora", "Create now")}
        </Link>
      </div>
    );
  return (
    <>
      {videoNotice && (
        <output className={`collection-video-notice ${videoNotice.status}`} aria-live="polite">
          <span
            className={
              videoNotice.status === "processing"
                ? "video-spinner"
                : videoNotice.status === "error"
                  ? "video-error-icon"
                  : "video-check"
            }
            aria-hidden="true"
          >
            {videoNotice.status === "processing" ? "▶" : videoNotice.status === "error" ? "!" : "✓"}
          </span>
          {videoNotice.message}
        </output>
      )}
      <div className="saved-grid">
        {puzzles.map((puzzle) => {
          const placed = puzzle.session.pieces.filter((piece) => piece.isPlaced).length;
          const progress = calculateProgress(placed, puzzle.session.pieces.length);
          const completed = puzzle.session.completedAt !== null || progress === 100;
          const generatedVideo = generatedVideos.get(puzzle.id);
          const isGeneratingVideo = processingVideo?.id === puzzle.id;
          const url = URL.createObjectURL(puzzle.image);
          return (
            <article
              className={`saved-card glass-card ${completed ? "completed" : ""}`}
              key={puzzle.id}
            >
              <img
                src={url}
                alt={`Foto do quebra-cabeça ${puzzle.name}`}
                onLoad={() => URL.revokeObjectURL(url)}
              />
              <div>
                <span>
                  {completed
                    ? t("Finalizado", "Completed")
                    : `${puzzle.configuration.totalPieces.toLocaleString(locale)} ${t("peças", "pieces")}`}
                </span>
                <h2>{puzzle.name}</h2>
                <div className="progress-track">
                  <i style={{ width: `${progress}%` }} />
                </div>
                <p>
                  {progress}% {t("concluído", "completed")} · {t("salvo", "saved")}{" "}
                  {new Date(puzzle.updatedAt).toLocaleDateString(locale)}
                </p>
                <div className={`saved-card-actions ${completed ? "" : "single-action"}`}>
                  <Link className="primary-button" href={`/puzzle?id=${puzzle.id}`}>
                    {completed
                      ? t("Finalizado", "Completed")
                      : progress > 0
                        ? t("Continuar montagem", "Continue puzzle")
                        : t("Abrir caixa", "Open box")}
                  </Link>
                  {completed && (
                    <button
                      type="button"
                      className="secondary-button puzzle-video-button"
                      disabled={processingVideo !== null || deletingId === puzzle.id}
                      onClick={() =>
                        generatedVideo
                          ? downloadPuzzleVideo(puzzle, generatedVideo)
                          : void generatePuzzleVideo(puzzle)
                      }
                    >
                      <span className="download-icon" aria-hidden="true">
                        {generatedVideo ? "↓" : "▶"}
                      </span>
                      {isGeneratingVideo
                        ? t(
                            `Gerando… ${processingVideo.progress}%`,
                            `Generating… ${processingVideo.progress}%`,
                          )
                        : generatedVideo
                          ? t("Baixar vídeo", "Download video")
                          : t("Gerar vídeo", "Generate video")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="delete-puzzle-button"
                    disabled={deletingId === puzzle.id || processingVideo?.id === puzzle.id}
                    onClick={() => void removePuzzle(puzzle)}
                    aria-label={t(
                      `Excluir quebra-cabeça ${puzzle.name}`,
                      `Delete puzzle ${puzzle.name}`,
                    )}
                  >
                    {deletingId === puzzle.id
                      ? t("Excluindo…", "Deleting…")
                      : t("Excluir", "Delete")}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
