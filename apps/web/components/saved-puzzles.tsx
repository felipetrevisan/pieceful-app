"use client";

import { calculateProgress } from "@puzzled/puzzle-engine";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deletePuzzle, listPuzzles, type SavedPuzzle } from "@/lib/puzzle-db";
import { Icon } from "./icons";

export function SavedPuzzles() {
  const [puzzles, setPuzzles] = useState<SavedPuzzle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  useEffect(() => {
    listPuzzles()
      .then(setPuzzles)
      .catch(() =>
        setError("Não foi possível abrir suas partidas. Verifique o armazenamento do navegador."),
      );
  }, []);
  async function removePuzzle(puzzle: SavedPuzzle) {
    const confirmed = window.confirm(
      `Excluir “${puzzle.name}”? A imagem e todo o progresso serão apagados deste dispositivo.`,
    );
    if (!confirmed) return;
    setDeletingId(puzzle.id);
    try {
      await deletePuzzle(puzzle.id);
      setPuzzles((current) => current?.filter(({ id }) => id !== puzzle.id) ?? []);
    } catch {
      setError("Não foi possível excluir o quebra-cabeça. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  }
  if (error)
    return (
      <div className="empty-state">
        <h2>Não conseguimos carregar suas partidas</h2>
        <p>{error}</p>
        <button type="button" className="secondary-button" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  if (!puzzles)
    return (
      <div className="generating compact">
        <div className="spinner-piece">✦</div>
        <p>Carregando suas memórias…</p>
      </div>
    );
  if (puzzles.length === 0)
    return (
      <div className="empty-state">
        <span className="card-icon">
          <Icon name="folder" size={28} />
        </span>
        <h2>Sua estante está esperando</h2>
        <p>Crie o primeiro quebra-cabeça e ele ficará salvo aqui, neste dispositivo.</p>
        <Link className="primary-button" href="/create">
          Criar agora
        </Link>
      </div>
    );
  return (
    <div className="saved-grid">
      {puzzles.map((puzzle) => {
        const placed = puzzle.session.pieces.filter((piece) => piece.isPlaced).length;
        const progress = calculateProgress(placed, puzzle.session.pieces.length);
        const url = URL.createObjectURL(puzzle.image);
        return (
          <article className="saved-card glass-card" key={puzzle.id}>
            <img
              src={url}
              alt={`Foto do quebra-cabeça ${puzzle.name}`}
              onLoad={() => URL.revokeObjectURL(url)}
            />
            <div>
              <span>{puzzle.configuration.totalPieces.toLocaleString("pt-BR")} peças</span>
              <h2>{puzzle.name}</h2>
              <div className="progress-track">
                <i style={{ width: `${progress}%` }} />
              </div>
              <p>
                {progress}% concluído · salvo{" "}
                {new Date(puzzle.updatedAt).toLocaleDateString("pt-BR")}
              </p>
              <div className="saved-card-actions">
                <Link className="primary-button" href={`/puzzle?id=${puzzle.id}`}>
                  {progress > 0 ? "Continuar montagem" : "Abrir caixa"}
                </Link>
                <button
                  type="button"
                  className="delete-puzzle-button"
                  disabled={deletingId === puzzle.id}
                  onClick={() => void removePuzzle(puzzle)}
                  aria-label={`Excluir quebra-cabeça ${puzzle.name}`}
                >
                  {deletingId === puzzle.id ? "Excluindo…" : "Excluir"}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
