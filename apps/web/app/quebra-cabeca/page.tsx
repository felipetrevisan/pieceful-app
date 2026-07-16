import { Suspense } from "react";
import { ResumeGame } from "@/components/resume-game";

export default function PuzzlePage() {
  return (
    <Suspense
      fallback={
        <div className="generating fullscreen">
          <div className="spinner-piece">✦</div>
          <h1>Restaurando sua montagem…</h1>
        </div>
      }
    >
      <ResumeGame />
    </Suspense>
  );
}
