// Static artwork for the Loy Krathong world, drawn once per resize into two cached layers.
// Style rules: rounded shapes, one dark-indigo outline colour on near objects,
// soft pastel fills, warm lantern light against a deep-blue night.
import { glow, lerp, seeded } from "../../engine/math";
import { W, H, HORIZON, SHORE, PIER, OUTLINE } from "./world";

/** Light sources that the animated layer makes flicker. Filled while painting. */
export const lights = {
  lamps: [] as { x: number; y: number; r: number; kind: "lamp" | "lantern" | "window" }[],
  torches: [] as { x: number; y: number }[],
};

function outlined(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, path: () => void, width = 2.5) {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = width;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = "round";
  ctx.stroke();
}

// ---------------------------------------------------------------- back layer

function sky(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, "#081046");
  g.addColorStop(0.45, "#16257a");
  g.addColorStop(0.8, "#3a3f9a");
  g.addColorStop(1, "#8a6cb8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON + 2);

  const warm = ctx.createLinearGradient(0, HORIZON - 170, 0, HORIZON);
  warm.addColorStop(0, "rgba(255,170,150,0)");
  warm.addColorStop(1, "rgba(255,170,150,0.28)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, HORIZON - 170, W, 172);

  // faint band of star dust
  const r = seeded(7);
  for (let i = 0; i < 1300; i++) {
    const t = r();
    const x = t * W;
    const y = 50 + t * 240 + (r() - 0.5) * 150 * (0.5 + r());
    ctx.fillStyle = `rgba(210,220,255,${0.03 + r() * 0.07})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // thin wisps of cloud catching moonlight
  for (const [x, y, w] of [[860, 250, 260], [1880, 130, 200], [2150, 340, 240], [1150, 420, 300]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.12);
    glow(ctx, 0, 0, w, "190,190,245", 0.16);
    ctx.restore();
  }
}

function islands(ctx: CanvasRenderingContext2D) {
  const isle = (x: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, HORIZON + 1);
    ctx.bezierCurveTo(x + w * 0.2, HORIZON - h, x + w * 0.6, HORIZON - h * 1.15, x + w, HORIZON + 1);
    ctx.fill();
  };
  isle(1020, 280, 30, "#2d2f80");
  isle(1250, 150, 16, "#33358a");
  isle(1980, 400, 46, "#2a2b78");
  isle(2270, 220, 24, "#33358a");
  // tiny palms on the far island
  ctx.strokeStyle = "#24256a";
  ctx.lineWidth = 2;
  for (const x of [2120, 2150, 2185]) {
    ctx.beginPath();
    ctx.moveTo(x, HORIZON - 34);
    ctx.lineTo(x + 3, HORIZON - 58);
    ctx.stroke();
    ctx.fillStyle = "#24256a";
    ctx.beginPath();
    ctx.ellipse(x + 3, HORIZON - 60, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function seaBase(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, HORIZON, 0, SHORE + 20);
  g.addColorStop(0, "#5a56b0");
  g.addColorStop(0.12, "#33429a");
  g.addColorStop(1, "#16236a");
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON, W, SHORE - HORIZON + 30);
}

/** Outline of the temple headland. Also used to keep the moon and water behind it. */
export function cliffPath(ctx: CanvasRenderingContext2D) {
  ctx.moveTo(0, SHORE + 10);
  ctx.lineTo(0, 300);
  ctx.bezierCurveTo(120, 280, 230, 330, 330, 360);
  ctx.bezierCurveTo(420, 390, 470, 460, 520, 540);
  ctx.bezierCurveTo(560, 610, 600, 700, 640, SHORE + 10);
  ctx.closePath();
}

function headland(ctx: CanvasRenderingContext2D) {
  const cliff = () => cliffPath(ctx);
  const g = ctx.createLinearGradient(0, 300, 0, SHORE);
  g.addColorStop(0, "#232a74");
  g.addColorStop(1, "#151a52");
  ctx.fillStyle = g;
  ctx.beginPath();
  cliff();
  ctx.fill();
  ctx.strokeStyle = "rgba(190,200,255,0.25)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 300);
  ctx.bezierCurveTo(120, 280, 230, 330, 330, 360);
  ctx.bezierCurveTo(420, 390, 470, 460, 520, 540);
  ctx.stroke();

  // round, bushy trees
  const r = seeded(21);
  for (let i = 0; i < 24; i++) {
    const x = 10 + r() * 480;
    const top = x < 330 ? 300 + (x / 330) * 60 : 360 + ((x - 330) / 190) * 180;
    const s = 18 + r() * 22;
    ctx.fillStyle = i % 3 ? "#1b2266" : "#202a72";
    ctx.beginPath();
    ctx.arc(x, top + 8, s, Math.PI, 0);
    ctx.fill();
  }

  temple(ctx, 215, 318);

  // lit stairway down to the beach
  const steps: [number, number][] = [[300, 352], [380, 420], [330, 480], [470, 560], [420, 640], [540, 720], [500, 800]];
  ctx.strokeStyle = "rgba(255,207,110,0.4)";
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  steps.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.setLineDash([]);
  for (const [x, y] of steps) lights.torches.push({ x, y: y - 6 });
}

function temple(ctx: CanvasRenderingContext2D, x: number, base: number) {
  const gold = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
  gold.addColorStop(0, "#7a6aa8");
  gold.addColorStop(0.55, "#f0d9a0");
  gold.addColorStop(1, "#9a80b0");
  ctx.fillStyle = "#3a3a8a";
  ctx.beginPath();
  ctx.roundRect(x - 72, base - 22, 144, 22, 6);
  ctx.roundRect(x - 54, base - 40, 108, 20, 6);
  ctx.fill();
  // chedi with soft round bell and stacked rings
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.moveTo(x - 52, base - 40);
  ctx.bezierCurveTo(x - 54, base - 118, x - 14, base - 134, x - 8, base - 150);
  ctx.lineTo(x + 8, base - 150);
  ctx.bezierCurveTo(x + 14, base - 134, x + 54, base - 118, x + 52, base - 40);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const w = 10 - i * 1.3;
    ctx.beginPath();
    ctx.roundRect(x - w, base - 158 - i * 10, w * 2, 7, 3);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x - 3, base - 216);
  ctx.lineTo(x, base - 250);
  ctx.lineTo(x + 3, base - 216);
  ctx.fill();

  // small hall with tiered roof
  const hx = x + 112;
  ctx.fillStyle = "#30307a";
  ctx.fillRect(hx - 46, base - 46, 92, 46);
  ctx.fillStyle = "#c0506e";
  for (let t = 0; t < 3; t++) {
    const w = 70 - t * 16;
    const y = base - 46 - t * 18;
    ctx.beginPath();
    ctx.moveTo(hx - w, y);
    ctx.quadraticCurveTo(hx - w * 0.4, y - 10, hx, y - 30);
    ctx.quadraticCurveTo(hx + w * 0.4, y - 10, hx + w, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "#f0d9a0";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hx, base - 112);
  ctx.quadraticCurveTo(hx + 6, base - 128, hx + 13, base - 121);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,200,120,0.9)";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.roundRect(hx + i * 24 - 5, base - 34, 10, 20, [5, 5, 0, 0]);
    ctx.fill();
  }
  lights.lamps.push({ x: hx, y: base - 24, r: 70, kind: "window" });
  lights.lamps.push({ x, y: base - 90, r: 120, kind: "window" });
}

// ---------------------------------------------------------------- front layer

function sand(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, SHORE - 10, 0, H);
  g.addColorStop(0, "#a48cc4");
  g.addColorStop(0.3, "#8a74b4");
  g.addColorStop(1, "#4e3f86");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, SHORE);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, shoreY(x));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  const r = seeded(3);
  for (let i = 0; i < 2200; i++) {
    const x = r() * W;
    const y = SHORE + 10 + r() * (H - SHORE);
    ctx.fillStyle = `rgba(255,236,220,${0.04 + r() * 0.08})`;
    ctx.fillRect(x, y, 1.8, 1.8);
  }
  const wet = ctx.createLinearGradient(0, SHORE, 0, SHORE + 36);
  wet.addColorStop(0, "rgba(200,205,255,0.35)");
  wet.addColorStop(1, "rgba(200,205,255,0)");
  ctx.fillStyle = wet;
  ctx.fillRect(0, SHORE, W, 36);
}

export const shoreY = (x: number) => SHORE + Math.sin(x * 0.011) * 6 + Math.sin(x * 0.031) * 3;

function pier(ctx: CanvasRenderingContext2D) {
  const p = PIER;
  for (let y = p.y0; y < SHORE; y += 34) {
    outlined(ctx, "#4a3a70", () => {
      ctx.roundRect(p.x0 - 5, y, 8, 26, 3);
      ctx.roundRect(p.x1 - 3, y, 8, 26, 3);
    }, 1.5);
  }
  const deck = ctx.createLinearGradient(0, p.y0, 0, p.y1);
  deck.addColorStop(0, "#b48a9a");
  deck.addColorStop(1, "#d8a8a0");
  outlined(ctx, deck, () => {
    ctx.moveTo(p.x0 + 6, p.y0);
    ctx.lineTo(p.x1 - 6, p.y0);
    ctx.lineTo(p.x1 + 14, p.y1);
    ctx.lineTo(p.x0 - 14, p.y1);
    ctx.closePath();
  });
  ctx.strokeStyle = "rgba(42,29,74,0.35)";
  ctx.lineWidth = 1;
  for (let y = p.y0 + 8; y < p.y1; y += 9) {
    const t = (y - p.y0) / (p.y1 - p.y0);
    ctx.beginPath();
    ctx.moveTo(p.x0 + 6 - t * 20, y);
    ctx.lineTo(p.x1 - 6 + t * 20, y);
    ctx.stroke();
  }
  for (let y = p.y0 + 30; y < p.y1; y += 60) {
    const t = (y - p.y0) / (p.y1 - p.y0);
    for (const side of [-1, 1]) {
      const x = side < 0 ? p.x0 + 3 - t * 20 : p.x1 - 3 + t * 20;
      outlined(ctx, "#4a3a70", () => ctx.roundRect(x - 2, y - 32, 4, 32, 2), 1.2);
      lights.lamps.push({ x, y: y - 36, r: 26, kind: "lamp" });
    }
  }
  // little sala at the end of the pier
  const cx = (p.x0 + p.x1) / 2;
  outlined(ctx, "#4a3a70", () => {
    ctx.roundRect(p.x0 - 6, p.y0 - 34, 5, 36, 2);
    ctx.roundRect(p.x1 + 1, p.y0 - 34, 5, 36, 2);
  }, 1.5);
  outlined(ctx, "#ef6f8e", () => {
    ctx.moveTo(p.x0 - 22, p.y0 - 30);
    ctx.quadraticCurveTo(cx - 14, p.y0 - 40, cx, p.y0 - 66);
    ctx.quadraticCurveTo(cx + 14, p.y0 - 40, p.x1 + 22, p.y0 - 30);
    ctx.closePath();
  });
  lights.lamps.push({ x: cx, y: p.y0 - 24, r: 40, kind: "lantern" });
}

type StallOpts = { h?: number; goods?: "flowers" | "garlands" | "buds" };

function stall(ctx: CanvasRenderingContext2D, x: number, w: number, base: number, stripes: [string, string], opts: StallOpts = {}) {
  const h = opts.h ?? 96;
  // posts
  outlined(ctx, "#6a4a7a", () => {
    ctx.roundRect(x + 2, base - h, 6, h, 3);
    ctx.roundRect(x + w - 8, base - h, 6, h, 3);
  }, 2);
  // warm light under the awning
  const g = ctx.createLinearGradient(0, base - h + 20, 0, base - 36);
  g.addColorStop(0, "rgba(255,200,130,0.45)");
  g.addColorStop(1, "rgba(255,200,130,0.08)");
  ctx.fillStyle = g;
  ctx.fillRect(x + 8, base - h + 20, w - 16, h - 56);

  // goods on the counter
  const r = seeded(Math.round(x));
  if (opts.goods === "flowers") {
    for (let i = 0; i < 4; i++) {
      const bx = x + 18 + i * ((w - 36) / 3);
      outlined(ctx, "#7a9ad0", () => ctx.roundRect(bx - 9, base - 52, 18, 16, 4), 1.8);
      for (let f = 0; f < 4; f++) {
        ctx.fillStyle = ["#ffb347", "#fff2f6", "#ff8fb1", "#ffd84a"][(i + f) % 4];
        ctx.beginPath();
        ctx.arc(bx - 6 + f * 4, base - 56 - (f % 2) * 4, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (opts.goods === "garlands") {
    for (let i = 0; i < 5; i++) {
      const gx = x + 14 + i * ((w - 28) / 4);
      for (let k = 0; k < 7; k++) {
        ctx.fillStyle = k % 3 === 0 ? "#ff8f3a" : k % 3 === 1 ? "#fff6ea" : "#ffcf6e";
        ctx.beginPath();
        ctx.arc(gx, base - h + 30 + k * 5, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (opts.goods === "buds") {
    for (let i = 0; i < 6; i++) {
      const bx = x + 14 + r() * (w - 28);
      ctx.fillStyle = "#4a9a6a";
      ctx.fillRect(bx - 1, base - 58, 2, 18);
      outlined(ctx, "#ffa8c2", () => ctx.ellipse(bx, base - 60, 5, 8, 0, 0, Math.PI * 2), 1.5);
    }
  }

  // counter
  outlined(ctx, "#8a5a7a", () => ctx.roundRect(x, base - 38, w, 38, 6));
  ctx.fillStyle = "rgba(255,220,180,0.25)";
  ctx.fillRect(x + 4, base - 34, w - 8, 3);

  // scalloped striped awning
  const n = 8;
  const sw = (w + 24) / n;
  const top = base - h;
  for (let i = 0; i < n; i++) {
    outlined(ctx, stripes[i % 2], () => {
      ctx.moveTo(x - 12 + i * sw, top);
      ctx.lineTo(x - 12 + (i + 1) * sw, top);
      ctx.lineTo(x - 12 + (i + 1) * sw, top + 16);
      ctx.quadraticCurveTo(x - 12 + (i + 0.5) * sw, top + 30, x - 12 + i * sw, top + 16);
      ctx.closePath();
    }, 2);
  }
  outlined(ctx, stripes[0], () => ctx.roundRect(x - 16, top - 14, w + 32, 16, 8));

  const lamps = Math.max(2, Math.round(w / 60));
  for (let i = 0; i < lamps; i++) {
    lights.lamps.push({ x: x + ((i + 0.5) / lamps) * w, y: top + 40, r: 40, kind: "lantern" });
  }
}

/** Little banana-leaf krathong: folded leaf petals, lotus, marigold and a candle. */
export function drawKrathong(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, lotus = "#ffa8c2") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = "round";
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  ctx.fillStyle = "#3f9a68";
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#5cc08a";
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    ctx.moveTo(i * 5.4 - 4.5, -1);
    ctx.lineTo(i * 5.4, -11 + Math.abs(i) * 1.2);
    ctx.lineTo(i * 5.4 + 4.5, -1);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lotus;
  ctx.beginPath();
  ctx.ellipse(-6, -11, 4.5, 6, -0.4, 0, Math.PI * 2);
  ctx.ellipse(6, -11, 4.5, 6, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffcf4a";
  ctx.beginPath();
  ctx.arc(0, -13, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff4e2";
  ctx.beginPath();
  ctx.roundRect(-1.6, -26, 3.2, 11, 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function boutique(ctx: CanvasRenderingContext2D, x: number, w: number, base: number) {
  const h = 128;
  const cx = x + w / 2;
  outlined(ctx, "#6a4a7a", () => {
    ctx.roundRect(x + 4, base - h + 20, 8, h - 20, 3);
    ctx.roundRect(x + w - 12, base - h + 20, 8, h - 20, 3);
  }, 2);
  const g = ctx.createLinearGradient(0, base - h + 30, 0, base - 40);
  g.addColorStop(0, "rgba(255,205,140,0.55)");
  g.addColorStop(1, "rgba(255,205,140,0.1)");
  ctx.fillStyle = g;
  ctx.fillRect(x + 12, base - h + 26, w - 24, h - 64);
  // tiered display shelf full of krathongs
  outlined(ctx, "#a06a7a", () => ctx.roundRect(x + 24, base - 82, w - 48, 8, 3), 1.8);
  for (let i = 0; i < 4; i++) drawKrathong(ctx, x + 40 + i * ((w - 80) / 3), base - 84, 0.75, ["#ffa8c2", "#fff2f6", "#c9b6ff", "#ffcf6e"][i]);
  for (let i = 0; i < 3; i++) drawKrathong(ctx, x + 52 + i * ((w - 104) / 2), base - 42, 0.95, ["#c9b6ff", "#ffa8c2", "#fff2f6"][i]);
  outlined(ctx, "#b06a80", () => ctx.roundRect(x, base - 40, w, 40, 7));
  // Thai gable roof with curled chofa finials
  outlined(ctx, "#ef6f8e", () => {
    ctx.moveTo(x - 24, base - h + 26);
    ctx.quadraticCurveTo(cx - w * 0.25, base - h + 10, cx, base - h - 44);
    ctx.quadraticCurveTo(cx + w * 0.25, base - h + 10, x + w + 24, base - h + 26);
    ctx.closePath();
  });
  outlined(ctx, "#ffcf6e", () => {
    ctx.moveTo(x - 8, base - h + 22);
    ctx.quadraticCurveTo(cx - w * 0.2, base - h + 10, cx, base - h - 26);
    ctx.quadraticCurveTo(cx + w * 0.2, base - h + 10, x + w + 8, base - h + 22);
    ctx.closePath();
  }, 2);
  ctx.strokeStyle = "#ffcf6e";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, base - h - 44);
  ctx.quadraticCurveTo(cx + 8, base - h - 60, cx + 14, base - h - 54);
  ctx.stroke();
  // round sign
  outlined(ctx, "#fff4e2", () => ctx.ellipse(cx, base - h + 6, 34, 11, 0, 0, Math.PI * 2), 2);
  ctx.fillStyle = OUTLINE;
  ctx.font = "500 12px Mitr, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ร้านกระทง", cx, base - h + 7);
  for (let i = 0; i < 3; i++) lights.lamps.push({ x: x + 30 + i * ((w - 60) / 2), y: base - h + 44, r: 46, kind: "lantern" });
}

function gate(ctx: CanvasRenderingContext2D, cx: number, base: number) {
  const half = 62, h = 150;
  // bamboo posts wrapped in marigold garlands
  for (const px of [cx - half, cx + half]) {
    outlined(ctx, "#c8a070", () => ctx.roundRect(px - 7, base - h, 14, h, 6));
    for (let y = base - h + 12; y < base - 6; y += 9) {
      ctx.fillStyle = (y / 9) % 2 < 1 ? "#ff8f3a" : "#ffcf6e";
      ctx.beginPath();
      ctx.arc(px, y, 4.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // arched sign
  outlined(ctx, "#ef6f8e", () => {
    ctx.moveTo(cx - half - 22, base - h + 6);
    ctx.quadraticCurveTo(cx, base - h - 56, cx + half + 22, base - h + 6);
    ctx.lineTo(cx + half + 22, base - h + 20);
    ctx.quadraticCurveTo(cx, base - h - 38, cx - half - 22, base - h + 20);
    ctx.closePath();
  });
  ctx.save();
  ctx.fillStyle = "#fff4e2";
  ctx.font = "600 15px Fredoka, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = "MOONKRADE";
  for (let i = 0; i < text.length; i++) {
    const t = (i + 0.5) / text.length;
    const px = lerp(cx - half - 4, cx + half + 4, t);
    const py = base - h + 13 - Math.sin(t * Math.PI) * 23;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((t - 0.5) * 0.7);
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
  // a crescent-and-star topper
  outlined(ctx, "#ffcf6e", () => {
    ctx.arc(cx, base - h - 40, 10, 0.3 * Math.PI, 1.7 * Math.PI, false);
    ctx.arc(cx + 5, base - h - 42, 8, 1.6 * Math.PI, 0.4 * Math.PI, true);
    ctx.closePath();
  }, 1.8);
  // hanging lanterns under the arch
  for (const dx of [-34, 0, 34]) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + dx, base - h + 14 - (dx === 0 ? 26 : 16));
    ctx.lineTo(cx + dx, base - h + 30);
    ctx.stroke();
    lights.lamps.push({ x: cx + dx, y: base - h + 36, r: 34, kind: "lantern" });
  }
}

function memoryCorner(ctx: CanvasRenderingContext2D, x: number, base: number) {
  // little wooden pergola
  outlined(ctx, "#8a6a8a", () => {
    ctx.roundRect(x, base - 128, 8, 128, 3);
    ctx.roundRect(x + 220, base - 128, 8, 128, 3);
  }, 2);
  outlined(ctx, "#a07a9a", () => ctx.roundRect(x - 16, base - 138, 260, 14, 7));
  // flowering vine along the beam
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = i % 2 ? "#ffa8c2" : "#c9b6ff";
    ctx.beginPath();
    ctx.arc(x - 8 + i * 10, base - 124 + Math.sin(i * 1.7) * 4, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // shell-framed board with empty frames waiting for memories
  outlined(ctx, "#fff4e2", () => ctx.roundRect(x + 64, base - 104, 100, 62, 10));
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = "rgba(42,29,74,0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.roundRect(x + 74 + i * 28, base - 94, 22, 30, 4);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (let i = 0; i < 7; i++) {
    const sx = x + 64 + (i / 6) * 100;
    outlined(ctx, i % 2 ? "#ffd0dc" : "#ffe7c2", () => ctx.ellipse(sx, base - 104, 6, 4.5, 0, Math.PI, 0), 1.4);
  }
  outlined(ctx, "#8a6a8a", () => ctx.roundRect(x + 110, base - 42, 8, 42, 3), 1.6);
  // bench
  outlined(ctx, "#c08a8a", () => ctx.roundRect(x + 12, base - 30, 46, 10, 4), 1.8);
  outlined(ctx, "#8a6a8a", () => {
    ctx.roundRect(x + 16, base - 22, 5, 22, 2);
    ctx.roundRect(x + 49, base - 22, 5, 22, 2);
  }, 1.4);
  // potted flowers
  for (const px of [x + 180, x + 200]) {
    outlined(ctx, "#d07a5a", () => ctx.roundRect(px - 8, base - 18, 16, 18, 4), 1.6);
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = ["#ffcf6e", "#ffa8c2", "#fff2f6"][k];
      ctx.beginPath();
      ctx.arc(px - 5 + k * 5, base - 24 - (k % 2) * 5, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const dx of [40, 120, 196]) lights.lamps.push({ x: x + dx, y: base - 110, r: 38, kind: "lantern" });
}

function foregroundFlowers(ctx: CanvasRenderingContext2D) {
  const r = seeded(99);
  const bush = (bx: number, by: number, s: number) => {
    outlined(ctx, "#3a6a6a", () => {
      ctx.arc(bx - 18 * s, by, 22 * s, Math.PI, 0);
      ctx.arc(bx + 14 * s, by - 4 * s, 26 * s, Math.PI, 0);
      ctx.arc(bx + 44 * s, by + 2 * s, 18 * s, Math.PI, 0);
      ctx.closePath();
    }, 2);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = ["#ffa8c2", "#fff2f6", "#ffcf6e"][i % 3];
      ctx.beginPath();
      ctx.arc(bx - 30 * s + r() * 80 * s, by - 8 * s - r() * 22 * s, 4 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  bush(30, H + 4, 1.5);
  bush(1140, H + 10, 1.1);
  bush(2330, H + 6, 1.6);
}

export function paintBack(ctx: CanvasRenderingContext2D) {
  lights.lamps.length = 0;
  lights.torches.length = 0;
  sky(ctx);
  islands(ctx);
  seaBase(ctx);
  headland(ctx);
}

export function paintFront(ctx: CanvasRenderingContext2D) {
  sand(ctx);
  pier(ctx);
  gate(ctx, 430, 812);
  stall(ctx, 650, 120, 806, ["#ffa8c2", "#fff4e2"], { goods: "flowers" });
  stall(ctx, 800, 110, 802, ["#8fd8c8", "#fff4e2"], { goods: "garlands" });
  stall(ctx, 940, 120, 806, ["#c9b6ff", "#fff4e2"], { goods: "buds" });
  boutique(ctx, 1190, 180, 808);
  memoryCorner(ctx, 2050, 812);
  foregroundFlowers(ctx);

  const v = ctx.createLinearGradient(0, H - 110, 0, H);
  v.addColorStop(0, "rgba(10,8,40,0)");
  v.addColorStop(1, "rgba(10,8,40,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, H - 110, W, 110);
}
