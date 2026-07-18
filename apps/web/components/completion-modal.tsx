"use client";

import type { PuzzlePiece, PuzzleTimelapse } from "@puzzled/puzzle-engine";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createTimelapse } from "@/lib/create-timelapse";
import { useI18n } from "@/lib/i18n";

interface Props {
  pieces: number;
  elapsed: number;
  hints: number;
  imageUrl: string;
  rows: number;
  columns: number;
  puzzlePieces: PuzzlePiece[];
  timelapse: PuzzleTimelapse | undefined;
  onReplay: () => void;
}

export function CompletionModal({
  pieces,
  elapsed,
  hints,
  imageUrl,
  rows,
  columns,
  puzzlePieces,
  timelapse,
  onReplay,
}: Props) {
  const { language, locale, t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [video, setVideo] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);
  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );
  const achievement =
    pieces >= 1000
      ? t("Lenda dos Quebra-Cabeças", "Puzzle Legend")
      : pieces >= 500
        ? t("Mestre dos Quebra-Cabeças", "Puzzle Master")
        : t("Memória reconstruída", "Memory rebuilt");
  const time = new Date(elapsed * 1000).toISOString().slice(11, 19);
  async function share() {
    const text = t(
      `Completei um quebra-cabeça de ${pieces.toLocaleString(locale)} peças em ${time}!`,
      `I completed a ${pieces.toLocaleString(locale)}-piece puzzle in ${time}!`,
    );
    try {
      if (navigator.share) await navigator.share({ title: achievement, text });
      else await navigator.clipboard.writeText(text);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    }
  }

  async function generateVideo() {
    if (generating || video) return;
    setGenerating(true);
    setVideoError(null);
    try {
      const result = await createTimelapse({
        imageUrl,
        rows,
        columns,
        pieces: puzzlePieces,
        timelapse,
        elapsed,
        language,
        onProgress: setRenderProgress,
      });
      setVideo(result);
      setVideoUrl(URL.createObjectURL(result));
    } catch (error) {
      setVideoError(
        error instanceof Error
          ? error.message
          : t("Não foi possível gerar o vídeo.", "Could not generate the video."),
      );
    } finally {
      setGenerating(false);
    }
  }

  async function shareVideo(destination: "Instagram" | "TikTok") {
    if (!video) return;
    const extension = video.type === "video/mp4" ? "mp4" : "webm";
    const file = new File([video], `meu-quebra-cabeca.${extension}`, { type: video.type });
    const data: ShareData = {
      title: `Meu timelapse para ${destination}`,
      text: t(
        `Montei ${pieces.toLocaleString(locale)} peças em ${time}.`,
        `I assembled ${pieces.toLocaleString(locale)} pieces in ${time}.`,
      ),
      files: [file],
    };
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        await navigator.share(data);
      } else {
        const link = document.createElement("a");
        link.href = videoUrl ?? URL.createObjectURL(video);
        link.download = file.name;
        link.click();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setVideoError(
        t(
          "O compartilhamento não foi concluído. Você ainda pode baixar o vídeo.",
          "Sharing was not completed. You can still download the video.",
        ),
      );
    }
  }
  return (
    <dialog ref={dialogRef} className="completion-dialog" aria-labelledby={titleId}>
      <div className="confetti" aria-hidden="true">
        ✦　◆　✦　●　◆　✦
      </div>
      <img src={imageUrl} alt={t("Imagem completa do quebra-cabeça", "Completed puzzle")} />
      <span className="achievement">{t("CONQUISTA DESBLOQUEADA", "ACHIEVEMENT UNLOCKED")}</span>
      <h2 id={titleId}>{achievement}</h2>
      <div className="stats">
        <span>
          <strong>{pieces.toLocaleString(locale)}</strong> {t("peças", "pieces")}
        </span>
        <span>
          <strong>{time}</strong> {t("tempo total", "total time")}
        </span>
        <span>
          <strong>{hints}</strong> {t("dicas usadas", "hints used")}
        </span>
      </div>
      <section className="timelapse-card" aria-labelledby={`${titleId}-timelapse`}>
        <div className="timelapse-copy">
          <span className="timelapse-badge">{t("NOVO", "NEW")}</span>
          <div>
            <h3 id={`${titleId}-timelapse`}>
              {t("Seu timelapse da montagem", "Your assembly timelapse")}
            </h3>
            <p>
              {t(
                "Vídeo vertical pronto para Reels e TikTok, criado somente neste dispositivo.",
                "A vertical video ready for Reels and TikTok, created only on this device.",
              )}
            </p>
          </div>
        </div>
        {!videoUrl ? (
          <button
            type="button"
            className="timelapse-generate"
            onClick={generateVideo}
            disabled={generating}
          >
            {generating
              ? t(`Criando vídeo… ${renderProgress}%`, `Creating video… ${renderProgress}%`)
              : t("Gerar timelapse", "Generate timelapse")}
          </button>
        ) : (
          <div className="timelapse-result">
            <video
              src={videoUrl}
              controls
              muted
              playsInline
              aria-label={t("Prévia silenciosa do timelapse", "Muted timelapse preview")}
            />
            <div className="social-actions">
              <button type="button" onClick={() => shareVideo("Instagram")}>
                <span>IG</span> {t("Compartilhar no Instagram", "Share on Instagram")}
              </button>
              <button type="button" onClick={() => shareVideo("TikTok")}>
                <span>♪</span> {t("Compartilhar no TikTok", "Share on TikTok")}
              </button>
              <a
                href={videoUrl}
                download={`meu-quebra-cabeca.${video?.type === "video/mp4" ? "mp4" : "webm"}`}
              >
                {t("Baixar vídeo", "Download video")}
              </a>
            </div>
          </div>
        )}
        {videoError && <p className="timelapse-error">{videoError}</p>}
      </section>
      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={share}>
          {t("Compartilhar conquista", "Share achievement")}
        </button>
        <button type="button" className="secondary-button" onClick={onReplay}>
          {t("Jogar novamente", "Play again")}
        </button>
        <Link href="/create" className="primary-button">
          {t("Criar novo quebra-cabeça", "Create a new puzzle")}
        </Link>
      </div>
    </dialog>
  );
}
