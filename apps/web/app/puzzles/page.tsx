import { SavedPuzzles } from "@/components/saved-puzzles";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function MyPuzzlesPage() {
  return (
    <div className="site-shell">
      <SiteHeader active="puzzles" />
      <main className="content-page">
        <span className="section-kicker">SUA COLEÇÃO</span>
        <h1>Meus quebra-cabeças</h1>
        <p>Continue de onde parou ou revisite uma memória já montada.</p>
        <SavedPuzzles />
      </main>
      <SiteFooter />
    </div>
  );
}
