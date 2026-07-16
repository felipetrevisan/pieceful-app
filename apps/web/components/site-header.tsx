import Link from "next/link";
import { Icon } from "./icons";

export function SiteHeader({ active }: { active?: "inicio" | "criar" | "meus" | "config" }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">
          <Icon name="puzzle" size={18} />
        </span>{" "}
        Meu Quebra-Cabeça
      </Link>
      <nav aria-label="Navegação principal">
        <Link className={active === "inicio" ? "active" : ""} href="/">
          Início
        </Link>
        <Link className={active === "criar" ? "active" : ""} href="/criar">
          Criar
        </Link>
        <Link className={active === "meus" ? "active" : ""} href="/meus-quebra-cabecas">
          Meus quebra-cabeças
        </Link>
        <Link className={active === "config" ? "active" : ""} href="/configuracoes">
          Configurações
        </Link>
      </nav>
      <a
        className="icon-button"
        href="/configuracoes"
        aria-label="Abrir configurações"
        title="Configurações"
      >
        <Icon name="settings" size={18} />
      </a>
    </header>
  );
}
