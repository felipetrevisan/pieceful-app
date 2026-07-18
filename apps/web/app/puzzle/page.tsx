import { Suspense } from "react";
import { ResumeGame } from "@/components/resume-game";
import { LocalizedText } from "@/lib/i18n";

export default function PuzzlePage() {
  return (
    <Suspense
      fallback={
        <div className="generating fullscreen">
          <div className="spinner-piece">✦</div>
          <h1>
            <LocalizedText
              portuguese="Restaurando sua montagem…"
              english="Restoring your puzzle…"
            />
          </h1>
        </div>
      }
    >
      <ResumeGame />
    </Suspense>
  );
}
