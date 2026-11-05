import { useEffect, useRef } from "react";
import type { VisitorLook } from "../festivals/types";
import { drawPerson } from "../engine/person";

const OUTLINE = "#2a1d4a";
const PINK = "#ef6f8e";

/**
 * Riding the Ferris wheel: your cabin hangs close by in the foreground, with you sitting in it,
 * while the fair, the sea and the sky spread out far below and around (the world camera pulls back for that).
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
      // The cabin is drawn 220 units wide, then sized to the screen: about a quarter of a laptop screen,
      // a little under half a phone's width.
      const portrait = vw < vh;
      const k = Math.min(portrait ? vw * 0.46 : vw * 0.2, vh * 0.34, 300) / 220;
      const hx = portrait ? vw * 0.3 : vw * 0.18;
      const hy = portrait ? vh * 0.46 : vh * 0.36;
      drawCabin(ctx, hx, hy, k, calm ? 0 : Math.sin(t * 1.1) * 0.035, t, look);
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

/** One cabin seen from the side, hanging from its arm at (hx, hy), gently swinging. */
function drawCabin(ctx: CanvasRenderingContext2D, hx: number, hy: number, k: number, swing: number, t: number, look: VisitorLook) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // the arm it hangs from, reaching up out of view towards the hub
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 10 * k;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(hx, -10);
  ctx.stroke();
  ctx.strokeStyle = "#cfc6ef";
  ctx.lineWidth = 5 * k;
  ctx.stroke();

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(swing);
  ctx.scale(k, k);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;

  // hanger
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 22);
  ctx.stroke();
  ctx.fillStyle = "#ffcf6e";
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // posts, behind you
  ctx.fillStyle = "#c9506e";
  for (const x of [-100, 88]) {
    ctx.beginPath();
    ctx.rect(x, 44, 12, 110);
    ctx.fill();
    ctx.stroke();
  }

  // a little lantern hanging under the roof, and its warm light on you
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(52, 44);
  ctx.lineTo(52, 60);
  ctx.stroke();
  const g = ctx.createRadialGradient(52, 72, 2, 52, 72, 90);
  g.addColorStop(0, "rgba(255,214,140,0.5)");
  g.addColorStop(1, "rgba(255,214,140,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-60, -20, 220, 190);
  ctx.fillStyle = "#ffcf6e";
  ctx.beginPath();
  ctx.ellipse(52, 70, 9, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // you, sitting on the bench and looking out over the fair
  drawPerson(ctx, -26, 172, 1.9, 1, 0, 0, t, look, { sit: 1 });

  // roof
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUTLINE;
  ctx.fillStyle = PINK;
  ctx.beginPath();
  ctx.moveTo(-112, 46);
  ctx.quadraticCurveTo(0, 6, 112, 46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-114, 40, 228, 12, 5);
  ctx.fill();
  ctx.stroke();
  // little lights along the roof edge
  for (let i = 0; i < 9; i++) {
    const on = (Math.floor(t * 3) + i) % 3 === 0 ? 1 : 0.45;
    ctx.fillStyle = `rgba(255,${i % 2 ? 214 : 190},${i % 2 ? 140 : 200},${on})`;
    ctx.beginPath();
    ctx.arc(-96 + i * 24, 46, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // the basket in front of your legs
  ctx.fillStyle = PINK;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-106, 140, 212, 58, [6, 6, 26, 26]);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.roundRect(-96, 148, 192, 8, 4);
  ctx.fill();
  ctx.fillStyle = "#ffcf6e";
  ctx.beginPath();
  ctx.roundRect(-106, 170, 212, 7, 3);
  ctx.fill();
  ctx.restore();
}
