// Walking together: friends who open the same invitation link ("room") see each other's characters in the fair.
// Only a position, which way they face, whether they are walking, and how the character looks goes out. No names, no chat.
//
// It talks to a Firebase Realtime Database through its plain web API (no extra library), by asking for the room a little
// more than once a second. It stays off until the owner fills in `shared.databaseUrl` in the festival config.
import type { Actor, VisitorLook, WorldLayout } from "../festivals/types";
import type { SharedConfig } from "./sharedSea";
import { drawPerson } from "./person";
import { clamp, lerp } from "./math";

export const MAX_IN_ROOM = 6;
const ROOM = /^[a-z0-9]{6,12}$/;
const COLOUR = /^#[0-9a-fA-F]{3,8}$/;
const FIGURES = ["man", "woman", "neutral"];
const OUTFITS = ["shirt-pants", "shirt-shorts", "shirt-skirt", "blouse-pants", "blouse-shorts", "blouse-skirt", "pha-sin", "dress"];
const HAIR = ["short", "crop", "bald", "long", "ponytail", "bob", "bun"];

export const friendsEnabled = (cfg: SharedConfig | undefined): cfg is SharedConfig & { databaseUrl: string } => !!cfg?.databaseUrl && /^https:\/\/[a-z0-9.-]+$/i.test(cfg.databaseUrl.replace(/\/+$/, ""));
export const validRoom = (code: string | null | undefined): code is string => !!code && ROOM.test(code);
export const newRoomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");

/** A look that came from another device is rebuilt from known parts only: colours must be colours, choices must be real choices. */
export function cleanLook(raw: unknown): VisitorLook | null {
  let o: Record<string, unknown>;
  try { o = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>); } catch { return null; }
  if (!o || typeof o !== "object") return null;
  const col = (v: unknown) => (typeof v === "string" && COLOUR.test(v) ? v : null);
  const skin = col(o.skin), hair = col(o.hair), top = col(o.top), bottom = col(o.bottom), accent = col(o.accent), outline = col(o.outline);
  if (!skin || !hair || !top || !bottom || !accent || !outline) return null;
  if (!FIGURES.includes(o.figure as string) || !OUTFITS.includes(o.outfit as string) || !HAIR.includes(o.hairStyle as string)) return null;
  const pick = <T extends string>(v: unknown, list: T[]) => (list.includes(v as T) ? (v as T) : undefined);
  const height = typeof o.height === "number" ? clamp(o.height, 0.9, 1.1) : undefined;
  return {
    skin, hair, top, bottom, accent, outline,
    figure: o.figure as VisitorLook["figure"], outfit: o.outfit as VisitorLook["outfit"], hairStyle: o.hairStyle as VisitorLook["hairStyle"],
    age: pick(o.age, ["adult", "kid", "elder"]), sleeves: pick(o.sleeves, ["short", "long", "none"]), pattern: pick(o.pattern, ["floral", "stripes", "plaid"]),
    collar: o.collar === true ? true : undefined, flower: o.flower === true ? true : undefined, glasses: o.glasses === true ? true : undefined,
    shoes: col(o.shoes) ?? undefined, height,
  };
}

type Me = { x: number; y: number; f: 1 | -1; m: boolean; look: VisitorLook };
type Friend = { id: string; tx: number; ty: number; x: number; y: number; f: 1 | -1; m: boolean; look: VisitorLook; last: number; seen: number; stride: number; phase: number };

type Options = {
  cfg: SharedConfig & { databaseUrl: string };
  room: string;
  layout: WorldLayout;
  me: () => Me;
  /** how many friends are here right now (changes only) */
  onCount?: (n: number) => void;
  /** the room would not let us in (it is full) */
  onRefused?: () => void;
};

export function createFriends({ cfg, room, layout, me, onCount, onRefused }: Options) {
  const base = cfg.databaseUrl.replace(/\/+$/, "");
  const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36)).join("");
  const roomUrl = `${base}/rooms/${room}.json`;
  const meUrl = `${base}/rooms/${room}/${id}.json`;
  const pollMs = cfg.friendPollMs ?? 700, sendMs = cfg.friendSendMs ?? 600, staleMs = cfg.friendStaleMs ?? 15000;
  const friends = new Map<string, Friend>();
  let timers: number[] = [], alive = false, refused = false, joined = false, startedAt = 0, counted = -1, lastSent = "", lastSentAt = 0, lastFrame = 0;

  const report = () => {
    if (refused) return;
    if (friends.size !== counted) { counted = friends.size; onCount?.(counted); }
  };

  const send = async (force = false) => {
    if (!alive || refused || !joined) return;
    const m = me(), now = Date.now();
    const key = `${Math.round(m.x)},${Math.round(m.y)},${m.f},${m.m}`;
    const beat = Math.min(3000, staleMs / 3); // standing still: a heartbeat well inside the time others wait before deciding we left
    if (!force && key === lastSent && now - lastSentAt < (document.hidden ? beat * 1.5 : beat)) return;
    if (document.hidden && now - lastSentAt < beat * 1.5) return;
    lastSent = key; lastSentAt = now;
    try {
      const res = await fetch(meUrl, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ x: Math.round(m.x), y: Math.round(m.y), f: m.f, m: m.m, t: now, l: JSON.stringify(m.look) }) });
      if (res.status === 401 || res.status === 403) { refused = true; timers.forEach((t) => window.clearInterval(t)); timers = []; friends.clear(); onRefused?.(); }
    } catch { /* a missed beat is fine */ }
  };

  const poll = async () => {
    if (!alive || refused || document.hidden) return;
    try {
      const res = await fetch(roomUrl);
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, Record<string, unknown>> | null;
      if (refused || !alive) return; // turned away (or left) while asking
      const now = performance.now();
      const here = new Set<string>();
      let occupied = 0;
      for (const [pid, p] of Object.entries(data ?? {})) {
        if (pid === id || !p || typeof p !== "object") continue;
        occupied++;
        const x = Number(p.x), y = Number(p.y), t = Number(p.t);
        const look = cleanLook(p.l);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(t) || !look || (p.f !== 1 && p.f !== -1)) continue;
        let fr = friends.get(pid);
        if (!fr) { fr = { id: pid, tx: x, ty: y, x, y, f: p.f, m: false, look, last: t, seen: now, stride: 0, phase: 0 }; friends.set(pid, fr); }
        if (t !== fr.last) { fr.last = t; fr.seen = now; }
        fr.tx = clamp(x, 0, layout.width); fr.ty = clamp(y, 0, layout.height); fr.f = p.f; fr.m = p.m === true; fr.look = look;
        // someone who stopped sending (closed the tab) is gone after a while, and their slot is freed
        if (now - fr.seen > staleMs) { occupied--; friends.delete(pid); fetch(`${base}/rooms/${room}/${pid}.json`, { method: "DELETE" }).catch(() => {}); continue; }
        here.add(pid);
      }
      for (const pid of [...friends.keys()]) if (!here.has(pid)) friends.delete(pid);
      // the room holds only so many people: wait a moment for the ones who left without a goodbye to clear, then give up
      if (!joined) {
        if (occupied < MAX_IN_ROOM) { joined = true; send(true); }
        else if (performance.now() - startedAt > staleMs + pollMs * 3) { refused = true; timers.forEach((t) => window.clearInterval(t)); timers = []; friends.clear(); onRefused?.(); return; }
      }
      report();
    } catch { /* offline for a moment */ }
  };

  const leave = () => { if (alive) fetch(meUrl, { method: "DELETE", keepalive: true }).catch(() => {}); };

  return {
    id,
    start() {
      if (alive) return;
      alive = true;
      startedAt = performance.now();
      poll();
      timers = [window.setInterval(send, sendMs), window.setInterval(poll, pollMs)];
      window.addEventListener("pagehide", leave);
    },
    stop() {
      leave();
      alive = false;
      timers.forEach((t) => window.clearInterval(t));
      timers = [];
      window.removeEventListener("pagehide", leave);
      friends.clear();
      report();
    },
    /** Friends as people to draw (called every frame). */
    actors(): Actor[] {
      const now = performance.now();
      const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
      lastFrame = now;
      const d = layout.depth;
      return [...friends.values()].map((fr) => {
        const dx = fr.tx - fr.x, dy = fr.ty - fr.y, dist = Math.hypot(dx, dy);
        const step = Math.min(dist, clamp(dist * 2.5, 0, 520) * dt);
        if (dist > 0.5) { fr.x += (dx / dist) * step; fr.y += (dy / dist) * step; }
        const walking = fr.m || dist > 6;
        fr.stride = lerp(fr.stride, walking ? 1 : 0, Math.min(1, dt * 10));
        if (walking) fr.phase += dt * 12;
        return {
          y: fr.y,
          draw: (ctx, t) => {
            const s = lerp(d.scaleBack, d.scaleFront, clamp((fr.y - d.yBack) / (d.yFront - d.yBack), 0, 1));
            // a soft pink ring and a little heart, so a friend stands out from the crowd (yours is gold)
            ctx.save();
            ctx.strokeStyle = "rgba(255,160,200,0.85)";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(fr.x, fr.y, 21 * s, 6.5 * s, 0, 0, Math.PI * 2);
            ctx.stroke();
            const bob = Math.sin(t * 3 + fr.x) * 3;
            ctx.fillStyle = "#ff9ec0";
            ctx.strokeStyle = "#2a1d4a";
            ctx.lineWidth = 2;
            const hx = fr.x, hy = fr.y - 86 * s + bob, r = 6 * s;
            ctx.beginPath();
            ctx.moveTo(hx, hy + r * 1.6);
            ctx.bezierCurveTo(hx - r * 2.2, hy, hx - r * 1.1, hy - r * 1.4, hx, hy - r * 0.4);
            ctx.bezierCurveTo(hx + r * 1.1, hy - r * 1.4, hx + r * 2.2, hy, hx, hy + r * 1.6);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            drawPerson(ctx, fr.x, fr.y, s * 1.08, fr.f, fr.phase, fr.stride, t, fr.look, {});
          },
        };
      });
    },
    /** For tests and curious people: where friends are. */
    peers: () => [...friends.values()].map((f) => ({ id: f.id, x: Math.round(f.x), y: Math.round(f.y), tx: f.tx, ty: f.ty, moving: f.m })),
  };
}
