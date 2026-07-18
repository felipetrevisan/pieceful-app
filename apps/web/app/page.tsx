"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { RecentPuzzleBackdrop } from "@/components/recent-puzzle-backdrop";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useI18n } from "@/lib/i18n";

const journey = [
  {
    icon: "upload" as const,
    title: "Envie sua foto",
    englishTitle: "Upload your photo",
    text: "Escolha aquela memória especial. O recorte acontece com privacidade no seu dispositivo.",
    englishText: "Choose a special memory. Cropping happens privately on your device.",
  },
  {
    icon: "grid" as const,
    title: "Escolha o desafio",
    englishTitle: "Choose the challenge",
    text: "De 12 a 1.000 peças, ajuste o nível ao seu momento de foco e relaxamento.",
    englishText: "From 12 to 1,000 pieces, match the challenge to your focus and relaxation.",
  },
  {
    icon: "puzzle" as const,
    title: "Abra a caixa e monte",
    englishTitle: "Open the box and play",
    text: "Sinta a textura das peças, use bandejas e acompanhe cada conquista.",
    englishText: "Feel the pieces, use trays and follow every achievement.",
  },
];

export default function Home() {
  const { language, t } = useI18n();
  return (
    <div className="site-shell home-shell">
      <RecentPuzzleBackdrop />
      <SiteHeader active="home" />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Icon name="sparkle" size={14} /> {t("NOVA EXPERIÊNCIA", "A NEW EXPERIENCE")}
            </span>
            <h1>
              {t("Transforme suas fotos", "Turn your photos")}
              <br />
              {t("em", "into")} <span>{t("quebra-cabeças", "puzzles")}</span>
            </h1>
            <p>
              {t(
                "Traga suas memórias à vida com uma experiência tátil e imersiva. Construa, peça por peça, seus momentos favoritos em um ambiente digital deslumbrante.",
                "Bring your memories to life with a tactile, immersive experience. Rebuild your favorite moments piece by piece in a beautiful digital space.",
              )}
            </p>
            <Link href="/create" className="primary-button">
              <Icon name="play" size={16} /> {t("Criar meu quebra-cabeça", "Create my puzzle")}
            </Link>
          </div>
          <div
            className="hero-art"
            role="img"
            aria-label={t(
              "Ilustração de uma caixa de quebra-cabeça",
              "Illustration of a puzzle box",
            )}
          >
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="floating-piece">
              <Icon name="puzzle" size={30} />
            </div>
            <div className="puzzle-cube">
              <div className="cube-top">
                <span />
              </div>
              <div className="cube-side">
                <i />
                <i />
                <i />
              </div>
              <div className="cube-face cube-front">
                <span className="cube-kicker">{t("EDIÇÃO PESSOAL", "PERSONAL EDITION")}</span>
                <div className="cube-mark">
                  <Icon name="puzzle" size={38} />
                </div>
                <strong>Pieceful</strong>
                <small>{t("Uma memória em cada peça", "A memory in every piece")}</small>
              </div>
            </div>
          </div>
        </section>
        <section className="journey">
          <h2>{t("A jornada da montagem", "The puzzle journey")}</h2>
          <div className="journey-grid">
            {journey.map((item, index) => (
              <article className="glass-card" key={item.title}>
                <span className={`step step-${index + 1}`}>{index + 1}</span>
                <span className="card-icon">
                  <Icon name={item.icon} />
                </span>
                <h3>{language === "en" ? item.englishTitle : item.title}</h3>
                <p>{language === "en" ? item.englishText : item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
