import { SettingsPanel } from "@/components/settings-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LocalizedText } from "@/lib/i18n";

export default function SettingsPage() {
  return (
    <div className="site-shell">
      <SiteHeader active="settings" />
      <main className="content-page">
        <span className="section-kicker">
          <LocalizedText portuguese="SEU JEITO DE JOGAR" english="PLAY YOUR WAY" />
        </span>
        <h1>
          <LocalizedText portuguese="Configurações" english="Settings" />
        </h1>
        <p>
          <LocalizedText
            portuguese="Personalize temas, sons, movimento, contraste e encaixe das peças."
            english="Customize themes, sounds, motion, contrast and piece snapping."
          />
        </p>
        <SettingsPanel />
      </main>
      <SiteFooter />
    </div>
  );
}
