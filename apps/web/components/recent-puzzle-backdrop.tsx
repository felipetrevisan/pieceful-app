"use client";

import { useEffect, useState } from "react";
import { listPuzzles } from "@/lib/puzzle-db";

interface Slide {
  id: string;
  name: string;
  url: string;
}

export function RecentPuzzleBackdrop() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let mounted = true;
    const objectUrls: string[] = [];
    void listPuzzles()
      .then((puzzles) => {
        const completed = puzzles
          .filter(
            (puzzle) =>
              puzzle.session.completedAt !== null ||
              puzzle.session.pieces.every((piece) => piece.isPlaced),
          )
          .slice(0, 5)
          .map((puzzle) => {
            const url = URL.createObjectURL(puzzle.image);
            objectUrls.push(url);
            return { id: puzzle.id, name: puzzle.name, url };
          });
        if (mounted) setSlides(completed);
      })
      .catch(() => {
        if (mounted) setSlides([]);
      });
    return () => {
      mounted = false;
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      5_500,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;
  return (
    <div className="recent-puzzle-backdrop" aria-hidden="true">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`recent-puzzle-slide${index === active ? " active" : ""}`}
          style={{ backgroundImage: `url(${slide.url})` }}
          data-name={slide.name}
        />
      ))}
    </div>
  );
}
