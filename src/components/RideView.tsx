import { useEffect, useRef } from "react";
import type { VisitorLook } from "../festivals/types";
import { drawPerson } from "../engine/person";

const OUTLINE = "#2a1d4a";
const PINK = "#ef6f8e";

/**
 * Riding the Ferris wheel, from inside the cabin: you sit on the bench by the big window, and through the glass
 * the fair, the sea and the sky spread out far below (the world camera pulls back for that).
 * The cabin is about as big as a small room, so you look big and the fair looks small and far away.
 */
export function RideView({ show, progress, look }: { show: boolean; progress: number; look: VisitorLook }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!show) return;
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    let raf = 0;
    const t0 = performance.now();
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = c.clientWidth, vh = c.clientHeight;
      if (c.width !== Math.round(vw * dpr) || c.height !== Math.round(vh * dpr)) {
        c.width = Math.round(vw * dpr);
        c.height = Math.round(vh * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      drawCabin(ctx, vw, vh, t, look, calm);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [show, look]);

  return (
    <div className={`ride-view ${show ? "on" : ""}`} aria-hidden={!show}>
      <canvas ref={ref} className="ride-cabin" />
      <p className="ride-caption" role="status">
        ยิ่งสูงยิ่งเห็นไกล · หมุนไปแล้ว {Math.round(progress * 100)}%
      </p>
    </div>
  );
}

/** The inside of the cabin around the window, and you on the bench. */
function drawCabin(ctx: CanvasRenderingContext2D, vw: number, vh: number, t: number, look: VisitorLook, calm: boolean) {
  const portrait = vw < vh;
  const sway = calm ? 0 : Math.sin(t * 1.1) * 2;
  const roof = Math.max(26, vh * 0.065);
  const post = Math.max(14, vw * 0.022);
  const railY = vh * (portrait ? 0.7 : 0.66);
  const floor = vh - Math.max(18, vh * 0.045);

  // the glass: a faint tint below the rail and two soft reflections
  ctx.fillStyle = "rgba(30, 30, 90, 0.16)";
  ctx.fillRect(post, railY, vw - post * 2, floor - railY);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  for (const [x0, w] of [[0.55, 0.06], [0.64, 0.02]] as const) {
    ctx.beginPath();
    ctx.moveTo(vw * x0, roof);
    ctx.lineTo(vw * (x0 + w), roof);
    ctx.lineTo(vw * (x0 + w - 0.12), railY);
    ctx.lineTo(vw * (x0 - 0.12), railY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.lineJoin = "round";
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  const block = (fill: string, path: () => void) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    path();
    ctx.fill();
    ctx.stroke();
  };
  // the rail across the window, at the height of your chest when sitting
  block(PINK, () => ctx.roundRect(post - 4, railY + sway * 0.3, vw - post * 2 + 8, Math.max(10, vh * 0.016), 5));
  // floor
  block("#b8506e", () => ctx.rect(-4, floor, vw + 8, vh - floor + 4));
  // posts at the corners of the window
  block(PINK, () => ctx.rect(-4, 0, post + 4, vh));
  block(PINK, () => ctx.rect(vw - post, 0, post + 4, vh));
  // roof, curving down at the corners
  block(PINK, () => {
    ctx.moveTo(-4, -4);
    ctx.lineTo(vw + 4, -4);
    ctx.lineTo(vw + 4, roof * 1.5);
    ctx.quadraticCurveTo(vw / 2, roof * 0.55, -4, roof * 1.5);
    ctx.closePath();
  });
  // a little lantern hanging from the roof, with its light
  const lx = vw * (portrait ? 0.86 : 0.3), ly = roof * 1.05 + vh * (portrait ? 0.11 : 0.05);
  ctx.beginPath();
  ctx.moveTo(lx, roof);
  ctx.lineTo(lx, ly - 10);
  ctx.lineWidth = 2;
  ctx.stroke();
  const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, vh * 0.3);
  g.addColorStop(0, "rgba(255,214,140,0.32)");
  g.addColorStop(1, "rgba(255,214,140,0)");
  ctx.fillStyle = g;
  ctx.fillRect(lx - vh * 0.3, ly - vh * 0.3, vh * 0.6, vh * 0.6);
  ctx.lineWidth = 3;
  block("#ffcf6e", () => ctx.ellipse(lx, ly, 9, 12, 0, 0, Math.PI * 2));

  // you, on the bench by the window, looking out
  const s = (portrait ? vh * 0.22 : vh * 0.33) / 58;
  const bx = post + (portrait ? vw * 0.02 : vw * 0.05);
  const seatY = floor - s * 16;
  block("#c9506e", () => ctx.roundRect(post - 4, seatY, s * 34 + bx - post, floor - seatY + 4, [8, 8, 0, 0]));
  drawPerson(ctx, bx + s * 12, floor, s, 1, 0, 0, t, look, { sit: 1 });
}
