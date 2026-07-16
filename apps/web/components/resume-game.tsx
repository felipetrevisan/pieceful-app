"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getPuzzle, type SavedPuzzle } from "@/lib/puzzle-db";
import { GameScreen } from "./game-screen";

export function ResumeGame() {
  const id = useSearchParams().get("id");
  const [puzzle, setPuzzle] = useState<SavedPuzzle | null | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) {
      setPuzzle(null);
      return;
    }
    getPuzzle(id)
      .then((saved) => {
        setPuzzle(saved);
        if (saved) setImageUrl(URL.createObjectURL(saved.image));
      })
      .catch(() => setPuzzle(null));
  }, [id]);
  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );
  if (puzzle === undefined)
    return (
      <div className="generating fullscreen">
        <div className="spinner-piece">✦</div>
        <h1>Restaurando sua montagem…</h1>
      </div>
    );
  if (!puzzle || !imageUrl)
    return (
      <div className="empty-state fullscreen">
        <h1>Partida não encontrada</h1>
        <p>Esta partida pode ter sido removida ou pertencer a outro dispositivo.</p>
        <a className="primary-button" href="/puzzles">
          Voltar à coleção
        </a>
      </div>
    );
  return (
    <GameScreen
      name={puzzle.name}
      image={puzzle.image}
      imageUrl={imageUrl}
      difficulty={puzzle.difficulty}
      configuration={puzzle.configuration}
      photoCredit={puzzle.photoCredit}
      initialSession={puzzle.session}
    />
  );
}
