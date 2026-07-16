"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

interface Props {
  imageUrl: string;
  pieces: number;
  difficulty: string;
  onOpened: () => void;
}

export function PuzzleBox({ imageUrl, pieces, difficulty, onOpened }: Props) {
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
          <Icon name="sparkle" size={14} /> SUA EXPERIÊNCIA ESTÁ PRONTA
        </span>
        <h1>
          Uma memória.
          <br />
          <span>{pieces.toLocaleString("pt-BR")} novas peças.</span>
        </h1>
        <p>Abra a caixa para espalhar as peças e começar a montagem.</p>
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
          className="puzzle-box"
          onClick={open}
          aria-label="Abrir a caixa do quebra-cabeça"
        >
          <div ref={lidRef} className="box-lid">
            <img src={imageUrl} alt="" />
            <span>MEU QUEBRA-CABEÇA</span>
          </div>
          <div className="box-base">
            <strong>Minha memória especial</strong>
            <span>
              {pieces.toLocaleString("pt-BR")} peças · {difficulty}
            </span>
            <small>
              {opening
                ? `Organizando suas ${pieces.toLocaleString("pt-BR")} peças…`
                : "Clique para abrir"}
            </small>
          </div>
        </button>
      </div>
    </section>
  );
}
