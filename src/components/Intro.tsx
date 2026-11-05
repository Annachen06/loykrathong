import { useEffect, useRef } from "react";
import type { FestivalConfig, VisitorLook } from "../festivals/types";
import { drawPerson } from "../engine/person";

type Props = { config: FestivalConfig; onEnter: (visitorId?: string) => void; hidden: boolean };

/** The first moment: the world is already alive behind a soft veil.
 *  Pick who you are to step in. A tap anywhere else enters as the first character. */
export function Intro({ config, onEnter, hidden }: Props) {
  return (
    <section className="intro" aria-hidden={hidden} aria-labelledby="intro-title" onClick={hidden ? undefined : () => onEnter()}>
      <div className="intro-inner">
        <p className="intro-eyebrow">{config.intro.eyebrow}</p>
        <h1 id="intro-title">{config.brand}</h1>
        <p className="intro-tagline">{config.tagline}</p>
        <p className="intro-edition">{config.edition}</p>
        <p className="intro-pick">{config.intro.pickLabel}</p>
        <div className="intro-chars">
          {config.visitors.map((v, i) => (
            <button
              key={v.id}
              type="button"
              className="intro-char"
              data-visitor={v.id}
              aria-label={`${config.intro.enterLabel}เป็น${v.label}`}
              tabIndex={hidden ? -1 : 0}
              autoFocus={i === 0}
              onClick={(e) => { e.stopPropagation(); if (!hidden) onEnter(v.id); }}
            >
              <Portrait look={v.look} />
              <span>{v.label}</span>
            </button>
          ))}
        </div>
        <p className="intro-help">{config.intro.help}</p>
      </div>
    </section>
  );
}

/** A small standing picture of the character, drawn with the same code as in the world. */
function Portrait({ look }: { look: VisitorLook }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 72 * dpr;
    c.height = 96 * dpr;
    ctx.scale(dpr, dpr);
    drawPerson(ctx, 36, 90, 1.12, 1, 0, 0, 1, look);
  }, [look]);
  return <canvas ref={ref} className="intro-portrait" width={72} height={96} aria-hidden="true" />;
}
