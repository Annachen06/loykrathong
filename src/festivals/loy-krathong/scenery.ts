// Static artwork for the Loy Krathong world, drawn once per resize into two cached layers.
// Style rules: rounded shapes, one dark-indigo outline colour on near objects,
// soft pastel fills, warm lantern light against a deep-blue night.
import { loyKrathongConfig } from "./config";
import { glow, lerp, seeded } from "../../engine/math";
import { W, H, HORIZON, SHORE, GROUND, PIER, OUTLINE, WHEEL, STAGE, TEMPLE } from "./world";

/** Light sources that the animated layer makes flicker. Filled while painting. */
export const lights = {
  lamps: [] as { x: number; y: number; r: number; kind: "lamp" | "lantern" | "window" }[],
  torches: [] as { x: number; y: number }[],
  bulbs: [] as { x: number; y: number; hue: number }[],
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

/** The land behind the temple: soft hills that reach down to the beach (no overhanging cliff).
 *  Also used to keep the moon and the water behind it. */
export function landPath(ctx: CanvasRenderingContext2D) {
  ctx.moveTo(0, SHORE + 12);
  ctx.lineTo(0, 470);
  ctx.bezierCurveTo(140, 430, 300, 440, 430, 478);
  ctx.bezierCurveTo(560, 515, 660, 545, 760, 560);
  ctx.bezierCurveTo(800, 600, 820, 700, 830, SHORE + 12);
  ctx.closePath();
}

function land(ctx: CanvasRenderingContext2D) {
  // a far ridge, then the near hill the temple stands in front of
  ctx.fillStyle = "#1c2466";
  ctx.beginPath();
  ctx.moveTo(0, 520);
  ctx.bezierCurveTo(120, 380, 260, 360, 420, 420);
  ctx.bezierCurveTo(520, 460, 600, 500, 700, 545);
  ctx.lineTo(0, 545);
  ctx.fill();

  const g = ctx.createLinearGradient(0, 430, 0, SHORE);
  g.addColorStop(0, "#1f3470");
  g.addColorStop(1, "#16245a");
  ctx.fillStyle = g;
  ctx.beginPath();
  landPath(ctx);
  ctx.fill();

  // round trees on the hill
  const r = seeded(21);
  for (let i = 0; i < 30; i++) {
    const x = r() * 800;
    const top = x < 430 ? 470 - (x / 430) * 10 + 20 : 480 + ((x - 430) / 370) * 90;
    const s = 22 + r() * 26;
    ctx.fillStyle = i % 3 ? "#1a2c62" : "#203a70";
    ctx.beginPath();
    ctx.arc(x, top + 14, s, Math.PI, 0);
    ctx.fill();
  }
}

/** A Thai bell-shaped chedi standing on its stepped base, feet on the ground at `base`. */
function chedi(ctx: CanvasRenderingContext2D, x: number, base: number) {
  const white = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
  white.addColorStop(0, "#c9bfdc");
  white.addColorStop(0.45, "#fbf6ea");
  white.addColorStop(1, "#d8cde2");
  const gold = ctx.createLinearGradient(x - 20, 0, x + 20, 0);
  gold.addColorStop(0, "#c8963e");
  gold.addColorStop(0.5, "#ffe08a");
  gold.addColorStop(1, "#c8963e");

  glow(ctx, x, base - 150, 230, "255,214,150", 0.18);

  // three square base tiers (ฐานเขียง)
  let y = base;
  for (const w of [170, 146, 122]) {
    outlined(ctx, white, () => ctx.rect(x - w / 2, y - 16, w, 16), 2);
    y -= 16;
  }
  // lotus base (ฐานบัว) with a gold band
  outlined(ctx, white, () => ctx.roundRect(x - 52, y - 18, 104, 18, 8), 2);
  outlined(ctx, gold, () => ctx.rect(x - 54, y - 10, 108, 4), 1.2);
  y -= 18;
  // the bell (องค์ระฆัง)
  outlined(ctx, white, () => {
    ctx.moveTo(x - 50, y);
    ctx.bezierCurveTo(x - 52, y - 58, x - 30, y - 92, x - 16, y - 100);
    ctx.lineTo(x + 16, y - 100);
    ctx.bezierCurveTo(x + 30, y - 92, x + 52, y - 58, x + 50, y);
    ctx.closePath();
  });
  outlined(ctx, gold, () => ctx.rect(x - 51, y - 8, 102, 5), 1.2);
  y -= 100;
  // square throne (บัลลังก์)
  outlined(ctx, white, () => ctx.rect(x - 20, y - 16, 40, 16), 2);
  outlined(ctx, gold, () => ctx.rect(x - 22, y - 18, 44, 4), 1.2);
  y -= 18;
  // stacked rings (ปล้องไฉน) and the golden spire (ปลียอด)
  for (let i = 0; i < 8; i++) {
    const w = 15 - i * 1.4;
    outlined(ctx, gold, () => ctx.roundRect(x - w, y - 9, w * 2, 9, 4), 1.4);
    y -= 9;
  }
  outlined(ctx, gold, () => {
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x, y - 46);
    ctx.lineTo(x + 4, y);
    ctx.closePath();
  }, 1.4);
  ctx.fillStyle = "#fff2b0";
  ctx.beginPath();
  ctx.arc(x, y - 48, 3.5, 0, Math.PI * 2);
  ctx.fill();
  lights.lamps.push({ x, y: base - 140, r: 150, kind: "window" });
}

/** The ordination hall (อุโบสถ): stepped platform, cream walls, tiered red roof with chofa. */
function ubosot(ctx: CanvasRenderingContext2D, x: number, base: number) {
  const w = 170;
  outlined(ctx, "#e9dfef", () => ctx.rect(x - w / 2 - 14, base - 16, w + 28, 16), 2);
  outlined(ctx, "#fbf3e4", () => ctx.rect(x - w / 2, base - 86, w, 70), 2);
  // columns
  for (let i = 0; i <= 4; i++) outlined(ctx, "#f3e6cf", () => ctx.rect(x - w / 2 + 4 + i * ((w - 14) / 4), base - 86, 8, 70), 1.4);
  // red door with gold frame, lit windows
  outlined(ctx, "#c0392b", () => ctx.roundRect(x - 13, base - 62, 26, 46, [10, 10, 0, 0]), 2);
  ctx.strokeStyle = "#ffcf6e";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 10, base - 58, 20, 42);
  ctx.fillStyle = "rgba(255,200,120,0.95)";
  for (const dx of [-55, 47]) {
    ctx.beginPath();
    ctx.roundRect(x + dx, base - 64, 10, 22, [5, 5, 0, 0]);
    ctx.fill();
  }
  lights.lamps.push({ x: x - 50, y: base - 52, r: 40, kind: "window" });
  lights.lamps.push({ x: x + 52, y: base - 52, r: 40, kind: "window" });
  lights.lamps.push({ x, y: base - 40, r: 60, kind: "window" });

  // three overlapping roof tiers, red with green trim
  const tiers = [
    { w: 120, y: base - 86, h: 70 },
    { w: 96, y: base - 112, h: 66 },
    { w: 70, y: base - 138, h: 60 },
  ];
  for (const t of tiers) {
    outlined(ctx, "#d2453a", () => {
      ctx.moveTo(x - t.w, t.y);
      ctx.lineTo(x - t.w * 0.55, t.y - t.h * 0.55);
      ctx.lineTo(x, t.y - t.h);
      ctx.lineTo(x + t.w * 0.55, t.y - t.h * 0.55);
      ctx.lineTo(x + t.w, t.y);
      ctx.closePath();
    }, 2);
    ctx.strokeStyle = "#3f9a68";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - t.w + 4, t.y - 2);
    ctx.lineTo(x - t.w * 0.55, t.y - t.h * 0.55 - 2);
    ctx.moveTo(x + t.w - 4, t.y - 2);
    ctx.lineTo(x + t.w * 0.55, t.y - t.h * 0.55 - 2);
    ctx.stroke();
  }
  // gold gable (หน้าบัน) and chofa finials curling up at the ridge and eaves
  const top = tiers[2];
  outlined(ctx, "#f2c46a", () => {
    ctx.moveTo(x - 26, top.y - 8);
    ctx.lineTo(x, top.y - top.h + 8);
    ctx.lineTo(x + 26, top.y - 8);
    ctx.closePath();
  }, 1.6);
  ctx.strokeStyle = "#f2c46a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, top.y - top.h);
  ctx.quadraticCurveTo(x + 6, top.y - top.h - 18, x + 14, top.y - top.h - 12);
  for (const t of tiers) {
    ctx.moveTo(x - t.w, t.y);
    ctx.quadraticCurveTo(x - t.w - 8, t.y - 8, x - t.w - 4, t.y - 16);
    ctx.moveTo(x + t.w, t.y);
    ctx.quadraticCurveTo(x + t.w + 8, t.y - 8, x + t.w + 4, t.y - 16);
  }
  ctx.stroke();
}

function templeGrounds(ctx: CanvasRenderingContext2D) {
  // paved courtyard the buildings stand on
  outlined(ctx, "#b3a48e", () => ctx.rect(30, GROUND - 22, 590, 22), 2);
  ctx.fillStyle = "rgba(255,240,220,0.12)";
  for (let x = 40; x < 610; x += 26) ctx.fillRect(x, GROUND - 20, 1.5, 18);

  // big old trees inside the grounds
  for (const [tx, s] of [[40, 1.2], [585, 1]] as const) {
    outlined(ctx, "#4a3a5a", () => ctx.roundRect(tx - 7 * s, GROUND - 120 * s, 14 * s, 120 * s - 20, 5), 2);
    for (const [dx, dy, rr] of [[-34, -150, 46], [26, -160, 50], [-4, -200, 52], [0, -120, 40]]) {
      outlined(ctx, "#2f6a5e", () => ctx.arc(tx + dx * s, GROUND + dy * s, rr * s, 0, Math.PI * 2), 2);
    }
  }

  chedi(ctx, TEMPLE.chediX, GROUND - 22);
  ubosot(ctx, TEMPLE.hallX, GROUND - 22);

  // yellow-and-white temple flags on tall poles
  for (const px of [290, 540]) {
    outlined(ctx, "#d8c8a8", () => ctx.rect(px - 2, GROUND - 230, 4, 210), 1.2);
    outlined(ctx, "#ffd84a", () => {
      ctx.moveTo(px + 2, GROUND - 226);
      ctx.lineTo(px + 26, GROUND - 226);
      ctx.lineTo(px + 26, GROUND - 120);
      ctx.lineTo(px + 14, GROUND - 106);
      ctx.lineTo(px + 2, GROUND - 120);
      ctx.closePath();
    }, 1.6);
    ctx.fillStyle = "#fff4e2";
    for (let i = 0; i < 4; i++) ctx.fillRect(px + 4, GROUND - 210 + i * 24, 20, 4);
  }

  // low whitewashed wall (กำแพงแก้ว) with lotus-bud posts and an opening at the gate
  const wallY = GROUND - 2;
  for (const [x0, x1] of [[30, 270], [330, 620]]) {
    outlined(ctx, "#f3ecf6", () => ctx.rect(x0, wallY - 20, x1 - x0, 20), 2);
    for (let px = x0; px <= x1; px += 48) {
      outlined(ctx, "#fbf6ff", () => ctx.rect(px - 5, wallY - 28, 10, 28), 1.6);
      outlined(ctx, "#ffcf6e", () => ctx.ellipse(px, wallY - 32, 5, 6, 0, 0, Math.PI * 2), 1.4);
    }
  }
  for (const gx of [270, 330]) lights.lamps.push({ x: gx, y: wallY - 40, r: 30, kind: "lamp" });
}

/** Triangle flag bunting (ธงราว) across the fair. */
function bunting(ctx: CanvasRenderingContext2D, a: { x: number; y: number }, b: { x: number; y: number }, sag: number) {
  const cols = ["#ef5a5a", "#ffd84a", "#4fc08a", "#5aa0ef", "#ff8fc0", "#fff4e2"];
  const n = Math.max(6, Math.round(Math.abs(b.x - a.x) / 22));
  ctx.strokeStyle = "rgba(20,14,40,0.8)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) + Math.sin(t * Math.PI) * sag };
    pts.push(p);
    i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
  }
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[i + 1];
    ctx.fillStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.moveTo(p.x + 1, p.y);
    ctx.lineTo(q.x - 1, q.y);
    ctx.lineTo((p.x + q.x) / 2, (p.y + q.y) / 2 + 14);
    ctx.closePath();
    ctx.fill();
  }
}

function pole(ctx: CanvasRenderingContext2D, x: number, top: number, horns = false) {
  outlined(ctx, "#6a5a7a", () => ctx.rect(x - 3, top, 6, GROUND - top), 1.4);
  if (!horns) return;
  // the loudspeaker horns every Thai temple fair has
  for (const dir of [-1, 1]) {
    outlined(ctx, "#cfd6e0", () => {
      ctx.moveTo(x, top + 14);
      ctx.lineTo(x + dir * 30, top + 2);
      ctx.lineTo(x + dir * 30, top + 30);
      ctx.closePath();
    }, 1.6);
  }
}

export function wheelStand(ctx: CanvasRenderingContext2D) {
  const { x, hubY } = WHEEL;
  for (const dx of [-80, 80]) {
    outlined(ctx, "#7a6a9a", () => {
      ctx.moveTo(x + dx - 6, GROUND);
      ctx.lineTo(x - 4, hubY);
      ctx.lineTo(x + 4, hubY);
      ctx.lineTo(x + dx + 6, GROUND);
      ctx.closePath();
    }, 2);
  }
  // boarding platform
  outlined(ctx, "#b06a80", () => ctx.roundRect(x - 50, GROUND - 26, 100, 26, 5), 2);
}

function stage(ctx: CanvasRenderingContext2D) {
  const { x0, x1, floor } = STAGE;
  const cx = (x0 + x1) / 2;
  // backdrop with shimmering tinsel curtain
  const bg = ctx.createLinearGradient(0, 600, 0, floor);
  bg.addColorStop(0, "#5a2a8a");
  bg.addColorStop(1, "#a03a8a");
  outlined(ctx, bg, () => ctx.rect(x0 + 10, 610, x1 - x0 - 20, floor - 610), 2);
  const r = seeded(5);
  for (let x = x0 + 16; x < x1 - 14; x += 5) {
    ctx.strokeStyle = `rgba(${r() > 0.5 ? "255,220,150" : "220,220,255"},${0.25 + r() * 0.35})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 616);
    ctx.lineTo(x + (r() - 0.5) * 3, floor - 4);
    ctx.stroke();
  }
  // arched sign
  outlined(ctx, "#ffcf6e", () => ctx.roundRect(cx - 82, 576, 164, 40, 14), 2.5);
  ctx.fillStyle = "#a0284a";
  ctx.font = "500 22px Mitr, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("รำวงย้อนยุค", cx, 597);
  // frame posts
  outlined(ctx, "#6a4a7a", () => {
    ctx.rect(x0 + 2, 600, 10, floor - 600);
    ctx.rect(x1 - 12, 600, 10, floor - 600);
  }, 2);
  // stage platform with a pleated skirt
  outlined(ctx, "#c58a5a", () => ctx.rect(x0 - 6, floor, x1 - x0 + 12, 10), 2);
  for (let i = 0, x = x0 - 6; x < x1 + 6; i++, x += 16) {
    outlined(ctx, i % 2 ? "#ffcf6e" : "#ef6f8e", () => ctx.rect(x, floor + 10, Math.min(16, x1 + 6 - x), GROUND - floor - 10), 1.2);
  }
  // speaker stacks at the sides
  for (const sx of [x0 - 34, x1 + 4]) {
    for (let k = 0; k < 2; k++) {
      outlined(ctx, "#2a2440", () => ctx.roundRect(sx, GROUND - 46 - k * 44, 30, 42, 4), 2);
      ctx.fillStyle = "#4a4470";
      ctx.beginPath();
      ctx.arc(sx + 15, GROUND - 30 - k * 44, 9, 0, Math.PI * 2);
      ctx.arc(sx + 15, GROUND - 40 - k * 44 - 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // colourful bulbs around the stage frame
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    lights.bulbs.push({ x: lerp(x0 + 8, x1 - 8, t), y: 612 - Math.sin(t * Math.PI) * 10, hue: i % 4 });
  }
  for (let y = 630; y < floor; y += 22) {
    lights.bulbs.push({ x: x0 + 7, y, hue: (y / 22) % 4 | 0 });
    lights.bulbs.push({ x: x1 - 7, y, hue: ((y / 22) + 2) % 4 | 0 });
  }
}

function gameBooths(ctx: CanvasRenderingContext2D) {
  // balloon darts (ปาเป้าลูกโป่ง)
  stall(ctx, 1295, 140, GROUND, ["#ef5a5a", "#fff4e2"], { h: 128 });
  outlined(ctx, "#3a5a9a", () => ctx.rect(1305, GROUND - 118, 120, 76), 2);
  const cols = ["#ef5a5a", "#ffd84a", "#4fc08a", "#5aa0ef", "#ff8fc0"];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const bx = 1316 + col * 19, by = GROUND - 104 + row * 22;
      ctx.fillStyle = cols[(row * 6 + col) % cols.length];
      ctx.beginPath();
      ctx.ellipse(bx, by, 7, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(bx - 3, by - 5, 2, 3);
    }
  }
  boothSign(ctx, 1365, GROUND - 150, "ปาเป้า");

  // ring toss (โยนห่วง): tiered table of bottles, with prizes hanging above
  stall(ctx, 1465, 135, GROUND, ["#4fc08a", "#fff4e2"], { h: 128 });
  for (let tier = 0; tier < 3; tier++) {
    const ty = GROUND - 44 - tier * 20;
    outlined(ctx, "#b07a5a", () => ctx.rect(1480 + tier * 12, ty, 105 - tier * 24, 6), 1.4);
    for (let i = 0; i < 6 - tier * 2; i++) {
      const bx = 1488 + tier * 12 + i * 16;
      outlined(ctx, i % 2 ? "#3f9a68" : "#7a4a2a", () => {
        ctx.roundRect(bx - 4, ty - 16, 8, 16, 2);
        ctx.rect(bx - 1.5, ty - 22, 3, 6);
      }, 1.2);
    }
  }
  boothSign(ctx, 1532, GROUND - 150, "โยนห่วง");

  // plush prizes hanging along both booths
  for (let i = 0; i < 7; i++) {
    const px = 1305 + i * 42, py = GROUND - 132 + (i % 2) * 4;
    const c = ["#ffb08a", "#c9b6ff", "#ffa8c2", "#8fd8c8"][i % 4];
    outlined(ctx, c, () => ctx.arc(px, py, 7, 0, Math.PI * 2), 1.4);
    outlined(ctx, c, () => ctx.arc(px, py - 9, 5, 0, Math.PI * 2), 1.4);
  }
}

function boothSign(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  outlined(ctx, "#fff4e2", () => ctx.roundRect(x - 40, y - 15, 80, 28, 10), 2);
  ctx.fillStyle = "#a0284a";
  ctx.font = "500 16px Mitr, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function foodStall(ctx: CanvasRenderingContext2D, x: number, w: number, stripe: string, text: string, kind: "candy" | "ice") {
  stall(ctx, x, w, GROUND, [stripe, "#fff4e2"], { h: 108 });
  if (kind === "candy") {
    for (let i = 0; i < 4; i++) {
      const cx = x + 20 + i * ((w - 40) / 3);
      ctx.fillStyle = "#c8a080";
      ctx.fillRect(cx - 1, GROUND - 60, 2, 22);
      outlined(ctx, i % 2 ? "#ffc2e0" : "#c9e8ff", () => ctx.arc(cx, GROUND - 66, 11, 0, Math.PI * 2), 1.6);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const cx = x + 18 + i * ((w - 36) / 2);
      outlined(ctx, "#fff4e2", () => ctx.rect(cx - 7, GROUND - 52, 14, 14), 1.4);
      outlined(ctx, ["#ef5a5a", "#4fc08a", "#ffd84a"][i], () => ctx.arc(cx, GROUND - 54, 8, Math.PI, 0), 1.4);
    }
  }
  boothSign(ctx, x + w / 2, GROUND - 126, text);
}

function sand(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, SHORE - 10, 0, H);
  // beach sand at night: warm and earthy, lit by the fair's lamps
  g.addColorStop(0, "#b8987a");
  g.addColorStop(0.3, "#a3826a");
  g.addColorStop(1, "#5e4a44");
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
    ctx.fillStyle = r() < 0.5 ? `rgba(255,236,200,${0.06 + r() * 0.1})` : `rgba(70,48,36,${0.06 + r() * 0.1})`;
    ctx.fillRect(x, y, 1.8, 1.8);
  }
  const wet = ctx.createLinearGradient(0, SHORE, 0, SHORE + 36);
  wet.addColorStop(0, "rgba(70,52,46,0.45)"); // darker damp sand at the water's edge
  wet.addColorStop(1, "rgba(70,52,46,0)");
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
/** A krathong on the water. `style` is one of the shop designs: banana, lotus, bread, coconut. */
export function drawKrathong(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flower = "#ffa8c2", style = "banana") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = "round";
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  const base = { banana: "#3f9a68", lotus: "#4f9a52", bread: "#d9a25a", coconut: "#8a5a3a" }[style] ?? "#3f9a68";
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (style === "lotus") {
    // two rings of pink lotus petals
    for (const [ring, col] of [[0, "#ffc2d6"], [1, "#ff9ec0"]] as const) {
      ctx.fillStyle = col;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        const px = i * (ring ? 5 : 7.5);
        const h = ring ? 15 : 11;
        ctx.moveTo(px - 4, -1 - ring * 2);
        ctx.quadraticCurveTo(px - 4, -h, px + i * 0.6, -h - 3);
        ctx.quadraticCurveTo(px + 4, -h, px + 4, -1 - ring * 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  } else {
    ctx.fillStyle = style === "bread" ? "#e8b872" : style === "coconut" ? "#4f9a52" : "#5cc08a";
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(i * 5.4 - 4.5, -1);
      ctx.lineTo(i * 5.4, -11 + Math.abs(i) * 1.2);
      ctx.lineTo(i * 5.4 + 4.5, -1);
    }
    ctx.fill();
    ctx.stroke();
    if (style === "bread") {
      ctx.fillStyle = "rgba(120,70,30,0.5)";
      for (const dx of [-12, -4, 6, 13]) ctx.fillRect(dx, 1, 1.6, 1.6);
    }
  }
  ctx.fillStyle = flower;
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
  for (let i = 0; i < 4; i++) drawKrathong(ctx, x + 40 + i * ((w - 80) / 3), base - 84, 0.75, ["#ffcf4a", "#ff9ec0", "#ff8fb0", "#fffaf0"][i], ["banana", "lotus", "bread", "coconut"][i]);
  for (let i = 0; i < 3; i++) drawKrathong(ctx, x + 52 + i * ((w - 104) / 2), base - 42, 0.95, ["#c9b6ff", "#ffa8c2", "#fff2f6"][i], ["lotus", "banana", "coconut"][i]);
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
  ctx.font = "500 15px Mitr, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Thai vowel and tone marks ride on the letter before them, so keep them together when spacing the letters along the arch.
  const glyphs = Array.from(loyKrathongConfig.brand).reduce<string[]>((out, ch) => {
    if (/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/.test(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
    return out;
  }, []);
  for (let i = 0; i < glyphs.length; i++) {
    const t = (i + 0.5) / glyphs.length;
    const px = lerp(cx - half - 8, cx + half + 8, t);
    const py = base - h + 13 - Math.sin(t * Math.PI) * 23;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((t - 0.5) * 0.7);
    ctx.fillText(glyphs[i], 0, 0);
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
  bush(1160, H + 10, 1.1);
  bush(2560, H + 6, 1.4);
}

export function paintBack(ctx: CanvasRenderingContext2D) {
  lights.lamps.length = 0;
  lights.torches.length = 0;
  lights.bulbs.length = 0;
  sky(ctx);
  islands(ctx);
  seaBase(ctx);
  land(ctx);
}

export function paintFront(ctx: CanvasRenderingContext2D) {
  sand(ctx);
  pier(ctx);
  templeGrounds(ctx);
  pole(ctx, 1278, 560, true);
  stage(ctx);
  gameBooths(ctx);
  gate(ctx, 640, GROUND + 6);
  boutique(ctx, 1650, 180, GROUND + 2);
  foodStall(ctx, 2040, 110, "#ff8fc0", "สายไหม", "candy");
  memoryCorner(ctx, 2190, GROUND + 6);
  stall(ctx, 2530, 150, GROUND, ["#ffa8c2", "#fff4e2"], { goods: "flowers" });
  boothSign(ctx, 2605, GROUND - 112, "ดอกไม้");
  foodStall(ctx, 2680, 84, "#5aa0ef", "น้ำแข็งไส", "ice");

  bunting(ctx, { x: 704, y: 664 }, { x: 1036, y: 604 }, 34);
  bunting(ctx, { x: 1254, y: 604 }, { x: 1278, y: 574 }, 2);
  bunting(ctx, { x: 1278, y: 574 }, { x: 1648, y: 650 }, 40);
  bunting(ctx, { x: 2040, y: 690 }, { x: 2330, y: 660 }, 30);
  bunting(ctx, { x: 2420, y: 660 }, { x: 2760, y: 690 }, 30);
  foregroundFlowers(ctx);

  const v = ctx.createLinearGradient(0, H - 110, 0, H);
  v.addColorStop(0, "rgba(10,8,40,0)");
  v.addColorStop(1, "rgba(10,8,40,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, H - 110, W, 110);
}
