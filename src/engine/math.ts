// Small helpers shared by the engine and festival scenes.

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay);

/** Deterministic random numbers, so static scenery looks identical on every load. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Soft radial glow. `rgb` is "r,g,b".
 * Glows are everywhere (lanterns, krathongs, bulbs, the moon), so instead of building a new gradient
 * every time, each colour is painted once into a small picture and then stretched into place.
 */
const glowSprites = new Map<string, HTMLCanvasElement>();
function glowSprite(rgb: string) {
  let c = glowSprites.get(rgb);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = 128;
    const g2 = c.getContext("2d")!;
    const g = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    g2.fillStyle = g;
    g2.fillRect(0, 0, 128, 128);
    glowSprites.set(rgb, c);
  }
  return c;
}

export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  if (r <= 0 || alpha <= 0) return;
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * Math.min(1, alpha);
  ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = before;
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
