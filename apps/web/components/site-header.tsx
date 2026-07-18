"use client";

import Link from "next/link";
import { type FocusEvent, type PointerEvent, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Icon } from "./icons";

type HeaderRoute = "home" | "create" | "puzzles" | "achievements" | "settings";

const navigation: {
  key: HeaderRoute;
  href: string;
  label: string;
  englishLabel: string;
  description: string;
  englishDescription: string;
  icon: "puzzle" | "sparkle" | "folder" | "play" | "settings";
}[] = [
  {
    key: "home",
    href: "/",
    label: "Início",
    englishLabel: "Home",
    description: "Voltar ao começo",
    englishDescription: "Back to the beginning",
    icon: "puzzle",
  },
  {
    key: "create",
    href: "/create",
    label: "Criar",
    englishLabel: "Create",
    description: "Nova memória",
    englishDescription: "New memory",
    icon: "sparkle",
  },
  {
    key: "puzzles",
    href: "/puzzles",
    label: "Meus quebra-cabeças",
    englishLabel: "My puzzles",
    description: "Sua coleção",
    englishDescription: "Your collection",
    icon: "folder",
  },
  {
    key: "achievements",
    href: "/achievements",
    label: "Conquistas",
    englishLabel: "Achievements",
    description: "Veja seu progresso",
    englishDescription: "See your progress",
    icon: "play",
  },
  {
    key: "settings",
    href: "/settings",
    label: "Configurações",
    englishLabel: "Settings",
    description: "Deixe do seu jeito",
    englishDescription: "Make it yours",
    icon: "settings",
  },
];

interface HighlightPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

function NavigationMenu({
  active,
  mobile = false,
}: {
  active?: HeaderRoute | undefined;
  mobile?: boolean | undefined;
}) {
  const { language, t } = useI18n();
  const [highlight, setHighlight] = useState<HighlightPosition>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
  });

  function reveal(event: PointerEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>) {
    const link = event.currentTarget;
    const inset = mobile ? 4 : 13;
    setHighlight({
      x: link.offsetLeft,
      y: link.offsetTop + inset,
      width: link.offsetWidth,
      height: Math.max(0, link.offsetHeight - inset * 2),
      visible: true,
    });
  }

  function hide() {
    setHighlight((current) => ({ ...current, visible: false }));
  }

  return (
    <nav
      className={mobile ? "mobile-navigation-links" : "desktop-navigation"}
      aria-label={
        mobile
          ? t("Navegação mobile", "Mobile navigation")
          : t("Navegação principal", "Main navigation")
      }
      onPointerLeave={(event) => {
        if (!event.currentTarget.contains(document.activeElement)) hide();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hide();
      }}
    >
      <span
        className={`nav-hover-highlight ${highlight.visible ? "visible" : ""}`}
        aria-hidden="true"
        style={{
          width: highlight.width,
          height: highlight.height,
          transform: `translate3d(${highlight.x}px, ${highlight.y}px, 0)`,
        }}
      />
      {mobile && (
        <span className="mobile-menu-heading">
          <small>{t("EXPLORE", "EXPLORE")}</small>
          <strong>{t("Seu espaço Pieceful", "Your Pieceful space")}</strong>
        </span>
      )}
      {navigation.map((item) => (
        <Link
          key={item.key}
          className={active === item.key ? "active" : ""}
          href={item.href}
          onPointerEnter={reveal}
          onFocus={reveal}
        >
          {mobile ? (
            <>
              <span className="mobile-menu-icon">
                <Icon name={item.icon} size={19} />
              </span>
              <span className="mobile-menu-label">
                <strong>{language === "en" ? item.englishLabel : item.label}</strong>
                <small>{language === "en" ? item.englishDescription : item.description}</small>
              </span>
              <span className="mobile-menu-arrow" aria-hidden="true">
                →
              </span>
            </>
          ) : language === "en" ? (
            item.englishLabel
          ) : (
            item.label
          )}
        </Link>
      ))}
    </nav>
  );
}

export function SiteHeader({ active }: { active?: HeaderRoute }) {
  const { t } = useI18n();
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">
          <Icon name="puzzle" size={18} />
        </span>{" "}
        Pieceful
      </Link>
      <NavigationMenu active={active} />
      <details className="mobile-navigation">
        <summary aria-label={t("Abrir menu de navegação", "Open navigation menu")}>
          <span aria-hidden="true" className="menu-lines">
            <i />
            <i />
            <i />
          </span>
        </summary>
        <NavigationMenu active={active} mobile />
      </details>
      <a
        className="icon-button"
        href="/settings"
        aria-label={t("Abrir configurações", "Open settings")}
        title={t("Configurações", "Settings")}
      >
        <Icon name="settings" size={18} />
      </a>
    </header>
  );
}
