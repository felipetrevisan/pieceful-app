"use client";

import type { PuzzlePiece, PuzzleTimelapse } from "@puzzled/puzzle-engine";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createTimelapse } from "@/lib/create-timelapse";

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
      ? "Lenda dos Quebra-Cabeças"
      : pieces >= 500
        ? "Mestre dos Quebra-Cabeças"
        : "Memória reconstruída";
  const time = new Date(elapsed * 1000).toISOString().slice(11, 19);
  async function share() {
    const text = `Completei um quebra-cabeça de ${pieces.toLocaleString("pt-BR")} peças em ${time}!`;
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
        onProgress: setRenderProgress,
      });
      setVideo(result);
      setVideoUrl(URL.createObjectURL(result));
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : "Não foi possível gerar o vídeo.");
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
      text: `Montei ${pieces.toLocaleString("pt-BR")} peças em ${time}.`,
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
      setVideoError("O compartilhamento não foi concluído. Você ainda pode baixar o vídeo.");
    }
  }
  return (
    <dialog ref={dialogRef} className="completion-dialog" aria-labelledby={titleId}>
      <div className="confetti" aria-hidden="true">
        ✦　◆　✦　●　◆　✦
      </div>
      <img src={imageUrl} alt="Imagem completa do quebra-cabeça" />
      <span className="achievement">CONQUISTA DESBLOQUEADA</span>
      <h2 id={titleId}>{achievement}</h2>
      <div className="stats">
        <span>
          <strong>{pieces.toLocaleString("pt-BR")}</strong> peças
        </span>
        <span>
          <strong>{time}</strong> tempo total
        </span>
        <span>
          <strong>{hints}</strong> dicas usadas
        </span>
      </div>
      <section className="timelapse-card" aria-labelledby={`${titleId}-timelapse`}>
        <div className="timelapse-copy">
          <span className="timelapse-badge">NOVO</span>
          <div>
            <h3 id={`${titleId}-timelapse`}>Seu timelapse da montagem</h3>
            <p>Vídeo vertical pronto para Reels e TikTok, criado somente neste dispositivo.</p>
          </div>
        </div>
        {!videoUrl ? (
          <button
            type="button"
            className="timelapse-generate"
            onClick={generateVideo}
            disabled={generating}
          >
            {generating ? `Criando vídeo… ${renderProgress}%` : "Gerar timelapse"}
          </button>
        ) : (
          <div className="timelapse-result">
            <video
              src={videoUrl}
              controls
              muted
              playsInline
              aria-label="Prévia silenciosa do timelapse"
            />
            <div className="social-actions">
              <button type="button" onClick={() => shareVideo("Instagram")}>
                <span>IG</span> Compartilhar no Instagram
              </button>
              <button type="button" onClick={() => shareVideo("TikTok")}>
                <span>♪</span> Compartilhar no TikTok
              </button>
              <a
                href={videoUrl}
                download={`meu-quebra-cabeca.${video?.type === "video/mp4" ? "mp4" : "webm"}`}
              >
                Baixar vídeo
              </a>
            </div>
          </div>
        )}
        {videoError && <p className="timelapse-error">{videoError}</p>}
      </section>
      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={share}>
          Compartilhar conquista
        </button>
        <button type="button" className="secondary-button" onClick={onReplay}>
          Jogar novamente
        </button>
        <Link href="/create" className="primary-button">
          Criar novo quebra-cabeça
        </Link>
      </div>
    </dialog>
  );
}
