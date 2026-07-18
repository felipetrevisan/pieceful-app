"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getPuzzle, type SavedPuzzle } from "@/lib/puzzle-db";
import { GameScreen } from "./game-screen";

export function ResumeGame() {
  const { t } = useI18n();
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
        <h1>{t("Restaurando sua montagem…", "Restoring your puzzle…")}</h1>
      </div>
    );
  if (!puzzle || !imageUrl)
    return (
      <div className="empty-state fullscreen">
        <h1>{t("Partida não encontrada", "Game not found")}</h1>
        <p>
          {t(
            "Esta partida pode ter sido removida ou pertencer a outro dispositivo.",
            "This game may have been removed or belong to another device.",
          )}
        </p>
        <a className="primary-button" href="/puzzles">
          {t("Voltar à coleção", "Back to collection")}
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
