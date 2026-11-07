// Draws one festival-goer: the visitor and everyone in the crowd.
// Feet at (x, y). An adult is about 72 world units tall at scale 1, a child about 50.
// The figure faces right (facing = 1) in a three-quarter view; facing = -1 mirrors it.
// What someone wears is plain data (VisitorLook), so a new outfit is a new object, not new code.
import type { HeldThing, VisitorLook } from "../festivals/types";
import { lerp } from "./math";

/** Something carried in the front hand. */
export type Hold = HeldThing;
export type Pose = {
  /** 0..1: arms raised in a ram wong pose. */
  dance?: number;
  /** 0..1: kneeling, sitting back on the heels (praying, floating a krathong). */
  kneel?: number;
  /** 0..1: sitting on a seat (the Ferris wheel cabin). */
  sit?: number;
  /** 0..1: palms pressed together in a wai. */
  wai?: number;
  /** 0..1: both hands raised above the head (letting a sky lantern go). */
  raise?: number;
  /** 0..1: bowing forward from the hips (a krap at the temple). */
  bow?: number;
  hold?: Hold;
  /** Main colour of the held thing (balloon, syrup, krathong flowers...). */
  holdColor?: string;
  /** Second colour (the krathong's base). */
  holdColor2?: string;
  /** Shape variant of the held thing (special lanterns). */
  holdStyle?: string;
};

type P = [number, number];

// Body measurements in world units. A head is roughly a fifth of an adult's height.
const BODY = {
  adult: { leg: 31, torso: 17, neck: 3, head: 7.6, shoulder: 7, hip: 4.6, limb: 5, arm: 3.2, upper: 9, fore: 8.5, step: 7 },
  elder: { leg: 29, torso: 16, neck: 2.5, head: 7.6, shoulder: 6.8, hip: 4.9, limb: 4.8, arm: 3.1, upper: 8.6, fore: 8.2, step: 4.5 },
  kid: { leg: 18, torso: 12, neck: 1.8, head: 7, shoulder: 5, hip: 3.7, limb: 4.2, arm: 2.8, upper: 6, fore: 5.6, step: 5 },
};

const LINE = 1.5;
const mix = (a: P, b: P, k: number): P => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

/** An outlined, rounded limb through the given points. */
function limb(ctx: CanvasRenderingContext2D, pts: P[], width: number, fill: string, outline: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = outline;
  ctx.lineWidth = width + LINE * 2;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, scale: number, facing: number,
  phase: number, stride: number, t: number, c: VisitorLook, pose: Pose = {},
) {
  const age = c.age ?? "adult";
  const b = BODY[age];
  const woman = c.figure === "woman";
  const neutral = c.figure === "neutral";
  const dance = pose.dance ?? 0;
  const wai = pose.wai ?? 0;
  const raise = pose.raise ?? 0;
  const sit = pose.sit ?? 0;
  const lower = Math.max(pose.kneel ?? 0, sit); // how far the body has dropped from standing
  const hold = dance > 0.5 || wai > 0.5 ? undefined : pose.hold;
  const O = c.outline;
  const shoes = c.shoes ?? "#3b2c3a";
  const swing = Math.sin(phase) * stride;
  const bob = Math.abs(Math.cos(phase)) * 1.6 * stride + Math.sin(t * 2.2) * 0.4 * (1 - stride);
  const blink = t % 4.3 < 0.12;

  // key heights (negative is up)
  const ankleY = -2.5;
  const standHipY = ankleY - b.leg;
  const lowHipY = sit ? ankleY - b.leg * 0.56 : ankleY - b.leg * 0.4;
  const hipY = lerp(standHipY, lowHipY, lower);
  const waistY = hipY - (age === "kid" ? 3 : 5);
  const sY = hipY - b.torso; // top of the shoulders
  const sw = b.shoulder * (woman ? 0.88 : neutral ? 0.94 : 1);
  const hw = b.hip * (woman ? 1.06 : neutral ? 1.03 : 1);
  const ww = woman ? hw * 0.8 : neutral ? hw * 0.9 : hw * 0.98;
  const stoop = age === "elder" ? 2 : 0;
  const r = b.head;
  const hx = 1 + stoop;
  const hy = sY - b.neck - r + 1;
  const kneeY = lerp((standHipY + ankleY) / 2, sit ? lowHipY : ankleY, lower);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(8,6,24,0.38)";
  ctx.beginPath();
  ctx.ellipse(0, 0, age === "kid" ? 9 : 12.5, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(facing, c.height ?? 1);
  ctx.translate(0, -bob - Math.abs(Math.sin(t * 4)) * 2.2 * dance);
  if (dance) ctx.rotate(Math.sin(t * 3) * 0.05 * dance);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const shape = (fill: string, path: () => void, width = LINE) => {
    ctx.beginPath();
    path();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = O;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  // ------------------------------------------------------------ legs
  const danceStep = Math.sin(t * 3) * dance;
  const leg = (side: -1 | 1) => {
    const s = swing * side + danceStep * side * 0.4;
    const hipX = side * hw * 0.5;
    const footX = hipX + s * b.step;
    const lift = Math.max(0, Math.cos(phase) * side) * 2.4 * stride;
    let ankle: P = [footX, ankleY - lift];
    let knee: P = [(hipX + footX) / 2 + 0.8 + Math.abs(s) * 1.2, (standHipY + ankleY) / 2 - lift * 0.4];
    const hip: P = [hipX, hipY + 1];
    if (lower) {
      // kneeling: knees forward on the ground, feet tucked under; sitting: thighs level, shins down
      const lowKnee: P = sit ? [hipX + b.leg * 0.48, lowHipY + 1] : [hipX + b.leg * 0.42, ankleY];
      const lowAnkle: P = sit ? [hipX + b.leg * 0.5, ankleY] : [hipX - 3, ankleY + 0.5];
      knee = mix(knee, lowKnee, lower);
      ankle = mix(ankle, lowAnkle, lower);
    }
    const o = c.outfit;
    if (o === "shirt-pants" || o === "blouse-pants") {
      limb(ctx, [hip, knee, ankle], b.limb + (o === "blouse-pants" ? 1.2 : 0.5), c.bottom, O);
    } else if (o === "shirt-shorts" || o === "blouse-shorts") {
      limb(ctx, [knee, ankle], b.limb - 1.3, c.skin, O);
      limb(ctx, [hip, mix(hip, knee, 1.08)], b.limb + 1.6, c.bottom, O);
    } else {
      limb(ctx, [hip, knee, ankle], b.limb - 1.4, c.skin, O);
    }
    shape(shoes, () => ctx.ellipse(ankle[0] + 1.3 - lower * (sit ? 0 : 3), ankle[1] + 1, b.limb * 0.72, 1.9, 0, 0, Math.PI * 2), 1.1);
  };
  leg(-1);
  leg(1);

  // bowing tips everything above the hips forward
  const bow = pose.bow ?? 0;
  if (bow) {
    ctx.translate(0, hipY);
    ctx.rotate(bow * 0.85);
    ctx.translate(0, -hipY);
  }

  // ------------------------------------------------------------ arms
  const arm = (side: -1 | 1) => {
    const sh: P = [side * (sw - 1.7) + stoop * 0.4, sY + 1.4];
    const s = -swing * side;
    let el: P = [sh[0] + s * 3, sh[1] + b.upper];
    let hand: P = [el[0] + s * 4 + 0.6, el[1] + b.fore];
    if (side === 1 && hold) {
      if (hold === "krathong" || hold === "siamsi") { el = [sh[0] + 2, sh[1] + b.upper * 0.85]; hand = [sh[0] + 7, sh[1] + b.upper * 0.95]; }
      else if (hold === "cane") { el = [sh[0] + 2.5, sh[1] + b.upper]; hand = [sh[0] + 6, el[1] + b.fore * 0.75]; }
      else { el = [sh[0] + 3, sh[1] + b.upper * 0.75]; hand = [sh[0] + 6, sh[1] + b.upper * 0.2]; }
    }
    if (wai) {
      // palms together in front of the chest
      const wEl: P = [sh[0] + 3.5 + side * 0.8, sh[1] + b.upper * 0.75];
      const wHand: P = [sw * 0.25 + 4.5, sY - 1 - (pose.bow ? 2 : 0)];
      el = mix(el, wEl, wai);
      hand = mix(hand, wHand, wai);
    }
    if (raise) {
      // both hands up over the head, holding the lantern's wire ring
      const rEl: P = [sh[0] + side * 2.5, sY - 6];
      const rHand: P = [1 + side * 2.6, sY - 21.5];
      el = mix(el, rEl, raise);
      hand = mix(hand, rHand, raise);
    }
    if (dance) {
      // ram wong: elbows out, hands lifted, gently trading heights
      const up = Math.sin(t * 1.6 + (side > 0 ? 0 : Math.PI));
      const dEl: P = [sh[0] + side * 4 + 1, sh[1] + 4];
      const dHand: P = [sh[0] + side * 5.5 + 2, sh[1] - 6 - up * 3];
      el = mix(el, dEl, dance);
      hand = mix(hand, dHand, dance);
    }
    limb(ctx, [sh, el, hand], b.arm, c.skin, O);
    const sleeves = c.sleeves ?? "short";
    if (sleeves === "long") limb(ctx, [sh, el, mix(el, hand, 0.82)], b.arm + 1.5, c.top, O);
    else if (sleeves === "short") limb(ctx, [sh, mix(sh, el, 0.6)], b.arm + 2.1, c.top, O);
    shape(c.skin, () => ctx.arc(hand[0], hand[1], b.arm * 0.62, 0, Math.PI * 2), 1.1);
    return hand;
  };

  // ------------------------------------------------------------ clothes
  const pattern = () => {
    if (!c.pattern) return;
    ctx.save();
    ctx.clip();
    ctx.fillStyle = c.accent;
    ctx.strokeStyle = c.accent;
    if (c.pattern === "floral") {
      for (let py = sY - 2; py < 4; py += 5.5) for (let px = -14; px < 14; px += 5.5) {
        const ox = px + ((py / 5.5) % 2 ? 2.7 : 0);
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.arc(ox + Math.cos(k * 1.57) * 1.1, py + Math.sin(k * 1.57) * 1.1, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (c.pattern === "stripes") {
      ctx.lineWidth = 1.3;
      for (let py = sY + 1; py < 4; py += 3.4) { ctx.beginPath(); ctx.moveTo(-15, py); ctx.lineTo(15, py); ctx.stroke(); }
    } else {
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.1;
      for (let p = -15; p < 15; p += 4) { ctx.beginPath(); ctx.moveTo(p, sY - 3); ctx.lineTo(p, 4); ctx.stroke(); }
      for (let p = sY; p < 4; p += 4) { ctx.beginPath(); ctx.moveTo(-15, p); ctx.lineTo(15, p); ctx.stroke(); }
    }
    ctx.restore();
  };

  const top = (hemY: number, hemW: number) => {
    const path = () => {
      ctx.moveTo(-sw, sY + 2.5);
      ctx.quadraticCurveTo(-sw, sY - 1, -sw + 3, sY - 1);
      ctx.lineTo(sw - 3, sY - 1);
      ctx.quadraticCurveTo(sw, sY - 1, sw, sY + 2.5);
      ctx.quadraticCurveTo(ww + 0.8, waistY - 4, ww + 0.2, waistY);
      ctx.lineTo(hemW, hemY);
      ctx.quadraticCurveTo(0, hemY + 1.2, -hemW, hemY);
      ctx.lineTo(-ww - 0.2, waistY);
      ctx.quadraticCurveTo(-ww - 0.8, waistY - 4, -sw, sY + 2.5);
      ctx.closePath();
    };
    ctx.beginPath();
    path();
    ctx.fillStyle = c.top;
    ctx.fill();
    pattern();
    ctx.beginPath();
    path();
    ctx.strokeStyle = O;
    ctx.lineWidth = LINE;
    ctx.stroke();
    // neckline
    if (c.collar) {
      shape(c.top, () => { ctx.moveTo(-2.6, sY - 1.2); ctx.lineTo(0.6, sY + 3.4); ctx.lineTo(-0.6, sY - 1.4); }, 1.1);
      shape(c.top, () => { ctx.moveTo(3.8, sY - 1.2); ctx.lineTo(0.6, sY + 3.4); ctx.lineTo(1.8, sY - 1.4); }, 1.1);
      ctx.fillStyle = O;
      for (let by = sY + 6; by < hemY - 2; by += 4.5) { ctx.beginPath(); ctx.arc(0.8, by, 0.55, 0, Math.PI * 2); ctx.fill(); }
    } else if (woman || neutral) {
      shape(c.skin, () => ctx.ellipse(0.6, sY - 1, 3, 2.2, 0, 0, Math.PI), 1.1);
    } else {
      ctx.strokeStyle = O;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0.6, sY - 1, 2.6, 1.6, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
  };

  const waistband = () =>
    shape(c.bottom, () => {
      ctx.moveTo(-ww - 0.2, waistY);
      ctx.lineTo(ww + 0.2, waistY);
      ctx.lineTo(hw + 0.6, hipY + 2.5);
      ctx.lineTo(-hw - 0.6, hipY + 2.5);
      ctx.closePath();
    });

  const skirt = (hemY: number, flare: number) => {
    const sp = Math.abs(swing) * 1.6 + Math.abs(danceStep) * 1.2;
    shape(c.bottom, () => {
      ctx.moveTo(-ww - 0.2, waistY);
      ctx.lineTo(ww + 0.2, waistY);
      ctx.quadraticCurveTo(hw + 1.2, hipY, hw + flare + sp, hemY);
      ctx.quadraticCurveTo(0, hemY + 1.4, -hw - flare - sp, hemY);
      ctx.quadraticCurveTo(-hw - 1.2, hipY, -ww - 0.2, waistY);
      ctx.closePath();
    });
  };

  /** The pha sin: an ankle-length wrap skirt with a woven band at the hem. */
  const phaSin = () => {
    const hemY = ankleY - 1.2;
    const sp = Math.abs(swing) * 2 + Math.abs(danceStep) * 1.4;
    const path = () => {
      ctx.moveTo(-ww - 0.2, waistY);
      ctx.lineTo(ww + 0.2, waistY);
      ctx.quadraticCurveTo(hw + 1.6, hipY + 2, hw + 1.4 + sp, hemY);
      ctx.lineTo(-hw - 1.4 - sp, hemY);
      ctx.quadraticCurveTo(-hw - 1.6, hipY + 2, -ww - 0.2, waistY);
      ctx.closePath();
    };
    shape(c.bottom, path);
    ctx.save();
    ctx.beginPath();
    path();
    ctx.clip();
    ctx.fillStyle = c.accent;
    ctx.fillRect(-12, hemY - 5, 24, 3.2);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(-12, hipY + 4, 24, 1.1);
    ctx.restore();
    ctx.strokeStyle = "rgba(42,29,74,0.45)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(ww * 0.4, waistY + 1);
    ctx.lineTo(hw * 0.7, hemY - 0.5);
    ctx.stroke();
  };

  /** Skirts when kneeling or sitting: the cloth drapes over the lap down to the knees. */
  const lap = () => {
    const kx = hw * 0.5 + b.leg * (sit ? 0.48 : 0.42) + 2;
    const bottomY = sit ? lowHipY + 7 : ankleY + 0.5;
    shape(c.bottom, () => {
      ctx.moveTo(-ww - 0.2, waistY);
      ctx.lineTo(ww + 0.2, waistY);
      ctx.quadraticCurveTo(kx * 0.7, hipY - 1, kx + 1, sit ? lowHipY : ankleY - 3.5);
      ctx.lineTo(kx + 1.5, bottomY);
      ctx.lineTo(-hw - 3, bottomY);
      ctx.quadraticCurveTo(-hw - 2.6, hipY, -ww - 0.2, waistY);
      ctx.closePath();
    });
    if (c.outfit === "pha-sin") {
      ctx.fillStyle = c.accent;
      ctx.fillRect(-hw - 2.6, bottomY - 3.2, kx + hw + 4, 2.4);
    }
  };
  const seated = lower > 0.5;

  arm(-1);
  const hemShirt = hipY + 1.5;
  switch (c.outfit) {
    case "shirt-pants":
    case "shirt-shorts":
    case "blouse-pants":
    case "blouse-shorts":
      waistband();
      top(hemShirt, hw + 0.8);
      break;
    case "shirt-skirt":
      // a tucked-in shirt over a skirt
      top(waistY + 1.5, ww + 0.3);
      if (seated) lap();
      else skirt(kneeY + (age === "kid" ? 1 : 3), age === "kid" ? 2.6 : 3.4);
      break;
    case "blouse-skirt":
      top(waistY + 1.5, ww + 0.3);
      if (seated) lap();
      else skirt(kneeY + (age === "kid" ? 1 : 3), age === "kid" ? 2.6 : 3.4);
      break;
    case "pha-sin":
      top(waistY + 1.5, ww + 0.3);
      if (seated) lap();
      else phaSin();
      break;
    case "dress":
      if (seated) { top(waistY + 1.5, ww + 0.3); lap(); }
      else top(kneeY + 2, hw + 4 + Math.abs(swing) * 1.6);
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-ww, waistY);
      ctx.lineTo(ww, waistY);
      ctx.stroke();
      break;
  }

  // ------------------------------------------------------------ head
  limb(ctx, [[0.5, sY + 0.5], [hx - 0.4, hy + r * 0.6]], r * 0.42, c.skin, O);
  const hs = c.hairStyle;
  const sway = Math.sin(t * 2 + phase * 0.5) * 0.8;

  // hair that sits behind the head
  if (hs === "long") {
    shape(c.hair, () => {
      ctx.moveTo(hx - r * 0.1, hy - r - 0.5);
      ctx.bezierCurveTo(hx - r * 1.65, hy - r, hx - r * 1.5, hy + r * 1.3, hx - r * 1.2 + sway, hy + r * 2.15);
      ctx.quadraticCurveTo(hx - r * 0.3, hy + r * 2.3, hx + r * 0.2, hy + r * 1.1);
      ctx.lineTo(hx + r * 0.4, hy);
      ctx.closePath();
    });
  } else if (hs === "bob") {
    shape(c.hair, () => {
      ctx.moveTo(hx + r * 0.2, hy - r - 0.5);
      ctx.bezierCurveTo(hx - r * 1.55, hy - r * 1.1, hx - r * 1.45, hy + r * 0.7, hx - r * 1.05, hy + r * 1.15);
      ctx.lineTo(hx + r * 0.15, hy + r * 1.0);
      ctx.lineTo(hx + r * 0.4, hy);
      ctx.closePath();
    });
  } else if (hs === "ponytail") {
    shape(c.hair, () => {
      ctx.moveTo(hx - r * 0.6, hy - r * 0.85);
      ctx.quadraticCurveTo(hx - r * 2.05, hy - r * 0.75, hx - r * 1.55 + sway, hy + r * 1.45);
      ctx.quadraticCurveTo(hx - r * 1.05, hy + r * 0.2, hx - r * 0.75, hy - r * 0.1);
      ctx.closePath();
    });
  } else if (hs === "bun") {
    shape(c.hair, () => ctx.arc(hx - r * 0.78, hy - r * 0.72, r * 0.46, 0, Math.PI * 2));
  }

  shape(c.skin, () => ctx.arc(hx, hy, r, 0, Math.PI * 2));

  // hair on top of the head
  if (hs === "bald") {
    ctx.strokeStyle = c.hair;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(hx, hy, r - 1, Math.PI * 0.78, Math.PI * 1.12);
    ctx.stroke();
  } else if (hs === "short" || hs === "crop") {
    const line = hs === "crop" ? 0.62 : 0.5;
    shape(c.hair, () => {
      ctx.arc(hx, hy, r + (hs === "crop" ? 0.2 : 0.7), Math.PI * 0.93, Math.PI * 1.96);
      ctx.quadraticCurveTo(hx + r * 0.6, hy - r * line, hx + r * 0.15, hy - r * (line - 0.05));
      ctx.lineTo(hx - r * 0.35, hy - r * (line - 0.15));
      ctx.quadraticCurveTo(hx - r * 0.55, hy + r * 0.05, hx - r * 0.7, hy + r * 0.3);
      ctx.closePath();
    });
  } else {
    shape(c.hair, () => {
      ctx.arc(hx, hy, r + 0.6, Math.PI * 0.86, Math.PI * 1.98);
      ctx.quadraticCurveTo(hx + r * 0.7, hy - r * 0.25, hx + r * 0.25, hy - r * 0.4);
      ctx.quadraticCurveTo(hx - r * 0.05, hy - r * 0.62, hx - r * 0.4, hy - r * 0.45);
      ctx.quadraticCurveTo(hx - r * 0.6, hy + r * 0.1, hx - r * 0.86, hy + r * 0.5);
      ctx.closePath();
    });
  }
  if (hs === "ponytail") {
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.arc(hx - r * 0.82, hy - r * 0.62, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // ear (hidden under long hair)
  if (hs !== "long" && hs !== "bob") {
    ctx.fillStyle = c.skin;
    ctx.strokeStyle = "rgba(42,29,74,0.55)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(hx - r * 0.3, hy + r * 0.18, r * 0.16, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (c.flower) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.fillStyle = "#fff6f0";
      ctx.beginPath();
      ctx.ellipse(hx - r * 0.5 + Math.cos(a) * 1.5, hy - r * 0.55 + Math.sin(a) * 1.5, 1.4, 0.95, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f6c56b";
    ctx.beginPath();
    ctx.arc(hx - r * 0.5, hy - r * 0.55, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // face: small eyes, brows, nose and a smile
  const eyeY = hy + r * 0.08;
  const ex1 = hx + r * 0.3, ex2 = hx + r * 0.74;
  const er = age === "kid" ? 1.15 : 0.95;
  ctx.fillStyle = "#231a2c";
  if (blink) {
    ctx.fillRect(ex1 - 1, eyeY, 2, 0.7);
    ctx.fillRect(ex2 - 0.8, eyeY, 1.6, 0.7);
  } else {
    ctx.beginPath();
    ctx.ellipse(ex1, eyeY, er, er * 1.35, 0, 0, Math.PI * 2);
    ctx.ellipse(ex2, eyeY, er * 0.82, er * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(ex1 + 0.1, eyeY - er, 0.6, 0.6);
    ctx.fillRect(ex2 + 0.1, eyeY - er, 0.5, 0.5);
  }
  ctx.strokeStyle = age === "elder" ? "#8a8590" : c.hair;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.moveTo(ex1 - 1.3, eyeY - 2.4);
  ctx.lineTo(ex1 + 1.1, eyeY - 2.6);
  ctx.moveTo(ex2 - 0.9, eyeY - 2.6);
  ctx.lineTo(ex2 + 1, eyeY - 2.4);
  ctx.stroke();
  ctx.strokeStyle = O;
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.9, hy + r * 0.12);
  ctx.quadraticCurveTo(hx + r * 1.06, hy + r * 0.36, hx + r * 0.86, hy + r * 0.4);
  ctx.stroke();
  ctx.strokeStyle = "#8a3a4a";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(hx + r * 0.58, hy + r * 0.48, 1.3, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = "rgba(240,120,140,0.3)";
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.22, hy + r * 0.42, 1.6, 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  if (c.glasses) {
    ctx.strokeStyle = "#2a2232";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(ex1, eyeY, 1.9, 0, Math.PI * 2);
    ctx.moveTo(ex2 + 1.6, eyeY);
    ctx.arc(ex2, eyeY, 1.6, 0, Math.PI * 2);
    ctx.moveTo(ex1 + 1.9, eyeY);
    ctx.lineTo(ex2 - 1.6, eyeY);
    ctx.moveTo(ex1 - 1.9, eyeY);
    ctx.lineTo(hx - r * 0.1, eyeY - 0.4);
    ctx.stroke();
  }

  // front arm last, so it sits over the body
  const hand = arm(1);
  if (hold === "lantern" && raise > 0.5) {
    // held high in both hands, full size, about to be let go
    drawPaperLantern(ctx, 1, hand[1] - 6 * LANTERN_UP, LANTERN_UP, pose.holdColor ?? "#ffb35c", t, pose.holdStyle, pose.holdColor2, O);
  } else if (hold) drawHeld(ctx, hold, hand, pose.holdColor ?? "#ef5a5a", pose.holdColor2 ?? "#4f9a52", t, sY, O, pose.holdStyle);

  ctx.restore();
}

/** Draw just a held thing on its own (for the little pictures on stall cards). */
export function drawHeldThing(ctx: CanvasRenderingContext2D, hold: Hold, x: number, y: number, scale: number, color = "#ef5a5a", color2 = "#4f9a52", style?: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  drawHeld(ctx, hold, [0, 0], color, color2, 0, -30, "#2a1d4a", style);
  ctx.restore();
}

/** How much bigger the lantern is when held up to be let go. The scene's released lantern matches this size. */
export const LANTERN_UP = 2.1;

/**
 * A paper sky lantern (khom loi) whose wire ring sits at (x, y + 6k). Shared by the hand, the stall card and the sky.
 * style: undefined (plain), "heart", "gold" (glitters) or "lanna" (patterned paper with tassels, pattern in color2).
 */
export function drawPaperLantern(
  ctx: CanvasRenderingContext2D, x: number, y: number, k: number, color: string, t: number,
  style?: string, color2 = "#d0453a", O = "#2a1d4a", lineWidth = 0.9,
) {
  const g = ctx.createRadialGradient(x, y, k, x, y, 16 * k);
  g.addColorStop(0, "rgba(255,200,120,0.55)");
  g.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - 16 * k, y - 16 * k, 32 * k, 32 * k);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.fillStyle = color;
  ctx.strokeStyle = O;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  if (style === "heart") {
    ctx.moveTo(x, y + 6.5 * k);
    ctx.bezierCurveTo(x - 9 * k, y - 0.5 * k, x - 7 * k, y - 10.5 * k, x, y - 5.5 * k);
    ctx.bezierCurveTo(x + 7 * k, y - 10.5 * k, x + 9 * k, y - 0.5 * k, x, y + 6.5 * k);
  } else {
    ctx.moveTo(x - 4.2 * k, y + 6 * k);
    ctx.lineTo(x - 5.6 * k, y - 5 * k);
    ctx.quadraticCurveTo(x, y - 9 * k, x + 5.6 * k, y - 5 * k);
    ctx.lineTo(x + 4.2 * k, y + 6 * k);
    ctx.closePath();
  }
  ctx.fill();
  if (style === "lanna") {
    // bands of a simple flower pattern on the mulberry paper
    ctx.save();
    ctx.clip();
    ctx.fillStyle = color2;
    for (const by of [-3.2, 3]) {
      ctx.fillRect(x - 7 * k, y + by * k - 0.45 * k, 14 * k, 0.9 * k);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(x + i * 2.2 * k, y + (by + (by < 0 ? 1.6 : -1.6)) * k, 0.55 * k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  if (style === "gold") {
    ctx.fillStyle = "rgba(255,255,230,0.75)";
    ctx.fillRect(x - 3.6 * k, y - 5 * k, 1 * k, 9 * k);
  }
  ctx.stroke();
  if (style === "lanna") {
    // a tassel at each lower corner
    for (const side of [-1, 1]) {
      ctx.strokeStyle = color2;
      ctx.lineWidth = Math.max(lineWidth, 0.5 * k);
      ctx.beginPath();
      ctx.moveTo(x + side * 4.2 * k, y + 6 * k);
      ctx.lineTo(x + side * 4.6 * k + Math.sin(t * 2 + side) * 0.4 * k, y + 9.5 * k);
      ctx.stroke();
    }
  }
  ctx.fillStyle = `rgba(255,240,190,${0.8 + 0.15 * Math.sin(t * 9)})`;
  ctx.beginPath();
  ctx.ellipse(x, y + (style === "heart" ? 1.5 : 4) * k, 1.4 * k, 2 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  if (style === "gold") {
    // little four-point glints around the paper
    ctx.fillStyle = "#fffbe0";
    for (let i = 0; i < 4; i++) {
      const a = t * 1.3 + i * 1.57, tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 2);
      const gx = x + Math.cos(a) * 8 * k, gy = y - 1 * k + Math.sin(a) * 7 * k, r = (0.6 + tw * 0.9) * k;
      ctx.beginPath();
      ctx.moveTo(gx, gy - r * 2);
      ctx.lineTo(gx + r * 0.4, gy - r * 0.4);
      ctx.lineTo(gx + r * 2, gy);
      ctx.lineTo(gx + r * 0.4, gy + r * 0.4);
      ctx.lineTo(gx, gy + r * 2);
      ctx.lineTo(gx - r * 0.4, gy + r * 0.4);
      ctx.lineTo(gx - r * 2, gy);
      ctx.lineTo(gx - r * 0.4, gy - r * 0.4);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHeld(ctx: CanvasRenderingContext2D, hold: Hold, hand: P, color: string, color2: string, t: number, sY: number, O: string, style?: string) {
  const [x, y] = hand;
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = O;
  if (hold === "balloon") {
    const bx = x + 4 + Math.sin(t * 1.6) * 1.5, by = sY - 22 + Math.sin(t * 1.3) * 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 4, (y + by) / 2, bx, by + 8);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.strokeStyle = O;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(bx, by, 6, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(bx - 2, by - 3, 1.4, 2.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (hold === "cottonCandy") {
    ctx.strokeStyle = "#f3e6c8";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y + 1);
    ctx.lineTo(x + 1, y - 7);
    ctx.stroke();
    ctx.fillStyle = color === "#ef5a5a" ? "#ffb3d4" : color;
    ctx.strokeStyle = O;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 1, y - 10, 3.6, 0, Math.PI * 2);
    ctx.arc(x + 3.4, y - 12, 2.8, 0, Math.PI * 2);
    ctx.arc(x - 1.2, y - 12.6, 2.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (hold === "cane") {
    ctx.strokeStyle = O;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(x - 1.5, y - 1);
    ctx.quadraticCurveTo(x, y - 2.5, x + 0.6, y);
    ctx.lineTo(x + 3, -1);
    ctx.stroke();
    ctx.strokeStyle = "#8a5a3a";
    ctx.lineWidth = 1.4;
    ctx.stroke();
  } else if (hold === "siamsi") {
    // the fortune-stick cylinder, shaken until one stick jumps out
    const shake = Math.sin(t * 30) * 0.8;
    ctx.save();
    ctx.translate(x + 2, y - 2);
    ctx.rotate(-0.5 + shake * 0.1);
    ctx.strokeStyle = "#e8c47a";
    ctx.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 1, -4);
      ctx.lineTo(i * 1.1, -10 - Math.abs(i));
      ctx.stroke();
    }
    ctx.fillStyle = "#c8323c";
    ctx.strokeStyle = O;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-3, -5, 6, 10, 1.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffcf6e";
    ctx.fillRect(-3, -1, 6, 1.4);
    ctx.restore();
  } else if (hold === "shavedIce") {
    // a paper cup of shaved ice with syrup on top
    ctx.fillStyle = "#fff4e2";
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 4);
    ctx.lineTo(x + 5, y - 4);
    ctx.lineTo(x + 4, y + 3);
    ctx.lineTo(x - 2, y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f2f6ff";
    ctx.beginPath();
    ctx.arc(x + 1, y - 5, 4.2, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 1, y - 5.4, 3, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.strokeStyle = "#ff8fb0";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 2.5, y - 6);
    ctx.lineTo(x + 4.5, y - 11);
    ctx.stroke();
  } else if (hold === "lantern") {
    // a paper sky lantern (khom loi), lit, carried above the hand
    drawPaperLantern(ctx, x + 1, y - 6 + Math.sin(t * 2) * 0.4, 1, color, t, style, color2, O);
  } else if (hold === "garland") {
    // a jasmine garland (phuang malai) hanging from the hand
    ctx.strokeStyle = O;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI;
      const gx = x + 1 + Math.cos(a) * 3.2, gy = y + 1 + Math.sin(a) * 5.5;
      ctx.fillStyle = i % 4 === 0 ? "#ff6f8e" : "#fffaf0";
      ctx.beginPath();
      ctx.arc(gx, gy, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#e8a020";
    ctx.beginPath();
    ctx.arc(x + 1, y + 8.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (hold === "lotus") {
    // a lotus bud held upright for the Buddha
    ctx.strokeStyle = "#4f9a52";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    ctx.lineTo(x + 1, y - 6);
    ctx.stroke();
    ctx.fillStyle = "#ff9ec0";
    ctx.strokeStyle = O;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 15);
    ctx.quadraticCurveTo(x + 5, y - 10, x + 1, y - 6);
    ctx.quadraticCurveTo(x - 3, y - 10, x + 1, y - 15);
    ctx.fill();
    ctx.stroke();
  } else if (hold === "plushStar" || hold === "plushRabbit" || hold === "plushJelly") {
    // a soft toy prize hugged against the body
    const px = x + 1, py = y - 3;
    ctx.strokeStyle = O;
    ctx.lineWidth = 1;
    if (hold === "plushStar") {
      ctx.fillStyle = "#ffb08a";
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? 3 : 6.5;
        ctx.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (hold === "plushRabbit") {
      ctx.fillStyle = "#fff4e2";
      ctx.beginPath();
      ctx.ellipse(px - 1.8, py - 7, 1.4, 3.8, -0.2, 0, Math.PI * 2);
      ctx.ellipse(px + 1.8, py - 7, 1.4, 3.8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = "#c9b6ff";
      ctx.beginPath();
      ctx.arc(px, py, 4.8, Math.PI, 0);
      ctx.lineTo(px + 4.8, py + 1);
      ctx.lineTo(px - 4.8, py + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#c9b6ff";
      ctx.lineWidth = 1.2;
      for (const dx of [-3, 0, 3]) {
        ctx.beginPath();
        ctx.moveTo(px + dx, py + 1);
        ctx.quadraticCurveTo(px + dx + 1.5, py + 4, px + dx, py + 7);
        ctx.stroke();
      }
    }
    ctx.fillStyle = O;
    ctx.beginPath();
    ctx.arc(px - 1.5, py - 0.5, 0.6, 0, Math.PI * 2);
    ctx.arc(px + 1.5, py - 0.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // a little krathong with flowers and a candle
    const kx = x + 2.5, ky = y - 1;
    ctx.fillStyle = color2;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 6, 2.6, 0, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
    for (const [dx, col] of [[-3, "#ffcf4a"], [0, color], [3, "#ffcf4a"]] as const) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(kx + dx, ky - 1, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff4e2";
    ctx.fillRect(kx - 0.5, ky - 6, 1, 4);
    const flick = 0.8 + Math.sin(t * 13) * 0.2;
    ctx.fillStyle = `rgba(255,200,90,${0.35 * flick})`;
    ctx.beginPath();
    ctx.arc(kx, ky - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd36a";
    ctx.beginPath();
    ctx.ellipse(kx, ky - 7, 0.9, 1.6 * flick, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
