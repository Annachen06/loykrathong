// The visitor character: simple tap-to-walk movement plus a small kawaii drawing.
import type { Point, VisitorLook, WorldLayout } from "../festivals/types";
import { clamp, dist, lerp } from "./math";
import { isWalkable, planPath } from "./walk";

const WALK_SPEED = 250; // world units per second
const JOG_SPEED = 430; // used when the trip is long, so far places don't feel slow
const JOG_DISTANCE = 700;

export type Visitor = ReturnType<typeof createVisitor>;

export function createVisitor(layout: WorldLayout, look: VisitorLook) {
  const v = {
    x: layout.spawn.x,
    y: layout.spawn.y,
    facing: 1 as 1 | -1,
    stride: 0, // 0 = standing, 1 = full walk cycle
    phase: 0,
    path: [] as Point[],
    onArrive: null as null | (() => void),
    steer: { x: 0, y: 0 }, // keyboard direction
    get moving() { return v.path.length > 0 || v.steer.x !== 0 || v.steer.y !== 0; },

    /** Walk to a point. A new call simply replaces the old trip. */
    walkTo(target: Point, onArrive?: () => void): Point {
      v.path = planPath(layout, v, target);
      v.onArrive = onArrive ?? null;
      return v.path[v.path.length - 1];
    },

    stop() { v.path = []; v.onArrive = null; },

    update(dt: number) {
      let moved = false;
      if (v.steer.x || v.steer.y) {
        v.stop();
        const len = Math.hypot(v.steer.x, v.steer.y);
        const step = WALK_SPEED * dt;
        const nx = v.x + (v.steer.x / len) * step;
        const ny = v.y + (v.steer.y / len) * step * 0.7;
        // slide along the edge instead of getting stuck
        if (isWalkable(layout, nx, ny)) { v.x = nx; v.y = ny; moved = true; }
        else if (isWalkable(layout, nx, v.y)) { v.x = nx; moved = true; }
        else if (isWalkable(layout, v.x, ny)) { v.y = ny; moved = true; }
        if (v.steer.x) v.facing = v.steer.x > 0 ? 1 : -1;
      } else if (v.path.length) {
        const next = v.path[0];
        let remaining = dist(v.x, v.y, next.x, next.y);
        for (let i = 1; i < v.path.length; i++) remaining += dist(v.path[i - 1].x, v.path[i - 1].y, v.path[i].x, v.path[i].y);
        const step = (remaining > JOG_DISTANCE ? JOG_SPEED : WALK_SPEED) * dt;
        const d = dist(v.x, v.y, next.x, next.y);
        if (d <= step) {
          v.x = next.x;
          v.y = next.y;
          v.path.shift();
          if (!v.path.length && v.onArrive) {
            const done = v.onArrive;
            v.onArrive = null;
            done();
          }
        } else {
          v.x += ((next.x - v.x) / d) * step;
          v.y += ((next.y - v.y) / d) * step;
          if (Math.abs(next.x - v.x) > 1) v.facing = next.x > v.x ? 1 : -1;
        }
        moved = true;
      }
      v.stride = lerp(v.stride, moved ? 1 : 0, Math.min(1, dt * 10));
      if (moved) v.phase += dt * 12;
    },

    draw(ctx: CanvasRenderingContext2D, t: number) {
      const d = layout.depth;
      const k = clamp((v.y - d.yBack) / (d.yFront - d.yBack), 0, 1);
      const s = lerp(d.scaleBack, d.scaleFront, k);
      // a soft moonlit ring under the visitor's feet, so you can always spot "you" in the crowd
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
      ctx.save();
      ctx.strokeStyle = `rgba(255,214,140,${0.55 + pulse * 0.3})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(v.x, v.y, (21 + pulse * 3) * s, (6.5 + pulse) * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawKawaiiVisitor(ctx, v.x, v.y, s * 1.08, v.facing, v.phase, v.stride, t, look);
    },
  };
  return v;
}

/** Feet at (x, y). About 60 world units tall at scale 1. */
export function drawKawaiiVisitor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, scale: number, facing: number,
  phase: number, stride: number, t: number, c: VisitorLook,
) {
  const swing = Math.sin(phase) * stride;
  const bob = Math.abs(Math.cos(phase)) * 2.5 * stride + Math.sin(t * 2.2) * 0.7 * (1 - stride);
  const blink = (t % 4.3) < 0.12;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(8,6,24,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(facing, 1);
  ctx.translate(0, -bob);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 2.2;

  const shape = (fill: string, path: () => void) => {
    ctx.beginPath();
    path();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  };

  // feet
  shape(c.outline, () => ctx.ellipse(-5 + swing * 5, -2, 4.5, 3, 0, 0, Math.PI * 2));
  shape(c.outline, () => ctx.ellipse(5 - swing * 5, -2, 4.5, 3, 0, 0, Math.PI * 2));

  // little skirt (pha sin) with a gold hem
  shape(c.bottom, () => {
    ctx.moveTo(-9, -24);
    ctx.lineTo(9, -24);
    ctx.quadraticCurveTo(13, -12, 12, -5);
    ctx.quadraticCurveTo(0, -2, -12, -5);
    ctx.quadraticCurveTo(-13, -12, -9, -24);
  });
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.quadraticCurveTo(0, -5, 11, -8);
  ctx.stroke();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 2.2;

  // arms swinging behind/in front of the top
  shape(c.skin, () => ctx.ellipse(-10, -24 + swing * 2, 3.2, 5.5, 0.3 + swing * 0.4, 0, Math.PI * 2));
  shape(c.top, () => {
    ctx.moveTo(-9, -24);
    ctx.quadraticCurveTo(-10, -34, 0, -35);
    ctx.quadraticCurveTo(10, -34, 9, -24);
    ctx.closePath();
  });
  shape(c.skin, () => ctx.ellipse(10, -24 - swing * 2, 3.2, 5.5, -0.3 - swing * 0.4, 0, Math.PI * 2));

  // big round head
  shape(c.skin, () => ctx.arc(0, -48, 14, 0, Math.PI * 2));
  // hair: cap + bangs + bun
  if (c.bun !== false) shape(c.hair, () => ctx.arc(-7, -61, 6.5, 0, Math.PI * 2));
  shape(c.hair, () => {
    ctx.arc(0, -48, 14.5, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(10, -52, 4, -55);
    ctx.quadraticCurveTo(0, -50, -6, -54);
    ctx.quadraticCurveTo(-11, -50, -14.3, -50);
  });
  // plumeria flower tucked behind the ear
  if (c.bun !== false) for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + t * 0.2;
    ctx.fillStyle = "#fff6f0";
    ctx.beginPath();
    ctx.ellipse(-12 + Math.cos(a) * 3.2, -57 + Math.sin(a) * 3.2, 2.6, 1.7, a, 0, Math.PI * 2);
    ctx.fill();
  }
  if (c.bun !== false) {
    ctx.fillStyle = "#f6c56b";
    ctx.beginPath();
    ctx.arc(-12, -57, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // face
  ctx.fillStyle = c.outline;
  if (blink) {
    ctx.fillRect(2, -46, 4, 1.4);
    ctx.fillRect(9, -46, 4, 1.4);
  } else {
    ctx.beginPath();
    ctx.ellipse(4, -46, 1.9, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(11, -46, 1.9, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(4.2, -47.8, 1, 1);
    ctx.fillRect(11.2, -47.8, 1, 1);
  }
  ctx.fillStyle = "rgba(242,120,150,0.55)";
  ctx.beginPath();
  ctx.ellipse(1, -41, 3, 1.8, 0, 0, Math.PI * 2);
  ctx.ellipse(13, -41, 2.4, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(7.5, -42.5, 2, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}
