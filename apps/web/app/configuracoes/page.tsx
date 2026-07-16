import { SettingsPanel } from "@/components/settings-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function SettingsPage() {
  return (
    <div className="site-shell">
      <SiteHeader active="config" />
      <main className="content-page">
        <span className="section-kicker">SEU JEITO DE JOGAR</span>
        <h1>Configurações</h1>
        <p>Personalize sons, movimento, contraste e encaixe das peças.</p>
        <SettingsPanel />
      </main>
      <SiteFooter />
    </div>
  );
}
