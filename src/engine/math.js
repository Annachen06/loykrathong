// Small helpers shared by the engine and festival scenes.
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
/** Deterministic random numbers, so static scenery looks identical on every load. */
export function seeded(seed) {
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
const glowSprites = new Map();
function glowSprite(rgb) {
    let c = glowSprites.get(rgb);
    if (!c) {
        c = document.createElement("canvas");
        c.width = c.height = 128;
        const g2 = c.getContext("2d");
        const g = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, `rgba(${rgb},1)`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        g2.fillStyle = g;
        g2.fillRect(0, 0, 128, 128);
        glowSprites.set(rgb, c);
    }
    return c;
}
export function glow(ctx, x, y, r, rgb, alpha) {
    if (r <= 0 || alpha <= 0)
        return;
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * Math.min(1, alpha);
    ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = before;
}
export const prefersReducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
