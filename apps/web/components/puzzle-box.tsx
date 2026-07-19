"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Icon } from "./icons";

interface Props {
  imageUrl: string;
  pieces: number;
  difficulty: string;
  aspectRatio: number;
  onOpened: () => void;
}

export function PuzzleBox({ imageUrl, pieces, difficulty, aspectRatio, onOpened }: Props) {
  const { locale, t } = useI18n();
  const sceneRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLButtonElement>(null);
  const lidRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const [opening, setOpening] = useState(false);
  const particleKeys = Array.from(
    { length: pieces > 150 ? 34 : Math.min(pieces, 48) },
    (_, index) => `particula-${index + 1}`,
  );

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.from(boxRef.current, {
        y: 90,
        opacity: 0,
        rotateX: -12,
        duration: 1.1,
        ease: "power3.out",
      });
    }, sceneRef);
    return () => context.revert();
  }, []);

  function open() {
    if (opening) return;
    setOpening(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeline = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: onOpened });
    if (reduce) {
      timeline.to(sceneRef.current, { opacity: 0, duration: 0.25 });
      return;
    }
    timeline
      .to(boxRef.current, { y: -18, rotateX: 7, rotateZ: -1.5, duration: 0.45 })
      .to(boxRef.current, { x: -5, duration: 0.07, repeat: 5, yoyo: true })
      .to(lidRef.current, { y: -170, rotateX: -55, rotateZ: 8, scale: 1.08, duration: 1 }, ">-0.1")
      .to(
        particlesRef.current?.children ?? [],
        {
          opacity: 1,
          x: () => gsap.utils.random(-280, 280),
          y: () => gsap.utils.random(-190, 130),
          rotate: () => gsap.utils.random(-180, 180),
          stagger: 0.035,
          duration: 0.9,
        },
        "<",
      )
      .to(sceneRef.current, { opacity: 0, scale: 1.06, duration: 0.5 }, ">-0.2");
  }

  return (
    <section className="box-scene" ref={sceneRef}>
      <div className="box-copy">
        <span className="eyebrow">
          <Icon name="sparkle" size={14} />{" "}
          {t("SUA EXPERIÊNCIA ESTÁ PRONTA", "YOUR EXPERIENCE IS READY")}
        </span>
        <h1>
          Uma memória.
          <br />
          <span>
            {pieces.toLocaleString(locale)} {t("novas peças.", "new pieces.")}
          </span>
        </h1>
        <p>
          {t(
            "Abra a caixa para espalhar as peças e começar a montagem.",
            "Open the box to spread out the pieces and start playing.",
          )}
        </p>
      </div>
      <div className="box-stage">
        <div ref={particlesRef} className="box-particles">
          {particleKeys.map((key) => (
            <i key={key} />
          ))}
        </div>
        <button
          ref={boxRef}
          type="button"
          className={`puzzle-box ${aspectRatio < 1 ? "portrait" : "landscape"}`}
          onClick={open}
          aria-label={t("Abrir a caixa do quebra-cabeça", "Open the puzzle box")}
        >
          <span className="box-floor" />
          <div className="box-depth" aria-hidden="true">
            <span className="box-depth-side" />
            <span className="box-depth-bottom" />
          </div>
          <div ref={lidRef} className="box-lid">
            <img src={imageUrl} alt="" />
            <span className="box-lid-shade" />
            <span className="box-edition">{t("EDIÇÃO ÚNICA", "ONE-OF-A-KIND")}</span>
            <span className="box-brand">
              <Icon name="puzzle" size={22} />
              <strong>PIECEFUL</strong>
              <small>{t("feito com a sua memória", "made from your memory")}</small>
            </span>
          </div>
          <div className="box-base">
            <span className="box-base-rim" />
            <span className="box-base-copy">
              <strong>{t("Minha memória especial", "My special memory")}</strong>
              <span>
                {pieces.toLocaleString(locale)} {t("peças", "pieces")} · {difficulty}
              </span>
            </span>
            <small className="box-open-label">
              {opening
                ? t(
                    `Organizando suas ${pieces.toLocaleString(locale)} peças…`,
                    `Organizing your ${pieces.toLocaleString(locale)} pieces…`,
                  )
                : t("Clique para abrir", "Click to open")}
            </small>
          </div>
        </button>
      </div>
    </section>
  );
}
