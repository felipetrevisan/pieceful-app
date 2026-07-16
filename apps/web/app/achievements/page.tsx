import type { Metadata } from "next";
import { AchievementGallery } from "@/components/achievement-gallery";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Conquistas" };

export default function AchievementsPage() {
  return (
    <div className="site-shell">
      <SiteHeader active="achievements" />
      <main className="content-page">
        <span className="section-kicker">SUA JORNADA</span>
        <h1>Conquistas</h1>
        <p>Complete desafios, acumule pontos e transforme cada montagem em um troféu.</p>
        <AchievementGallery />
      </main>
      <SiteFooter />
    </div>
  );
}
