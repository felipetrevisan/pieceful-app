import { SavedPuzzles } from "@/components/saved-puzzles";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LocalizedText } from "@/lib/i18n";

export default function MyPuzzlesPage() {
  return (
    <div className="site-shell">
      <SiteHeader active="puzzles" />
      <main className="content-page">
        <span className="section-kicker">
          <LocalizedText portuguese="SUA COLEÇÃO" english="YOUR COLLECTION" />
        </span>
        <h1>
          <LocalizedText portuguese="Meus quebra-cabeças" english="My puzzles" />
        </h1>
        <p>
          <LocalizedText
            portuguese="Continue de onde parou ou revisite uma memória já montada."
            english="Continue where you left off or revisit a completed memory."
          />
        </p>
        <SavedPuzzles />
      </main>
      <SiteFooter />
    </div>
  );
}
