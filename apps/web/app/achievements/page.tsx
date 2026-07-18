import type { Metadata } from "next";
import { AchievementGallery } from "@/components/achievement-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LocalizedText } from "@/lib/i18n";

export const metadata: Metadata = { title: "Conquistas" };

export default function AchievementsPage() {
  return (
    <div className="site-shell">
      <SiteHeader active="achievements" />
      <main className="content-page">
        <span className="section-kicker">
          <LocalizedText portuguese="SUA JORNADA" english="YOUR JOURNEY" />
        </span>
        <h1>
          <LocalizedText portuguese="Conquistas" english="Achievements" />
        </h1>
        <p>
          <LocalizedText
            portuguese="Complete desafios, acumule pontos e transforme cada montagem em um troféu."
            english="Complete challenges, earn points and turn every puzzle into a trophy."
          />
        </p>
        <AchievementGallery />
      </main>
      <SiteFooter />
    </div>
  );
}
