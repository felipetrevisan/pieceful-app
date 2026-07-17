import Link from "next/link";
import { Icon } from "./icons";

type HeaderRoute = "home" | "create" | "puzzles" | "achievements" | "settings";

const navigation: { key: HeaderRoute; href: string; label: string }[] = [
  { key: "home", href: "/", label: "Início" },
  { key: "create", href: "/create", label: "Criar" },
  { key: "puzzles", href: "/puzzles", label: "Meus quebra-cabeças" },
  { key: "achievements", href: "/achievements", label: "Conquistas" },
  { key: "settings", href: "/settings", label: "Configurações" },
];

export function SiteHeader({ active }: { active?: HeaderRoute }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">
          <Icon name="puzzle" size={18} />
        </span>{" "}
        Pieceful
      </Link>
      <nav className="desktop-navigation" aria-label="Navegação principal">
        {navigation.map((item) => (
          <Link key={item.key} className={active === item.key ? "active" : ""} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <details className="mobile-navigation">
        <summary aria-label="Abrir menu de navegação">
          <span aria-hidden="true" className="menu-lines">
            <i />
            <i />
            <i />
          </span>
        </summary>
        <nav aria-label="Navegação mobile">
          {navigation.map((item) => (
            <Link key={item.key} className={active === item.key ? "active" : ""} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </details>
      <a
        className="icon-button"
        href="/settings"
        aria-label="Abrir configurações"
        title="Configurações"
      >
        <Icon name="settings" size={18} />
      </a>
    </header>
  );
}
