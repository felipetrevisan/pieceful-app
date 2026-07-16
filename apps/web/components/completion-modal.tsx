"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";

interface Props {
  pieces: number;
  elapsed: number;
  hints: number;
  imageUrl: string;
  onReplay: () => void;
}

export function CompletionModal({ pieces, elapsed, hints, imageUrl, onReplay }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);
  const achievement =
    pieces >= 1000
      ? "Lenda dos Quebra-Cabeças"
      : pieces >= 500
        ? "Mestre dos Quebra-Cabeças"
        : "Memória reconstruída";
  const time = new Date(elapsed * 1000).toISOString().slice(11, 19);
  async function share() {
    const text = `Completei um quebra-cabeça de ${pieces.toLocaleString("pt-BR")} peças em ${time}!`;
    if (navigator.share) await navigator.share({ title: achievement, text });
    else await navigator.clipboard.writeText(text);
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
      <div className="modal-actions">
        <button type="button" className="secondary-button" onClick={share}>
          Compartilhar conquista
        </button>
        <button type="button" className="secondary-button" onClick={onReplay}>
          Jogar novamente
        </button>
        <Link href="/criar" className="primary-button">
          Criar novo quebra-cabeça
        </Link>
      </div>
    </dialog>
  );
}
