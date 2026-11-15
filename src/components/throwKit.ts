// Little helpers that make the booth games feel physical: something really flies from your hand to where you aimed,
// and a hit bursts, bounces or tumbles. Everything is plain DOM inside the game's board (position: relative; overflow: hidden).

export type Pt = { x: number; y: number }; // in pixels, relative to the board's top-left corner

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Where a pointer event is on the board. */
export function boardPoint(board: HTMLElement, e: { clientX: number; clientY: number }): Pt {
  const r = board.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

/** The centre of an element, on the board (follows moving targets: CSS transforms included). */
export function centreOf(board: HTMLElement, el: Element): Pt {
  const b = board.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
}

/** Jitter a point a little, like a hand that is not perfectly steady. */
export const wobble = (p: Pt, amount: number): Pt => ({ x: p.x + (Math.random() * 2 - 1) * amount, y: p.y + (Math.random() * 2 - 1) * amount });

/** The closest target (matching `selector`, not marked done) whose body covers the point. `reach` scales each target's size. */
export function hitAt(board: HTMLElement, selector: string, at: Pt, reach = 0.6): HTMLElement | null {
  let best: HTMLElement | null = null, bestD = Infinity;
  board.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (el.classList.contains("down") || el.classList.contains("popped")) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const c = centreOf(board, el), d = Math.hypot(c.x - at.x, c.y - at.y);
    if (d < Math.max(r.width, r.height) * reach && d < bestD) { best = el; bestD = d; }
  });
  return best;
}

type FlyOpts = { ms: number; arc?: number; className: string; startScale?: number; endScale?: number; spin?: number; keep?: boolean };

/** Throw something from `from` to `to` along a small arc, getting smaller as it goes away from you. Resolves when it lands. */
export function fly(board: HTMLElement, from: Pt, to: Pt, o: FlyOpts): Promise<HTMLElement> {
  const el = document.createElement("span");
  el.className = `projectile ${o.className}`;
  el.setAttribute("aria-hidden", "true");
  board.appendChild(el);
  const s0 = o.startScale ?? 1.4, s1 = o.endScale ?? 0.7, arc = o.arc ?? 40, spin = o.spin ?? 0;
  const at = (p: Pt, s: number, r: number) => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${s}) rotate(${r}deg)`;
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - arc };
  const end = at(to, s1, spin);
  const done = () => { el.style.transform = end; if (!o.keep) el.remove(); return el; };
  if (typeof el.animate !== "function" || reduced()) {
    el.style.transform = end;
    return new Promise((res) => window.setTimeout(() => res(done()), reduced() ? 60 : o.ms));
  }
  const a = el.animate([{ transform: at(from, s0, 0) }, { transform: at(mid, (s0 + s1) / 2, spin / 2), offset: 0.5 }, { transform: end }], { duration: o.ms, easing: "cubic-bezier(.25,.6,.45,1)", fill: "forwards" });
  return new Promise((res) => { a.onfinish = () => res(done()); a.oncancel = () => res(done()); });
}

/** A little pop of coloured bits where something was hit. */
export function burst(board: HTMLElement, at: Pt, colours: string[], n = 10) {
  if (reduced()) return;
  for (let i = 0; i < n; i++) {
    const bit = document.createElement("span");
    bit.className = "bit";
    bit.setAttribute("aria-hidden", "true");
    bit.style.background = colours[i % colours.length];
    board.appendChild(bit);
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5, dist = 22 + Math.random() * 26;
    const a = bit.animate(
      [{ transform: `translate(${at.x}px, ${at.y}px) scale(1)`, opacity: 1 }, { transform: `translate(${at.x + Math.cos(ang) * dist}px, ${at.y + Math.sin(ang) * dist + 14}px) scale(0.3)`, opacity: 0 }],
      { duration: 480 + Math.random() * 200, easing: "cubic-bezier(.2,.7,.4,1)", fill: "forwards" },
    );
    a.onfinish = () => bit.remove();
  }
}

/** A short word that floats up from a spot ("แตก!", "ปัง!", "+1"). */
export function shout(board: HTMLElement, at: Pt, text: string) {
  const t = document.createElement("span");
  t.className = "shout";
  t.textContent = text;
  t.setAttribute("aria-hidden", "true");
  board.appendChild(t);
  if (reduced() || typeof t.animate !== "function") { t.style.transform = `translate(${at.x}px, ${at.y}px) translate(-50%, -50%)`; window.setTimeout(() => t.remove(), 600); return; }
  const a = t.animate(
    [{ transform: `translate(${at.x}px, ${at.y}px) translate(-50%, -50%) scale(.6)`, opacity: 0 }, { transform: `translate(${at.x}px, ${at.y - 14}px) translate(-50%, -50%) scale(1.15)`, opacity: 1, offset: 0.25 }, { transform: `translate(${at.x}px, ${at.y - 34}px) translate(-50%, -50%) scale(1)`, opacity: 0 }],
    { duration: 800, easing: "ease-out", fill: "forwards" },
  );
  a.onfinish = () => t.remove();
}

/** Knock an element over and let it fall: away from the hit, spinning, down to the floor. */
export function tumble(el: HTMLElement, dx: number, drop: number) {
  el.classList.add("down");
  if (reduced() || typeof el.animate !== "function") return;
  const spin = (dx >= 0 ? 1 : -1) * (90 + Math.random() * 120);
  el.animate([{ transform: "translate(0, 0) rotate(0deg)" }, { transform: `translate(${dx * 0.6}px, ${-12}px) rotate(${spin * 0.4}deg)`, offset: 0.3 }, { transform: `translate(${dx}px, ${drop}px) rotate(${spin}deg)` }], { duration: 650, easing: "cubic-bezier(.3,.1,.6,1)", fill: "forwards" });
}
