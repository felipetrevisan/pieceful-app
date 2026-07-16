import Link from "next/link";
import { Icon } from "@/components/icons";
import { RecentPuzzleBackdrop } from "@/components/recent-puzzle-backdrop";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const journey = [
  {
    icon: "upload" as const,
    title: "Envie sua foto",
    text: "Escolha aquela memória especial. O recorte acontece com privacidade no seu dispositivo.",
  },
  {
    icon: "grid" as const,
    title: "Escolha o desafio",
    text: "De 12 a 1.000 peças, ajuste o nível ao seu momento de foco e relaxamento.",
  },
  {
    icon: "puzzle" as const,
    title: "Abra a caixa e monte",
    text: "Sinta a textura das peças, use bandejas e acompanhe cada conquista.",
  },
];

export default function Home() {
  return (
    <div className="site-shell home-shell">
      <RecentPuzzleBackdrop />
      <SiteHeader active="inicio" />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <Icon name="sparkle" size={14} /> NOVA EXPERIÊNCIA
            </span>
            <h1>
              Transforme suas fotos
              <br />
              em <span>quebra-cabeças</span>
            </h1>
            <p>
              Traga suas memórias à vida com uma experiência tátil e imersiva. Construa, peça por
              peça, seus momentos favoritos em um ambiente digital deslumbrante.
            </p>
            <Link href="/criar" className="primary-button">
              <Icon name="play" size={16} /> Criar meu quebra-cabeça
            </Link>
          </div>
          <div
            className="hero-art"
            role="img"
            aria-label="Ilustração de uma caixa de quebra-cabeça"
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
                <span className="cube-kicker">EDIÇÃO PESSOAL</span>
                <div className="cube-mark">
                  <Icon name="puzzle" size={38} />
                </div>
                <strong>Pieceful</strong>
                <small>Uma memória em cada peça</small>
              </div>
            </div>
          </div>
        </section>
        <section className="journey">
          <h2>A jornada da montagem</h2>
          <div className="journey-grid">
            {journey.map((item, index) => (
              <article className="glass-card" key={item.title}>
                <span className={`step step-${index + 1}`}>{index + 1}</span>
                <span className="card-icon">
                  <Icon name={item.icon} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
