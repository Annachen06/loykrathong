import { useEffect, useRef, useState } from "react";
import type { FestivalConfig, VisitorLook } from "../festivals/types";
import { drawPerson } from "../engine/person";

type Props = { config: FestivalConfig; onEnter: (look: VisitorLook) => void; hidden: boolean };

// Everyone dresses as they like: body shape, clothes and hair are separate choices, with no "man" or "woman" button.
const BODIES: { id: VisitorLook["figure"]; label: string }[] = [
  { id: "man", label: "ทรงตรง" },
  { id: "woman", label: "ทรงเว้า" },
];
const OUTFITS: { id: VisitorLook["outfit"]; label: string }[] = [
  { id: "pha-sin", label: "ผ้าซิ่น" },
  { id: "dress", label: "ชุดเดรส" },
  { id: "blouse-skirt", label: "เสื้อ+กระโปรง" },
  { id: "blouse-pants", label: "เสื้อ+กางเกง" },
  { id: "shirt-pants", label: "เชิ้ต+กางเกง" },
  { id: "shirt-shorts", label: "เชิ้ต+ขาสั้น" },
];
const HAIRS: { id: VisitorLook["hairStyle"]; label: string }[] = [
  { id: "crop", label: "สั้นเกรียน" },
  { id: "short", label: "สั้น" },
  { id: "bob", label: "บ๊อบ" },
  { id: "ponytail", label: "หางม้า" },
  { id: "long", label: "ยาว" },
  { id: "bun", label: "มวย" },
];
const SKINS = ["#f6d2b8", "#eec1a0", "#e0aa84", "#c98e68", "#b07a56", "#8a5a3e"];
const HAIR_COLORS = ["#1c1418", "#3a2420", "#6a4030", "#b8b4bc", "#c86a9a", "#4a6ac8"];
/** Clothes colours: top, bottom, trim. */
const PALETTES: [string, string, string][] = [
  ["#ffd27a", "#ef6f8e", "#fff0b8"],
  ["#3fa7a0", "#c8b48a", "#ffe08a"],
  ["#c9b6ff", "#2f6a52", "#e8c066"],
  ["#ef8fb0", "#4a6aa0", "#fff4e2"],
  ["#5a7ad0", "#d8c49a", "#c8d8ff"],
  ["#fff4e2", "#7a4ab0", "#ffcf6e"],
  ["#33303c", "#2e3a6a", "#ef6f8e"],
];
type PatternId = NonNullable<VisitorLook["pattern"]> | "plain";
const PATTERNS: { id: PatternId; label: string }[] = [
  { id: "plain", label: "เรียบ" },
  { id: "floral", label: "ลายดอก" },
  { id: "stripes", label: "ลายทาง" },
  { id: "plaid", label: "ลายสก็อต" },
];

const STORE_KEY = "fair-look";
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

function tidy(look: VisitorLook): VisitorLook {
  // shirts get a collar; everything else keeps its own neckline
  return { ...look, collar: look.outfit.startsWith("shirt"), sleeves: look.outfit === "pha-sin" ? look.sleeves ?? "short" : "short" };
}

function randomLook(base: VisitorLook): VisitorLook {
  const [top, bottom, accent] = pick(PALETTES);
  const pattern = pick(PATTERNS).id;
  return tidy({
    ...base,
    figure: pick(BODIES).id,
    outfit: pick(OUTFITS).id,
    hairStyle: pick(HAIRS).id,
    skin: pick(SKINS),
    hair: pick(HAIR_COLORS.slice(0, 4)),
    top, bottom, accent,
    pattern: pattern === "plain" ? undefined : pattern,
    flower: Math.random() < 0.35,
    glasses: Math.random() < 0.2,
  });
}

function savedLook(fallback: VisitorLook): VisitorLook {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...fallback, ...(JSON.parse(raw) as Partial<VisitorLook>) };
  } catch {
    /* storage may be blocked */
  }
  return fallback;
}

/** The first moment: the world is already alive behind a soft veil. Make your character, then step in. */
export function Intro({ config, onEnter, hidden }: Props) {
  const [look, setLook] = useState<VisitorLook>(() => savedLook(config.visitors[0].look));
  const set = (patch: Partial<VisitorLook>) => setLook((l) => tidy({ ...l, ...patch }));
  const enter = () => {
    if (hidden) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(look)); } catch { /* ignore */ }
    onEnter(look);
  };
  const tab = hidden ? -1 : 0;
  const palette = PALETTES.findIndex(([t, b]) => t === look.top && b === look.bottom);

  return (
    <section className="intro" aria-hidden={hidden} aria-labelledby="intro-title">
      <div className="intro-inner">
        <p className="intro-eyebrow">{config.intro.eyebrow}</p>
        <h1 id="intro-title">{config.brand}</h1>
        <p className="intro-tagline">{config.tagline}</p>
        <p className="intro-edition">{config.edition}</p>
        <p className="intro-pick">{config.intro.pickLabel}</p>
        <div className="look-maker">
          <div className="look-preview">
            <Portrait look={look} />
            <button type="button" className="look-random" tabIndex={tab} onClick={() => setLook(randomLook(look))}>
              สุ่มลุค
            </button>
          </div>
          <div className="look-options">
            <Choice label="รูปร่าง" items={BODIES} value={look.figure} onPick={(figure) => set({ figure })} tab={tab} />
            <Choice label="ชุด" items={OUTFITS} value={look.outfit} onPick={(outfit) => set({ outfit })} tab={tab} />
            <Choice label="ลาย" items={PATTERNS} value={look.pattern ?? "plain"} onPick={(p: PatternId) => set({ pattern: p === "plain" ? undefined : p })} tab={tab} />
            <Choice label="ทรงผม" items={HAIRS} value={look.hairStyle} onPick={(hairStyle) => set({ hairStyle })} tab={tab} />
            <Swatches label="สีผิว" colors={SKINS} value={look.skin} onPick={(skin) => set({ skin })} tab={tab} />
            <Swatches label="สีผม" colors={HAIR_COLORS} value={look.hair} onPick={(hair) => set({ hair })} tab={tab} />
            <div className="look-row" role="radiogroup" aria-label="สีชุด">
              <span className="look-label">สีชุด</span>
              <div className="look-chips">
                {PALETTES.map(([top, bottom, accent], i) => (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={palette === i}
                    aria-label={`สีชุดแบบที่ ${i + 1}`}
                    tabIndex={tab}
                    className={`look-swatch duo ${palette === i ? "on" : ""}`}
                    style={{ background: `linear-gradient(135deg, ${top} 50%, ${bottom} 50%)` }}
                    onClick={() => set({ top, bottom, accent })}
                  />
                ))}
              </div>
            </div>
            <div className="look-row">
              <span className="look-label">เครื่องประดับ</span>
              <div className="look-chips">
                <button type="button" tabIndex={tab} aria-pressed={!!look.flower} className={`look-chip ${look.flower ? "on" : ""}`} onClick={() => set({ flower: !look.flower })}>
                  ทัดดอกไม้
                </button>
                <button type="button" tabIndex={tab} aria-pressed={!!look.glasses} className={`look-chip ${look.glasses ? "on" : ""}`} onClick={() => set({ glasses: !look.glasses })}>
                  แว่นตา
                </button>
              </div>
            </div>
          </div>
        </div>
        <button type="button" className="intro-enter" tabIndex={tab} onClick={enter}>
          {config.intro.enterLabel}
        </button>
        <p className="intro-help">{config.intro.help}</p>
      </div>
    </section>
  );
}

function Choice<T extends string>({ label, items, value, onPick, tab }: { label: string; items: { id: T; label: string }[]; value: T; onPick: (v: T) => void; tab: number }) {
  return (
    <div className="look-row" role="radiogroup" aria-label={label}>
      <span className="look-label">{label}</span>
      <div className="look-chips">
        {items.map((it) => (
          <button key={it.id} type="button" role="radio" aria-checked={value === it.id} tabIndex={tab} data-look={it.id} className={`look-chip ${value === it.id ? "on" : ""}`} onClick={() => onPick(it.id)}>
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatches({ label, colors, value, onPick, tab }: { label: string; colors: string[]; value: string; onPick: (c: string) => void; tab: number }) {
  return (
    <div className="look-row" role="radiogroup" aria-label={label}>
      <span className="look-label">{label}</span>
      <div className="look-chips">
        {colors.map((c, i) => (
          <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={`${label}แบบที่ ${i + 1}`} tabIndex={tab} className={`look-swatch ${value === c ? "on" : ""}`} style={{ background: c }} onClick={() => onPick(c)} />
        ))}
      </div>
    </div>
  );
}

/** A standing picture of the character, drawn with the same code as in the world. */
function Portrait({ look }: { look: VisitorLook }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 96 * dpr;
    c.height = 132 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 96, 132);
    drawPerson(ctx, 48, 124, 1.55, 1, 0, 0, 1, look);
  }, [look]);
  return <canvas ref={ref} className="intro-portrait" width={96} height={132} aria-label="หน้าตาตัวละครของคุณ" role="img" />;
}
