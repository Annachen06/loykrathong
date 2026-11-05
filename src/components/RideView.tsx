import { useEffect, useRef } from "react";
import type { VisitorLook } from "../festivals/types";
import { drawPerson } from "../engine/person";

/** Inside the Ferris wheel cabin: the cabin's roof, posts and rail frame the real view outside, which turns as the wheel does. */
export function RideView({ show, progress, look }: { show: boolean; progress: number; look: VisitorLook }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!show) return;
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 180 * dpr;
    c.height = 220 * dpr;
    const t0 = performance.now();
    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, 180, 220);
      drawPerson(ctx, 70, 214, 2.6, 1, 0, 0, t, look, { sit: 1 });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [show, look]);

  return (
    <div className={`ride-view ${show ? "on" : ""}`} aria-hidden={!show}>
      <div className="ride-roof" />
      <div className="ride-post left" />
      <div className="ride-post right" />
      <div className="ride-rail">
        <canvas ref={ref} className="ride-rider" width={180} height={220} />
      </div>
      <p className="ride-caption" role="status">
        กำลังนั่งชิงช้าสวรรค์ · หมุนไปแล้ว {Math.round(progress * 100)}%
      </p>
    </div>
  );
}
