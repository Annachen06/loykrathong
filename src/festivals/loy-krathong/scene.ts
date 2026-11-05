// The living part of the Loy Krathong world: everything that moves or reacts.
import type { Actor, CameraView, Point, Scene, TapResult, VisitorLook } from "../types";
import { clamp, dist, glow, lerp, prefersReducedMotion, rand, seeded } from "../../engine/math";
import { drawPerson, type Hold, type Pose } from "../../engine/person";
import { crowdLooks } from "./crowd";
import { loyKrathongConfig as config } from "./config";
import { drawKrathong, landPath, lights, paintBack, paintFront, shoreY } from "./scenery";
import { GROUND, H, HORIZON, LIGHT_STRINGS, MOON, OUTLINE, PALMS, PIER, SHORE, STAGE, TEMPLE, W, WHEEL } from "./world";

type Floater = { x: number; y: number; vx: number; vy: number; p: number; life: number; mine: boolean; lotus: string; style: string; wish: string };
const STYLES = ["banana", "banana", "lotus", "bread", "coconut"];
type Lantern = { x: number; y: number; vy: number; sway: number; p: number; s: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; rgb: string; g: number; size: number; front: boolean; flash?: boolean };
type Petal = { x: number; y: number; vx: number; vy: number; rot: number; spin: number; life: number; color: string };

const LOTUS = ["#ffa8c2", "#fff2f6", "#c9b6ff", "#ffcf6e"];

export function createLoyKrathongScene(): Scene {
  const calm = prefersReducedMotion();

  const stars: { x: number; y: number; s: number; p: number; f: number }[] = [];
  const r = seeded(11);
  while (stars.length < 240) {
    const x = r() * W, y = r() * (HORIZON - 40);
    if (x < 780 && y > 360) continue; // behind the hills
    if (dist(x, y, MOON.x, MOON.y) < MOON.r * 2.2) continue;
    stars.push({ x, y, s: 0.8 + r() * 1.8, p: r() * 6.28, f: 0.6 + r() * 2 });
  }

  const floaters: Floater[] = [];
  const lanterns: Lantern[] = [];
  const sparks: Spark[] = [];
  const petals: Petal[] = [];
  const shooting: { x: number; y: number; life: number }[] = [];
  const flies = Array.from({ length: calm ? 8 : 26 }, () => ({ x: rand(0, W), y: rand(650, 960), p: rand(0, 6.28), sp: rand(0.3, 1) }));
  const jellies = [
    { x: 1560, y: 700, p: 0, hue: "201,182,255" },
    { x: 2140, y: 740, p: 2, hue: "255,168,194" },
    { x: 1150, y: 690, p: 4, hue: "143,216,200" },
  ];
  let mineCount = 0;
  let pokes = 0;
  let nextFloater = 1, nextLantern = 0.5, nextFirework = 4, nextStar = 6;

  // Other people's krathongs: about half carry one of the clearly-labelled sample wishes.
  let wishIndex = Math.floor(Math.random() * config.sampleWishes.length);
  const nearPier = (x: number) => Math.abs(x - PIER.x0) < 260;
  const nextSampleWish = (x: number) =>
    (Math.random() < (nearPier(x) ? 0.85 : 0.5) ? config.sampleWishes[wishIndex++ % config.sampleWishes.length] : "");
  const spawnFloater = (x: number, y: number, mine: boolean, wish = mine ? "" : nextSampleWish(x), style?: string, flower?: string) =>
    floaters.push({
      x, y, vx: rand(-6, 6), vy: -rand(5, 9) * (mine ? 1.2 : 1), p: rand(0, 6.28), life: 0, mine, wish,
      style: style ?? STYLES[(Math.random() * STYLES.length) | 0],
      lotus: flower ?? LOTUS[(Math.random() * 4) | 0],
    });
  const spawnLantern = (x: number, y: number, s = rand(0.35, 0.9)) =>
    lanterns.push({ x, y, vy: -rand(10, 18), sway: rand(8, 22), p: rand(0, 6.28), s });

  for (let i = 0; i < 24; i++) spawnFloater(rand(860, 2760), rand(HORIZON + 30, SHORE - 16), false);
  // a cluster around the pier, so walking out you pass other people's wishes
  for (let i = 0; i < 10; i++) spawnFloater(rand(1700, 2110), rand(HORIZON + 50, SHORE - 20), false);
  for (let i = 0; i < 18; i++) spawnLantern(rand(700, 2780), rand(40, 500));

  function firework() {
    const x = rand(900, 2700), y = rand(110, 320);
    const rgb = ["255,207,110", "255,168,194", "201,182,255", "143,216,200"][(Math.random() * 4) | 0];
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2, v = rand(60, 105);
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rand(1.4, 2), rgb, g: 26, size: 2, front: false });
    }
    sparks.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.5, rgb, g: 0, size: 0, front: false, flash: true });
  }

  function burst(x: number, y: number, rgb: string, n: number) {
    for (let i = 0; i < n; i++) {
      sparks.push({ x: x + rand(-14, 14), y: y + rand(-8, 8), vx: rand(-40, 40), vy: -rand(30, 80), life: 0, max: rand(0.8, 1.5), rgb, g: 40, size: 2.4, front: true });
    }
  }

  // ---------------------------------------------------- curios (tappable creatures)
  const shell = { ...config.curios.find((c) => c.id === "shell")!.at, open: 0, openUntil: 0, t: 0 };
  const star = { ...config.curios.find((c) => c.id === "starfish")!.at, hop: 0, spin: 0 };
  const conch = { ...config.curios.find((c) => c.id === "conch")!.at, wiggle: 0 };
  const bottle = { ...config.curios.find((c) => c.id === "bottle")!.at, open: 0 };
  const found = new Set<string>();
  let clock = 0;

  const conchActor: Actor = {
    y: conch.y,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(conch.x, conch.y);
      ctx.fillStyle = "rgba(8,6,24,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 2, 18, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(Math.sin(conch.wiggle * 20) * 0.15 * conch.wiggle);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      ctx.fillStyle = "#ffe0c8";
      ctx.beginPath();
      ctx.moveTo(-16, -4);
      ctx.quadraticCurveTo(-10, -20, 6, -16);
      ctx.quadraticCurveTo(18, -12, 16, -2);
      ctx.quadraticCurveTo(0, 2, -16, -4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ff9ec0";
      ctx.beginPath();
      ctx.ellipse(9, -6, 5, 3.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(42,29,74,0.45)";
      ctx.lineWidth = 1.1;
      for (const dx of [-8, -2, 4]) {
        ctx.beginPath();
        ctx.moveTo(dx, -15 + Math.abs(dx) * 0.2);
        ctx.lineTo(dx - 3, -3);
        ctx.stroke();
      }
      ctx.restore();
      if (!found.has("conch")) cue(ctx, conch.x, conch.y - 28, t, 0.8);
    },
  };

  const bottleActor: Actor = {
    y: bottle.y,
    draw(ctx, t) {
      ctx.save();
      ctx.translate(bottle.x, bottle.y);
      ctx.fillStyle = "rgba(8,6,24,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 2, 20, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(-0.25 + Math.sin(t * 1.2) * 0.03);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.8;
      ctx.fillStyle = "rgba(170,230,210,0.75)";
      ctx.beginPath();
      ctx.roundRect(-16, -12, 24, 12, 5);
      ctx.roundRect(7, -9, 9, 6, 2);
      ctx.fill();
      ctx.stroke();
      if (bottle.open < 0.5) {
        ctx.fillStyle = "#b07a4a";
        ctx.fillRect(15, -8.5, 4, 5);
      }
      ctx.fillStyle = "#fff4e2";
      ctx.beginPath();
      ctx.roundRect(-11, -9, 13, 6, 2);
      ctx.fill();
      ctx.restore();
      if (bottle.open > 0.05) {
        // the rolled note pops out
        const k = bottle.open;
        ctx.save();
        ctx.translate(bottle.x + 20, bottle.y - 14 - k * 18);
        ctx.rotate(0.2);
        ctx.fillStyle = `rgba(255,244,226,${k})`;
        ctx.strokeStyle = `rgba(42,29,74,${k})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-8, -5, 16, 10, 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      if (!found.has("bottle")) cue(ctx, bottle.x, bottle.y - 30, t, 2.4);
    },
  };

  const shellActor: Actor = {
    y: shell.y,
    draw(ctx, t) {
      const o = shell.open;
      ctx.save();
      ctx.translate(shell.x, shell.y);
      ctx.fillStyle = "rgba(8,6,24,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 2, 24, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = OUTLINE;
      ctx.lineJoin = "round";
      // bottom half
      ctx.fillStyle = "#ffc2d2";
      ctx.beginPath();
      ctx.ellipse(0, -4, 22, 8, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (o > 0.05) {
        glow(ctx, 0, -8, 40, "255,246,220", 0.7 * o);
        ctx.fillStyle = "#fffaf0";
        ctx.beginPath();
        ctx.arc(0, -8, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // top half hinges open at the back
      ctx.save();
      ctx.translate(0, -4);
      ctx.scale(1, 1 - o * 1.6);
      ctx.fillStyle = "#ffd6e0";
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.bezierCurveTo(-20, -26, 20, -26, 22, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(42,29,74,0.45)";
      ctx.lineWidth = 1.2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 3, -1);
        ctx.lineTo(i * 8, -16 + Math.abs(i) * 2);
        ctx.stroke();
      }
      ctx.restore();
      // sleepy face (awake while open)
      ctx.strokeStyle = OUTLINE;
      ctx.fillStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      if (o > 0.3) {
        ctx.beginPath();
        ctx.arc(-7, 1, 1.6, 0, Math.PI * 2);
        ctx.arc(7, 1, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(-7, 0, 2.2, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.moveTo(9.2, 0.5);
        ctx.arc(7, 0, 2.2, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(239,111,142,0.5)";
      ctx.beginPath();
      ctx.ellipse(-12, 3, 2.6, 1.4, 0, 0, Math.PI * 2);
      ctx.ellipse(12, 3, 2.6, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      cue(ctx, shell.x, shell.y - 30, t, 0);
    },
  };

  const starActor: Actor = {
    y: star.y,
    draw(ctx, t) {
      const hop = Math.sin(clamp(star.hop, 0, 1) * Math.PI) * 26;
      ctx.save();
      ctx.translate(star.x, star.y);
      ctx.fillStyle = "rgba(8,6,24,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 2, 18 - hop * 0.2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(0, -12 - hop);
      ctx.rotate(star.spin + Math.sin(t * 1.5) * 0.06);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? 7 : 16;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = "#ffb08a";
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.fillStyle = OUTLINE;
      ctx.beginPath();
      ctx.arc(-3.5, -1, 1.5, 0, Math.PI * 2);
      ctx.arc(3.5, -1, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 1.5, 2, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.restore();
      cue(ctx, star.x, star.y - 38, t, 1.7);
    },
  };

  /** A tiny twinkle now and then, so curious visitors notice they can tap it. */
  function cue(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, offset: number) {
    const k = Math.max(0, Math.sin((t + offset) * 1.3)) ** 6;
    if (k < 0.02) return;
    glow(ctx, x, y, 12, "255,246,220", 0.8 * k);
    ctx.strokeStyle = `rgba(255,246,220,${k})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y);
    ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6);
    ctx.stroke();
  }

  // ---------------------------------------------------- the temple altar (โต๊ะหมู่บูชา)
  const ALTAR = { x: 246, y: 834 };
  const altar = { lit: -99, offered: [] as Hold[], glow: 0 };
  const altarActor: Actor = {
    y: ALTAR.y,
    draw(ctx, t) {
      const { x, y } = ALTAR;
      ctx.save();
      ctx.lineJoin = "round";
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(8,6,24,0.35)";
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 34, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // two-step red table with gold trim
      for (const [w, top, h] of [[30, -16, 16], [22, -28, 12]] as const) {
        ctx.fillStyle = "#b8323c";
        ctx.beginPath();
        ctx.rect(x - w, y + top, w * 2, h);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffcf6e";
        ctx.fillRect(x - w + 1, y + top + 1, w * 2 - 2, 2.5);
      }
      // a small golden Buddha image on top
      if (altar.glow > 0.01) glow(ctx, x, y - 50, 70, "255,214,140", 0.5 * altar.glow);
      ctx.fillStyle = "#f2c14e";
      ctx.beginPath();
      ctx.ellipse(x, y - 30, 12, 4, 0, 0, Math.PI * 2); // lotus base
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 11, y - 32);
      ctx.quadraticCurveTo(x - 10, y - 48, x, y - 50);
      ctx.quadraticCurveTo(x + 10, y - 48, x + 11, y - 32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y - 55, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 60);
      ctx.lineTo(x, y - 67);
      ctx.lineTo(x + 2, y - 60);
      ctx.fill();
      ctx.stroke();
      // candles on both sides
      for (const dx of [-24, 24]) {
        ctx.fillStyle = "#fff4e2";
        ctx.fillRect(x + dx - 1.6, y - 27, 3.2, 10);
        ctx.strokeRect(x + dx - 1.6, y - 27, 3.2, 10);
        const f = 0.8 + Math.sin(t * 11 + dx) * 0.2;
        glow(ctx, x + dx, y - 30, 14, "255,200,110", 0.6 * f);
        ctx.fillStyle = "#ffd36a";
        ctx.beginPath();
        ctx.ellipse(x + dx, y - 30, 1.4, 2.6 * f, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // offerings laid on the front of the table
      altar.offered.forEach((h, i) => {
        const ox = x - 16 + i * 9;
        if (h === "lotus") {
          ctx.fillStyle = "#ff9ec0";
          ctx.beginPath();
          ctx.moveTo(ox, y - 26);
          ctx.quadraticCurveTo(ox + 4, y - 20, ox, y - 16);
          ctx.quadraticCurveTo(ox - 4, y - 20, ox, y - 26);
          ctx.fill();
          ctx.stroke();
        } else {
          for (let j = 0; j < 7; j++) {
            const a = (j / 6) * Math.PI;
            ctx.fillStyle = j % 3 === 0 ? "#ff6f8e" : "#fffaf0";
            ctx.beginPath();
            ctx.arc(ox + Math.cos(a) * 3, y - 18 + Math.sin(a) * 3, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
      // incense urn, with sticks and smoke after you light them
      ctx.fillStyle = "#d8a84a";
      ctx.beginPath();
      ctx.ellipse(x, y - 6, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const lit = clock - altar.lit;
      if (lit < 90) {
        for (const dx of [-3, 0, 3]) {
          ctx.strokeStyle = "#c8503c";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x + dx, y - 8);
          ctx.lineTo(x + dx * 1.4, y - 24);
          ctx.stroke();
          glow(ctx, x + dx * 1.4, y - 24, 5, "255,140,90", 0.9);
          // curling smoke
          ctx.strokeStyle = `rgba(235,230,255,${0.35 * Math.max(0, 1 - lit / 90)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let k = 0; k <= 12; k++) {
            const sy = y - 25 - k * 5;
            const sx = x + dx * 1.4 + Math.sin(k * 0.7 - t * 2 + dx) * (2 + k * 0.6);
            k ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    },
  };

  // ---------------------------------------------------- festival-goers
  const d = config.layout.depth;
  const depthScale = (y: number) => lerp(d.scaleBack, d.scaleFront, clamp((y - d.yBack) / (d.yFront - d.yBack), 0, 1));
  // everyone gets their own outfit from crowd.ts: grown-ups and children take turns through the list
  const grownUps = crowdLooks.filter((l) => l.age !== "kid");
  const kids = crowdLooks.filter((l) => l.age === "kid");
  let nextGrownUp = 0, nextKid = 0;
  type Folk = { x: number; y: number; f: number; look: VisitorLook; idle: number; walk: boolean; x0: number; x1: number; phase: number; kid?: boolean; hold?: Hold; holdColor?: string; dance?: boolean; pose?: Pose };
  const stand = (x: number, y: number, f: number, extra: Partial<Folk> = {}): Folk => {
    const look = extra.kid ? kids[nextKid++ % kids.length] : grownUps[nextGrownUp++ % grownUps.length];
    // older men lean on a walking stick
    const hold = extra.hold ?? (look.age === "elder" && look.hairStyle === "bald" ? "cane" : undefined);
    return { x, y, f, look, idle: x % 7, walk: false, x0: 0, x1: 0, phase: 0, ...extra, hold };
  };
  const stroll = (x0: number, x1: number, y: number, extra: Partial<Folk> = {}): Folk =>
    stand(rand(x0, x1), y, Math.random() < 0.5 ? 1 : -1, { walk: true, x0, x1, ...extra });
  const balloon = (holdColor: string): Partial<Folk> => ({ kid: true, hold: "balloon", holdColor });
  const folks: Folk[] = [
    // at the temple: someone kneels at the altar, others chat nearby
    stand(352, 850, -1, { pose: { kneel: 1, wai: 1 } }), stand(170, 830, 1), stand(430, 834, -1), stand(470, 850, 1, balloon("#ffd84a")),
    // queueing for the Ferris wheel
    stand(800, 830, 1), stand(918, 834, -1), stand(950, 856, -1, balloon("#ef5a5a")),
    // the crowd watching the ram wong (the dancers themselves are in the ring below)
    stand(1070, 862, 1), stand(1120, 880, 1, { dance: true }), stand(1200, 868, -1), stand(1250, 890, -1, balloon("#5aa0ef")),
    // at the game booths
    stand(1330, 830, 1), stand(1400, 836, -1, { kid: true }), stand(1500, 832, 1), stand(1575, 840, -1),
    // carrying krathongs from the shop out to the pier
    stand(1690, 834, 1), stand(1795, 840, 1, { hold: "krathong" }), stand(1835, 836, 1, { hold: "krathong" }), stand(1975, 842, -1, { hold: "krathong" }),
    // the cotton candy stall, the memory corner, the flower stall
    stand(2070, 836, 1, balloon("#ff8fc0")), stand(2130, 840, -1, { hold: "cottonCandy" }),
    stand(2240, 846, 1), stand(2560, 834, 1), stand(2660, 838, -1),
  ];
  folks.push(
    stroll(700, 1600, 925),
    stroll(800, 1400, 955, balloon("#4fc08a")),
    stroll(1500, 2300, 945, { hold: "krathong" }),
    stroll(1960, 2700, 915),
    stroll(300, 900, 950),
    stroll(2200, 2720, 960, { kid: true, hold: "cottonCandy" }),
  );

  const folkActors: Actor[] = folks.map((p) => ({
    get y() { return p.y; },
    draw(ctx, t) {
      const sc = depthScale(p.y) * 0.95;
      drawPerson(ctx, p.x, p.y, sc, p.f, p.phase, p.walk ? 0.8 : 0, t + p.idle, p.look,
        { dance: p.dance ? 1 : 0, hold: p.hold, holdColor: p.holdColor, ...p.pose });
    },
  }));

  // ---------------------------------------------------- ram wong: dancers circle the stage, and you can join
  const ringLooks = [grownUps[1], grownUps[0], grownUps[11], grownUps[7]];
  const stageGuest = { active: false, until: 0, look: config.visitors[0].look };
  const ringActor: Actor = {
    y: GROUND - 2,
    draw(ctx, t) {
      const cx = (STAGE.x0 + STAGE.x1) / 2;
      const n = ringLooks.length + (stageGuest.active ? 1 : 0);
      const dancers = [];
      for (let i = 0; i < n; i++) {
        const a = clock * 0.45 + (i / n) * Math.PI * 2;
        const look = i < ringLooks.length ? ringLooks[i] : stageGuest.look;
        dancers.push({ a, look, guest: i >= ringLooks.length, y: STAGE.floor - 7 + Math.sin(a) * 7 });
      }
      dancers.sort((p, q) => p.y - q.y);
      const base = depthScale(GROUND) * 0.95;
      for (const d of dancers) {
        const x = cx + Math.cos(d.a) * 78;
        const sc = base * (0.94 + Math.sin(d.a) * 0.05) * (d.guest ? 1.08 : 1);
        if (d.guest) {
          ctx.strokeStyle = `rgba(255,214,140,${0.6 + 0.3 * Math.sin(t * 2.4)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(x, d.y, 20 * sc, 6 * sc, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // walking the circle anticlockwise: the front half moves left
        drawPerson(ctx, x, d.y, sc, Math.sin(d.a) > 0 ? -1 : 1, clock * 4 + d.a, 0.35, t + d.a, d.look, { dance: 1 });
      }
    },
  };

  // ---------------------------------------------------- update

  // ---------------------------------------------------- Ferris wheel and stage music
  let wheelA = 0;
  const ride = { active: false, cabin: 0, turned: 0, t: 0 };
  const RIDE_SPIN = 0.32; // one full turn takes about 20 seconds
  const you = { x: 0, y: 0 };
  let pierFade = 0;
  const rider = { look: config.visitors[0].look };
  const notes: { x: number; y: number; life: number; vx: number; c: string }[] = [];
  let nextNote = 0;

  function update(dt: number, visitor: Point) {
    clock += dt;
    you.x = visitor.x;
    you.y = visitor.y;
    const onPier = you.x > PIER.x0 - 70 && you.x < PIER.x1 + 70 && you.y < GROUND + 30;
    pierFade = lerp(pierFade, onPier ? 1 : 0, Math.min(1, dt * 3));
    // boarding takes a moment, then the wheel turns once at a gentle pace
    const spin = ride.active ? (ride.t < 1.6 ? 0.05 : RIDE_SPIN) : 0.14 * (calm ? 0.5 : 1);
    wheelA += spin * dt;
    if (ride.active) {
      ride.t += dt;
      if (ride.t >= 1.6) ride.turned += spin * dt;
      if (ride.turned >= Math.PI * 2) ride.active = false;
    }
    if (stageGuest.active && clock > stageGuest.until) stageGuest.active = false;
    altar.glow = Math.max(0, altar.glow - dt * 0.25);
    conch.wiggle = Math.max(0, conch.wiggle - dt);
    if (bottle.open > 0 && bottle.open < 1) bottle.open = Math.min(1, bottle.open + dt * 2);
    nextNote -= dt;
    if (nextNote <= 0) {
      const side = Math.random() < 0.5 ? STAGE.x0 - 19 : STAGE.x1 + 19;
      notes.push({ x: side, y: GROUND - 96, life: 0, vx: rand(-10, 10), c: ["255,207,110", "255,168,194", "201,182,255"][(Math.random() * 3) | 0] });
      nextNote = rand(0.5, 1.1);
    }
    for (const n of notes) { n.life += dt; n.y -= 26 * dt; n.x += (n.vx + Math.sin(n.life * 3) * 12) * dt; }
    for (let i = notes.length - 1; i >= 0; i--) if (notes[i].life > 3) notes.splice(i, 1);
    for (const k of floaters) {
      k.life += dt;
      k.p += dt;
      const depth = (k.y - HORIZON) / (SHORE - HORIZON);
      k.x += (k.vx + Math.sin(k.p * 0.6) * 4) * dt * (0.4 + depth);
      k.y += k.vy * dt * (0.25 + depth);
    }
    for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].y < HORIZON + 6) floaters.splice(i, 1);

    for (const l of lanterns) {
      l.p += dt;
      l.y += l.vy * dt * (0.5 + l.s * 0.6);
      l.x += Math.sin(l.p * 0.5) * l.sway * dt * 0.4 + 4 * dt;
      l.s = Math.max(0.25, l.s - dt * 0.01);
    }
    for (let i = lanterns.length - 1; i >= 0; i--) if (lanterns[i].y < -40) lanterns.splice(i, 1);

    for (const s of sparks) {
      s.life += dt;
      if (s.flash) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.985;
      s.vy = s.vy * 0.985 + s.g * dt;
    }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life > sparks[i].max) sparks.splice(i, 1);

    for (const p of petals) {
      p.life += dt;
      p.x += p.vx * dt + Math.sin(p.life * 2 + p.rot) * 10 * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    for (let i = petals.length - 1; i >= 0; i--) if (petals[i].life > 5 || petals[i].y < 0) petals.splice(i, 1);

    for (const s of shooting) s.life += dt;
    for (let i = shooting.length - 1; i >= 0; i--) if (shooting[i].life > 1) shooting.splice(i, 1);

    for (const f of flies) {
      f.p += dt * f.sp;
      f.x += Math.cos(f.p * 1.3) * 10 * dt;
      f.y += Math.sin(f.p * 0.9) * 8 * dt;
    }
    for (const j of jellies) j.p += dt;

    for (const p of folks) {
      p.idle += dt;
      if (!p.walk) continue;
      p.x += p.f * 50 * dt;
      if (p.x > p.x1) p.f = -1;
      if (p.x < p.x0) p.f = 1;
      p.phase += dt * 9;
    }

    // curios
    const wantOpen = clock < shell.openUntil ? 1 : 0;
    shell.open = lerp(shell.open, wantOpen, Math.min(1, dt * 6));
    if (star.hop > 0) {
      star.hop += dt * 1.6;
      star.spin += dt * 9;
      if (star.hop >= 1) { star.hop = 0; star.spin = 0; }
    }

    nextFloater -= dt;
    if (nextFloater <= 0 && floaters.length < 40) {
      // people keep floating krathongs, many of them from around the pier
      const x = Math.random() < 0.5 ? rand(1820, 1990) : rand(880, 2760);
      spawnFloater(x, SHORE - rand(4, 14), false);
      nextFloater = rand(1, 2.4);
    }
    nextLantern -= dt;
    if (nextLantern <= 0 && lanterns.length < 34) {
      spawnLantern(rand(800, 2780), rand(430, 560));
      nextLantern = rand(1.2, 2.8);
    }
    if (!calm) {
      nextFirework -= dt;
      if (nextFirework <= 0) { firework(); nextFirework = rand(5, 10); }
      nextStar -= dt;
      if (nextStar <= 0) { shooting.push({ x: rand(300, 2400), y: rand(30, 200), life: 0 }); nextStar = rand(7, 16); }
    }
  }

  // ---------------------------------------------------- drawing

  /**
   * The moon is very far away, so it drifts more slowly than the beach as the camera moves
   * (a gentle parallax). On narrow screens this keeps it in the sky above the visitor.
   */
  function moonAt(cam: CameraView) {
    const follow = clamp(1.15 - cam.w / W, 0, 0.95);
    const x = MOON.x + (cam.x + cam.w / 2 - MOON.x) * follow;
    const y = Math.min(cam.y + (MOON.y * cam.h) / H, HORIZON - MOON.r - 40);
    return { x, y, r: MOON.r };
  }

  let lastCam: CameraView = { x: 0, y: 0, w: W, h: H };
  function drawMiddle(ctx: CanvasRenderingContext2D, t: number, cam: CameraView) {
    lastCam = cam;
    const M = moonAt(cam);
    // Everything in this layer sits behind the land on the left: clip it out.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    landPath(ctx);
    ctx.clip("evenodd");
    for (const s of stars) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.f + s.p));
      ctx.fillStyle = `rgba(240,240,255,${a * 0.95})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.s * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const s of shooting) {
      const k = s.life;
      const x = s.x + k * 380, y = s.y + k * 140;
      const g = ctx.createLinearGradient(x - 90, y - 33, x, y);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, `rgba(255,250,230,${1 - k})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 90, y - 33);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // full moon, with the rabbit of Thai folklore faintly on its face
    glow(ctx, M.x, M.y, M.r * 6, "190,200,255", 0.18);
    glow(ctx, M.x, M.y, M.r * 2.6, "255,240,215", 0.26);
    glow(ctx, M.x, M.y, M.r * 1.8, "255,246,225", 0.38 + Math.sin(t * 0.5) * 0.04);
    const g = ctx.createRadialGradient(M.x - 24, M.y - 24, 8, M.x, M.y, M.r);
    g.addColorStop(0, "#fffdf6");
    g.addColorStop(0.75, "#fff3d6");
    g.addColorStop(1, "#f6dfb4");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(M.x, M.y, M.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(220,190,150,0.28)";
    ctx.beginPath();
    ctx.ellipse(M.x + 6, M.y + 14, 22, 16, -0.2, 0, Math.PI * 2);
    ctx.ellipse(M.x - 16, M.y - 4, 11, 10, 0, 0, Math.PI * 2);
    ctx.ellipse(M.x - 14, M.y - 30, 4.5, 15, -0.3, 0, Math.PI * 2);
    ctx.ellipse(M.x - 4, M.y - 30, 4.5, 15, 0.2, 0, Math.PI * 2);
    ctx.ellipse(M.x + 28, M.y + 22, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    for (const s of sparks) {
      if (s.front) continue;
      const k = 1 - s.life / s.max;
      if (s.flash) {
        glow(ctx, s.x, s.y, 120, s.rgb, 0.35 * k);
        glow(ctx, s.x, HORIZON + (HORIZON - s.y) * 0.25, 90, s.rgb, 0.14 * k);
        continue;
      }
      ctx.fillStyle = `rgba(${s.rgb},${k})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // water
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 40; i++) {
      const y = HORIZON + 6 + Math.pow(i / 40, 1.5) * (SHORE - HORIZON - 10);
      const depth = (y - HORIZON) / (SHORE - HORIZON);
      ctx.strokeStyle = `rgba(190,200,255,${0.06 + depth * 0.07})`;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 30) {
        const yy = y + Math.sin(x * 0.012 + t * (0.6 + depth) + i) * (1 + depth * 3);
        x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
    // the moon's path across the water
    const col = ctx.createLinearGradient(0, HORIZON, 0, SHORE);
    col.addColorStop(0, "rgba(255,240,210,0.22)");
    col.addColorStop(1, "rgba(255,240,210,0.03)");
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(M.x - 34, HORIZON);
    ctx.lineTo(M.x + 34, HORIZON);
    ctx.lineTo(M.x + 180, SHORE);
    ctx.lineTo(M.x - 180, SHORE);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 64; i++) {
      const tt = i / 64;
      const y = HORIZON + 4 + tt * (SHORE - HORIZON - 8);
      const spread = 30 + tt * 150;
      const x = M.x + Math.sin(i * 12.9898 + Math.floor(t * 1.5 + i) * 0.7) * spread;
      const a = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7));
      const w = 6 + tt * 18;
      ctx.fillStyle = `rgba(255,244,220,${a * (0.85 - tt * 0.4)})`;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y, w, 1.6 + tt * 1.6, 1);
      ctx.fill();
    }

    // jellyfish friends drifting below the surface
    for (const j of jellies) {
      const x = j.x + Math.sin(j.p * 0.3) * 30, y = j.y + Math.sin(j.p * 1.2) * 6;
      const pulse = 1 + Math.sin(j.p * 2.4) * 0.08;
      glow(ctx, x, y, 34, j.hue, 0.35);
      ctx.fillStyle = `rgba(${j.hue},0.55)`;
      ctx.beginPath();
      ctx.ellipse(x, y, 11 * pulse, 8 / pulse, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(${j.hue},0.45)`;
      ctx.lineWidth = 1.4;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * 5, y);
        ctx.quadraticCurveTo(x + k * 5 + Math.sin(j.p * 3 + k) * 3, y + 8, x + k * 5, y + 15);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(42,29,74,0.6)";
      ctx.fillRect(x - 4, y - 3, 1.6, 1.6);
      ctx.fillRect(x + 2.4, y - 3, 1.6, 1.6);
    }

    for (const k of floaters) {
      const depth = clamp((k.y - HORIZON) / (SHORE - HORIZON), 0, 1);
      const s = 0.25 + depth * 0.8;
      const bob = Math.sin(k.p * 2) * 1.2 * s;
      const flick = 0.78 + 0.22 * Math.sin(t * 13 + k.p * 7) * Math.sin(t * 7.3 + k.p);
      ctx.fillStyle = `rgba(255,200,120,${0.28 * flick})`;
      ctx.fillRect(k.x - 1.5 * s, k.y + 4 * s, 3 * s, 18 * s);
      glow(ctx, k.x, k.y - 16 * s, 34 * s * (k.mine ? 1.6 : 1), "255,200,120", 0.55 * flick);
      drawKrathong(ctx, k.x, k.y + bob, s, k.lotus, k.style);
      ctx.fillStyle = `rgba(255,240,180,${flick})`;
      ctx.beginPath();
      ctx.ellipse(k.x, k.y + bob - 29 * s, 2 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      if ((k.wish || k.mine) && depth > 0.35) {
        // a small folded note: tap this krathong to read its wish
        const ny = k.y + bob - 40 * s - Math.sin(t * 2 + k.p) * 2;
        ctx.fillStyle = k.mine ? "rgba(255,168,194,0.95)" : "rgba(255,246,225,0.9)";
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(k.x - 6 * s, ny - 4 * s, 12 * s, 8 * s, 2);
        ctx.fill();
        ctx.stroke();
      }
      if (k.mine && k.life < 3) {
        ctx.strokeStyle = `rgba(255,246,225,${0.6 * (1 - k.life / 3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(k.x, k.y + 2, 20 + k.life * 30, 5 + k.life * 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function palm(ctx: CanvasRenderingContext2D, p: (typeof PALMS)[number], t: number, i: number) {
    const sway = Math.sin(t * 0.8 + i * 1.7) * (calm ? 0 : 1);
    const tx = p.x + p.lean + sway * 3, ty = p.base - p.h;
    ctx.lineCap = "round";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(p.x, p.base);
    ctx.quadraticCurveTo(p.x + p.lean * 0.2, p.base - p.h * 0.6, tx, ty);
    ctx.stroke();
    ctx.strokeStyle = "#a07a6a";
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.strokeStyle = "rgba(42,29,74,0.35)";
    ctx.lineWidth = 2;
    for (let k = 1; k < 10; k++) {
      const u = k / 10;
      const x = lerp(lerp(p.x, p.x + p.lean * 0.2, u), lerp(p.x + p.lean * 0.2, tx, u), u);
      const y = lerp(lerp(p.base, p.base - p.h * 0.6, u), lerp(p.base - p.h * 0.6, ty, u), u);
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y + 2);
      ctx.stroke();
    }
    // fronds
    for (let f = 0; f < 9; f++) {
      const a = -Math.PI / 2 + (f - 4) * 0.42 + sway * 0.04 * (f - 4);
      const len = 92 + (f % 3) * 16;
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.5 + len * 0.38;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo((tx + ex) / 2 + Math.cos(a - 1) * 16, (ty + ey) / 2 - 28, ex, ey);
      ctx.quadraticCurveTo((tx + ex) / 2, (ty + ey) / 2 - 6, tx, ty + 4);
      ctx.fillStyle = f % 2 ? "#2f7a6a" : "#3a8a72";
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    // coconuts
    for (const [dx, dy] of [[-7, 8], [6, 10], [0, 14]]) {
      ctx.beginPath();
      ctx.arc(tx + dx, ty + dy, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#7a5a4a";
      ctx.fill();
      ctx.stroke();
    }
    return { x: tx, y: ty + 18 };
  }

  function cabinPos(i: number) {
    const a = wheelA + (i / WHEEL.cabins) * Math.PI * 2;
    return { x: WHEEL.x + Math.cos(a) * WHEEL.r, y: WHEEL.hubY + Math.sin(a) * WHEEL.r };
  }

  function drawWheel(ctx: CanvasRenderingContext2D, t: number) {
    const { x, hubY, r: R, cabins } = WHEEL;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#cfc6ef";
    for (let i = 0; i < cabins; i++) {
      const a = wheelA + (i / cabins) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, hubY);
      ctx.lineTo(x + Math.cos(a) * R, hubY + Math.sin(a) * R);
      ctx.stroke();
    }
    for (const rr of [R, R - 14]) {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(x, hubY, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#f0e6ff";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // chasing lights round the rim
    const bulbs = 36;
    for (let i = 0; i < bulbs; i++) {
      const a = wheelA * 0.5 + (i / bulbs) * Math.PI * 2;
      const on = (Math.floor(t * 6) + i) % 3 === 0 ? 1 : 0.35;
      const hue = ["255,207,110", "255,168,194", "143,216,200"][i % 3];
      const bx = x + Math.cos(a) * (R - 7), by = hubY + Math.sin(a) * (R - 7);
      glow(ctx, bx, by, 10, hue, 0.6 * on);
      ctx.fillStyle = `rgba(${hue},${0.5 + on * 0.5})`;
      ctx.beginPath();
      ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffcf6e";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, hubY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // cabins hang level as the wheel turns
    const cols = ["#ef6f8e", "#8fd8c8", "#ffcf6e", "#c9b6ff", "#5aa0ef"];
    for (let i = 0; i < cabins; i++) {
      const c = cabinPos(i);
      const sw = Math.sin(t * 1.5 + i) * 0.04;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(sw);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 8);
      ctx.stroke();
      const mine = ride.active && i === ride.cabin;
      if (mine && ride.t > 1.9) { ctx.restore(); continue; } // you're inside it: the view from the cabin is shown instead
      if (mine) {
        drawPerson(ctx, -2, 31, 0.42, 1, 0, 0, t, rider.look, { sit: 1 });
        glow(ctx, 0, 14, 30, "255,214,140", 0.4);
      }
      // roof
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.moveTo(-15, 12);
      ctx.quadraticCurveTo(0, 2, 15, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // basket
      ctx.beginPath();
      ctx.roundRect(-14, 18, 28, 14, [2, 2, 7, 7]);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-11, 12); ctx.lineTo(-11, 18);
      ctx.moveTo(11, 12); ctx.lineTo(11, 18);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawGround(ctx: CanvasRenderingContext2D, t: number, highlight: string | null) {
    // foam at the waterline
    for (let j = 0; j < 2; j++) {
      const phase = t * 0.7 + j * Math.PI;
      const reach = (Math.sin(phase) * 0.5 + 0.5) * 12;
      ctx.strokeStyle = `rgba(235,238,255,${0.3 + 0.15 * Math.cos(phase)})`;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      let pen = false;
      for (let x = 0; x <= W; x += 20) {
        if (x > PIER.x0 - 26 && x < PIER.x1 + 26) { pen = false; continue; }
        const y = shoreY(x) - 3 + reach + Math.sin(x * 0.031 + t) * 2;
        pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
    }

    // place highlight: a warm glow over the selected stall
    if (highlight) {
      const p = config.places.find((q) => q.id === highlight);
      if (p) {
        const cx = (p.hitArea.x0 + p.hitArea.x1) / 2, cy = (p.hitArea.y0 + p.hitArea.y1) / 2;
        const a = 0.22 + Math.sin(t * 3) * 0.06;
        glow(ctx, cx, cy, Math.max(p.hitArea.x1 - p.hitArea.x0, 160) * 0.75, "255,214,140", a);
      }
    }

    drawWheel(ctx, t);

    // stage bulbs blink in a running pattern
    const bulbHues = ["255,207,110", "255,120,150", "120,220,255", "160,255,170"];
    lights.bulbs.forEach((b, i) => {
      const on = (Math.floor(t * 5) + i) % 4 === 0 ? 1 : 0.45;
      glow(ctx, b.x, b.y, 12, bulbHues[b.hue], 0.6 * on);
      ctx.fillStyle = `rgba(${bulbHues[b.hue]},${0.55 + on * 0.45})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    // coloured spotlights sweeping from the stage
    if (!calm) {
      for (const [k, hue] of [[0, "255,120,200"], [1, "120,200,255"]] as const) {
        const a = -Math.PI / 2 + Math.sin(t * 0.7 + k * 2) * 0.5;
        const sx = k ? STAGE.x1 - 20 : STAGE.x0 + 20, sy = STAGE.floor - 140;
        const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * 400, sy + Math.sin(a) * 400);
        g.addColorStop(0, `rgba(${hue},0.22)`);
        g.addColorStop(1, `rgba(${hue},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a - 0.12) * 400, sy + Math.sin(a - 0.12) * 400);
        ctx.lineTo(sx + Math.cos(a + 0.12) * 400, sy + Math.sin(a + 0.12) * 400);
        ctx.closePath();
        ctx.fill();
      }
    }

    const crowns = PALMS.map((p, i) => palm(ctx, p, t, i));
    const hues = ["255,207,110", "255,168,194", "201,182,255", "143,216,200"];
    for (const [a, b, sag] of LIGHT_STRINGS) {
      const A = crowns[a], B = crowns[b];
      const n = Math.max(6, Math.round(Math.abs(B.x - A.x) / 34));
      ctx.strokeStyle = "rgba(20,14,40,0.8)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const pts: Point[] = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const x = lerp(A.x, B.x, u), y = lerp(A.y, B.y, u) + Math.sin(u * Math.PI) * sag;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        if (i > 0 && i < n) pts.push({ x, y: y + 4 });
      }
      ctx.stroke();
      pts.forEach((q, i) => {
        const al = 0.65 + 0.35 * Math.sin(t * 2 + i * 1.3 + a);
        const hue = hues[i % 4];
        glow(ctx, q.x, q.y, 14, hue, 0.55 * al);
        ctx.fillStyle = `rgba(${hue},${al})`;
        ctx.beginPath();
        ctx.ellipse(q.x, q.y, 2.6, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    lights.lamps.forEach((l, i) => {
      const a = 0.82 + 0.18 * Math.sin(t * 9 + i * 2.1) * Math.sin(t * 4.1 + i);
      glow(ctx, l.x, l.y, l.r, "255,190,110", (l.kind === "window" ? 0.2 : 0.48) * a);
      if (l.kind === "lantern") {
        ctx.fillStyle = `rgba(239,90,90,${0.95 * a})`;
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(l.x, l.y, 6.5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffcf6e";
        ctx.fillRect(l.x - 4, l.y - 9.5, 8, 2.2);
        ctx.fillRect(l.x - 4, l.y + 7.5, 8, 2.2);
      } else if (l.kind === "lamp") {
        ctx.fillStyle = `rgba(255,236,190,${a})`;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    lights.torches.forEach((l, i) => glow(ctx, l.x, l.y, 22, "255,180,90", 0.6 * (0.7 + 0.3 * Math.sin(t * 11 + i * 3.3))));

    for (const f of flies) {
      const a = 0.3 + 0.7 * Math.max(0, Math.sin(f.p * 3));
      glow(ctx, f.x, f.y, 8, "230,255,190", 0.6 * a);
    }
  }

  /** Walking out on the pier: wishes on nearby krathongs show up as little paper notes. */
  function drawPierWishes(ctx: CanvasRenderingContext2D) {
    if (pierFade < 0.02) return;
    ctx.save();
    ctx.font = "500 12px Mitr, sans-serif";
    ctx.textBaseline = "middle";
    const near = floaters
      .filter((k) => k.wish && !k.mine && k.y > HORIZON + 30)
      .map((k) => ({ k, d: dist(k.x, k.y, you.x, you.y - 80) }))
      .filter((e) => e.d < 380)
      .sort((a, b) => a.d - b.d);
    // keep the notes from covering each other or the visitor
    const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [{ x0: you.x - 26, y0: you.y - 90, x1: you.x + 26, y1: you.y }];
    const picked: Floater[] = [];
    const most = lastCam.w < 500 ? 2 : 4; // fewer notes on a phone
    for (const { k } of near) {
      if (picked.length >= most) break;
      const depth = clamp((k.y - HORIZON) / (SHORE - HORIZON), 0, 1);
      const w = Math.min(ctx.measureText(k.wish).width, 150) + 20;
      const top = k.y - 46 * (0.25 + depth * 0.8) - 58;
      const bx = clamp(k.x - w / 2, lastCam.x + 6, lastCam.x + lastCam.w - w - 6);
      const box = { x0: bx - 6, y0: top - 4, x1: bx + w + 6, y1: top + 50 };
      if (boxes.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) continue;
      boxes.push(box);
      picked.push(k);
    }
    for (const k of picked) {
      const depth = clamp((k.y - HORIZON) / (SHORE - HORIZON), 0, 1);
      const s = 0.25 + depth * 0.8;
      const a = pierFade * clamp(1.3 - dist(k.x, k.y, you.x, you.y - 80) / 380, 0.35, 1);
      // split long wishes over two lines at the space nearest the middle
      let lines = [k.wish];
      if (ctx.measureText(k.wish).width > 150) {
        const sp = [...k.wish.matchAll(/ /g)].map((m) => m.index ?? 0);
        if (sp.length) {
          const mid = k.wish.length / 2;
          const cut = sp.reduce((b, i) => (Math.abs(i - mid) < Math.abs(b - mid) ? i : b), sp[0]);
          lines = [k.wish.slice(0, cut), k.wish.slice(cut + 1)];
        }
      }
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
      const h = lines.length * 16 + 16;
      // keep the note on screen; its little tail still points at the krathong
      const x = clamp(k.x - w / 2, lastCam.x + 6, lastCam.x + lastCam.w - w - 6), y = k.y - 46 * s - h - 8;
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(255,246,225,0.95)";
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 7);
      const tx = clamp(k.x, x + 12, x + w - 12);
      ctx.moveTo(tx - 5, y + h);
      ctx.lineTo(tx, y + h + 6);
      ctx.lineTo(tx + 5, y + h);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = OUTLINE;
      ctx.textAlign = "center";
      lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y + 11 + i * 16));
      ctx.font = "400 9px Mitr, sans-serif";
      ctx.fillStyle = "#c0506e";
      ctx.fillText(config.ui.sampleTag, x + w / 2, y + h - 6);
      ctx.font = "500 12px Mitr, sans-serif";
    }
    ctx.restore();
  }

  function drawTop(ctx: CanvasRenderingContext2D, t: number) {
    drawPierWishes(ctx);
    for (const l of lanterns) {
      const s = l.s;
      const flick = 0.85 + 0.15 * Math.sin(t * 8 + l.p * 5);
      glow(ctx, l.x, l.y, 40 * s, "255,180,100", 0.55 * flick);
      ctx.fillStyle = `rgba(255,${Math.round(200 * flick)},130,0.95)`;
      ctx.beginPath();
      ctx.moveTo(l.x - 9 * s, l.y + 12 * s);
      ctx.lineTo(l.x - 12 * s, l.y - 10 * s);
      ctx.quadraticCurveTo(l.x, l.y - 20 * s, l.x + 12 * s, l.y - 10 * s);
      ctx.lineTo(l.x + 9 * s, l.y + 12 * s);
      ctx.closePath();
      ctx.fill();
    }
    for (const p of petals) {
      const k = Math.min(1, p.life, 5 - p.life);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = k;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // music notes drifting up from the stage speakers
    ctx.font = "bold 18px Mitr, sans-serif";
    ctx.textAlign = "center";
    for (const n of notes) {
      const k = Math.min(1, n.life * 2, 3 - n.life);
      ctx.fillStyle = `rgba(${n.c},${k})`;
      ctx.fillText(n.life % 2 > 1 ? "♪" : "♫", n.x, n.y);
    }
    for (const s of sparks) {
      if (!s.front) continue;
      const k = 1 - s.life / s.max;
      glow(ctx, s.x, s.y, 8, s.rgb, 0.9 * k);
    }
  }

  return {
    paintBack,
    paintFront,
    update,
    drawMiddle,
    drawGround,
    actors: [...folkActors, shellActor, starActor, conchActor, bottleActor, altarActor, ringActor],
    camera() {
      if (ride.active) {
        // look out of the cabin: away from the hub and a little down at the fair
        const c = cabinPos(ride.cabin);
        const a = Math.atan2(c.y - WHEEL.hubY, c.x - WHEEL.x);
        const k = Math.min(1, ride.t / 1.6);
        return { x: c.x + Math.cos(a) * 130 * k, y: c.y + (50 + Math.sin(a) * 50) * k, zoom: 1.7 };
      }
      // out on the pier: come in close, with the water and the krathongs ahead
      if (pierFade > 0.6 && you.y < GROUND - 6) return { x: you.x, y: you.y - 110, zoom: 1.6 };
      if (stageGuest.active) return { x: (STAGE.x0 + STAGE.x1) / 2, y: STAGE.floor - 70, zoom: 1.45 };
      return null;
    },
    drawTop,
    runAction(placeId, actionId, visitor, input) {
      if (placeId === "shore" && actionId === "float") {
        // set down just past the end of the pier, then it drifts out towards the moon
        spawnFloater(PIER.x1 + 8, PIER.y0 - 10, true, input?.wish ?? "", input?.style, input?.flower);
        mineCount++;
        burst(PIER.x1 + 8, PIER.y0 - 24, "255,214,140", 14);
        return true;
      }
      if (placeId === "temple" && actionId === "incense") {
        altar.lit = clock;
        return true;
      }
      if (placeId === "temple" && actionId === "offer") {
        if (input?.hold) altar.offered = [...altar.offered, input.hold as Hold].slice(-4);
        return true;
      }
      if (placeId === "temple" && actionId === "blessing") {
        altar.glow = 1;
        for (let i = 0; i < 40; i++) {
          sparks.push({ x: TEMPLE.chediX + rand(-50, 50), y: GROUND - rand(60, 200), vx: rand(-10, 10), vy: -rand(20, 55), life: 0, max: rand(2, 3.5), rgb: "255,214,140", g: -2, size: 2, front: true });
        }
        return true;
      }
      if (placeId === "flowers" && actionId === "petals") {
        for (let i = 0; i < (calm ? 10 : 24); i++) {
          petals.push({ x: visitor.x + rand(-40, 40), y: visitor.y - rand(30, 80), vx: rand(-12, 12), vy: -rand(18, 40), rot: rand(0, 6), spin: rand(-2, 2), life: 0, color: ["#fff6f0", "#ffd0dc", "#ffe7a3"][i % 3] });
        }
        return true;
      }
      if (placeId === "wheel" && actionId === "ride") {
        if (ride.active) return true;
        // board the cabin closest to the bottom of the wheel
        let best = 0, bestY = -Infinity;
        for (let i = 0; i < WHEEL.cabins; i++) { const c = cabinPos(i); if (c.y > bestY) { bestY = c.y; best = i; } }
        Object.assign(ride, { active: true, cabin: best, turned: 0, t: 0 });
        rider.look = visitor.look;
        return true;
      }
      if (placeId === "stage" && actionId === "dance") {
        Object.assign(stageGuest, { active: true, until: clock + 14, look: visitor.look });
        for (let i = 0; i < 6; i++) notes.push({ x: (STAGE.x0 + STAGE.x1) / 2 + rand(-60, 60), y: STAGE.floor - 90, life: 0, vx: rand(-15, 15), c: "255,168,194" });
        return true;
      }
      return false;
    },
    tap(p): TapResult | null {
      for (const c of config.curios) {
        if (dist(p.x, p.y, c.at.x, c.at.y - 12) > c.radius) continue;
        pokes++;
        if (c.id === "shell") {
          shell.openUntil = clock + 4;
          burst(shell.x, shell.y - 14, "255,246,220", 10);
        } else if (c.id === "starfish" && star.hop === 0) {
          star.hop = 0.001;
          burst(star.x, star.y - 20, "255,207,110", 8);
        } else if (c.id === "conch") {
          conch.wiggle = 1;
          burst(conch.x, conch.y - 14, "255,224,200", 8);
        } else if (c.id === "bottle" && bottle.open === 0) {
          bottle.open = 0.01;
          burst(bottle.x, bottle.y - 14, "170,230,210", 8);
        }
        if (found.has(c.id)) return {};
        found.add(c.id);
        return { found: { id: c.id, label: c.label, text: c.found } };
      }
      // a krathong on the water: read its wish
      let best: Floater | null = null, bestD = Infinity;
      for (const k of floaters) {
        if (!k.wish && !k.mine) continue;
        const depth = clamp((k.y - HORIZON) / (SHORE - HORIZON), 0, 1);
        const s = 0.25 + depth * 0.8;
        const d = dist(p.x, p.y, k.x, k.y - 16 * s);
        if (d < 22 + 26 * s && d < bestD) { bestD = d; best = k; }
      }
      if (!best) return null;
      burst(best.x, best.y - 20, "255,246,225", 6);
      return {
        bubble: best.mine
          ? { title: config.ui.wishTitle, text: best.wish || "กระทงของคุณ (ไม่ได้เขียนคำอธิษฐาน)", tag: config.ui.yourWishTag }
          : { title: config.ui.wishTitle, text: best.wish, tag: config.ui.sampleTag },
      };
    },
    visitorAway: () => ride.active || stageGuest.active,
    debug: () => ({ floaters: floaters.map((k) => ({ x: k.x, y: k.y, wish: k.wish, mine: k.mine })) }),
    stats: () => ({
      krathongsFloated: mineCount, curioTaps: pokes, riding: ride.active ? 1 : 0,
      rideView: ride.active && ride.t > 1.6 ? 1 : 0, rideProgress: ride.turned / (Math.PI * 2),
      dancing: stageGuest.active ? 1 : 0, treasures: found.size,
      focus: ride.active || stageGuest.active || (pierFade > 0.6 && you.y < GROUND - 6) ? 1 : 0,
    }),
  };
}
