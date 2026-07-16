import Link from "next/link";
import { Icon } from "./icons";

export function SiteHeader({
  active,
}: {
  active?: "home" | "create" | "puzzles" | "achievements" | "settings";
}) {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">
          <Icon name="puzzle" size={18} />
        </span>{" "}
        Pieceful
      </Link>
      <nav aria-label="Navegação principal">
        <Link className={active === "home" ? "active" : ""} href="/">
          Início
        </Link>
        <Link className={active === "create" ? "active" : ""} href="/create">
          Criar
        </Link>
        <Link className={active === "puzzles" ? "active" : ""} href="/puzzles">
          Meus quebra-cabeças
        </Link>
        <Link className={active === "achievements" ? "active" : ""} href="/achievements">
          Conquistas
        </Link>
        <Link className={active === "settings" ? "active" : ""} href="/settings">
          Configurações
        </Link>
      </nav>
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
