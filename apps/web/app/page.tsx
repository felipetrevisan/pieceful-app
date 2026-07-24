"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import { Icon } from "@/components/icons";
import { RecentPuzzleBackdrop } from "@/components/recent-puzzle-backdrop";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useI18n } from "@/lib/i18n";
import appIcon from "./icon.png";

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
  const mobileAppTitleId = useId();
  const androidAppUrl =
    process.env.NEXT_PUBLIC_ANDROID_APP_URL ??
    "https://play.google.com/store/apps/details?id=app.perazzo.pieceful";
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
            <div className="hero-actions">
              <Link href="/create" className="primary-button">
                <Icon name="play" size={16} /> {t("Criar meu quebra-cabeça", "Create my puzzle")}
              </Link>
              <a href={androidAppUrl} className="secondary-button" target="_blank" rel="noreferrer">
                <span className="google-play-mark" aria-hidden="true">
                  ▶
                </span>
                {t("Baixar para Android", "Download for Android")}
              </a>
            </div>
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
        <section className="mobile-app-promo" aria-labelledby={mobileAppTitleId}>
          <div className="mobile-app-logo" aria-hidden="true">
            <Image src={appIcon} alt="" priority={false} />
          </div>
          <div className="mobile-app-copy">
            <span className="section-kicker">
              {t("PIECEFUL NO SEU CELULAR", "PIECEFUL ON YOUR PHONE")}
            </span>
            <h2 id={mobileAppTitleId}>
              {t("A melhor experiência para jogar com o toque", "The best touch-first way to play")}
            </h2>
            <p>
              {t(
                "Jogue offline, use gestos nativos, desbloqueie conquistas e baixe aventuras infantis grátis diretamente no app.",
                "Play offline, use native gestures, unlock achievements, and download free kids adventures directly in the app.",
              )}
            </p>
            <ul
              className="mobile-app-features"
              aria-label={t("Recursos do aplicativo", "App features")}
            >
              <li>{t("Funciona offline", "Works offline")}</li>
              <li>{t("Controles por toque", "Touch controls")}</li>
              <li>{t("Pacotes grátis", "Free packs")}</li>
            </ul>
          </div>
          <a
            href={androidAppUrl}
            className="primary-button mobile-app-download"
            target="_blank"
            rel="noreferrer"
          >
            <span className="google-play-mark" aria-hidden="true">
              ▶
            </span>
            <span>
              <small>{t("DISPONÍVEL NO", "GET IT ON")}</small>
              <strong>Google Play</strong>
            </span>
          </a>
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
