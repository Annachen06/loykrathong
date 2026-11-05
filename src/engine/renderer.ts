// Draws a festival scene full-screen on a canvas and runs the frame loop.
// The scene is scaled to "cover" the screen (its full height always fits) and
// the camera slides sideways to follow the visitor. On a phone in portrait you
// see a narrower slice of the same world rather than a shrunken miniature.
import type { FestivalConfig, Point, Scene } from "../festivals/types";
import { clamp, lerp } from "./math";
import type { Visitor } from "./visitor";

export type Renderer = ReturnType<typeof createRenderer>;

// Large canvases use a lot of memory on phones; cap the cached scenery layers.
const MAX_LAYER_PIXELS = 16_000_000;

export function createRenderer(canvas: HTMLCanvasElement, config: FestivalConfig, scene: Scene, visitor: Visitor) {
  const ctx = canvas.getContext("2d")!;
  const back = document.createElement("canvas");
  const front = document.createElement("canvas");
  const { width: W, height: H, focusY, portraitHeight, viewHeight } = config.layout;

  const view = { vw: 1, vh: 1, scale: 1, dpr: 1, layerK: 1, visW: 1, visH: 1 };
  const cam = { x: 0, y: 0 };
  const ripples: { x: number; y: number; life: number }[] = [];
  let following = false;
  let highlight: string | null = null;
  let raf = 0;
  let last = 0;
  let time = 0;
  let onFrame: (() => void) | null = null;

  function cameraTarget() {
    const focusX = following ? visitor.x : config.layout.spawn.x + view.visW * 0.35;
    return {
      x: clamp(focusX - view.visW / 2, 0, Math.max(0, W - view.visW)),
      y: view.visH < H * 0.9 && view.vw / view.vh < 0.9
        ? // portrait: keep the ground at the bottom, but look up when the visitor walks out on the pier
          clamp(Math.min(H - view.visH, (following ? visitor.y : H) - view.visH * 0.72), 0, H - view.visH)
        : clamp(focusY - view.visH / 2, 0, Math.max(0, H - view.visH)),
    };
  }

  function paintLayers() {
    let k = view.scale * view.dpr;
    k = Math.min(k, Math.sqrt(MAX_LAYER_PIXELS / (W * H)));
    view.layerK = k;
    for (const [layer, paint] of [[back, scene.paintBack], [front, scene.paintFront]] as const) {
      layer.width = Math.ceil(W * k);
      layer.height = Math.ceil(H * k);
      const c = layer.getContext("2d")!;
      c.setTransform(k, 0, 0, k, 0, 0);
      paint(c);
    }
  }

  function resize() {
    view.vw = Math.max(1, window.innerWidth);
    view.vh = Math.max(1, window.innerHeight);
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Portrait phones: frame the lower part of the world (beach, stalls, sea) a little closer.
    const portrait = view.vw / view.vh < 0.9;
    view.scale = Math.max(view.vw / W, view.vh / (portrait ? portraitHeight : viewHeight));
    view.visW = view.vw / view.scale;
    view.visH = view.vh / view.scale;
    canvas.width = Math.round(view.vw * view.dpr);
    canvas.height = Math.round(view.vh * view.dpr);
    paintLayers();
    const t = cameraTarget();
    cam.x = t.x;
    cam.y = t.y;
  }

  const blit = (layer: HTMLCanvasElement) => {
    const k = view.layerK;
    ctx.drawImage(layer, cam.x * k, cam.y * k, view.visW * k, view.visH * k, 0, 0, canvas.width, canvas.height);
  };

  function frame(now: number) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    time += dt;

    scene.update(dt);
    visitor.update(dt);
    const t = cameraTarget();
    const ease = Math.min(1, dt * (following ? 3.2 : 0.5));
    cam.x = lerp(cam.x, t.x, ease);
    cam.y = lerp(cam.y, t.y, ease);

    const s = view.scale * view.dpr;
    const world = () => ctx.setTransform(s, 0, 0, s, -cam.x * s, -cam.y * s);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    blit(back);
    world();
    scene.drawMiddle(ctx, time, { x: cam.x, y: cam.y, w: view.visW, h: view.visH });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    blit(front);
    world();
    scene.drawGround(ctx, time, highlight);

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.life += dt;
      if (r.life > 0.8) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(255,214,140,${0.8 * (1 - r.life / 0.8)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, 8 + r.life * 30, 3 + r.life * 9, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw people and creatures back-to-front so nearer ones overlap farther ones.
    const order: { y: number; draw: (c: CanvasRenderingContext2D, t: number) => void }[] = [...scene.actors];
    if (!scene.visitorAway()) order.push({ y: visitor.y, draw: (c, tt) => visitor.draw(c, tt) });
    order.sort((a, b) => a.y - b.y);
    for (const a of order) a.draw(ctx, time);

    scene.drawTop(ctx, time);
    onFrame?.();
    raf = requestAnimationFrame(frame);
  }

  const onResize = () => resize();

  return {
    start() {
      window.addEventListener("resize", onResize);
      resize();
      // Repaint text on the scenery once web fonts have arrived.
      document.fonts?.ready.then(() => paintLayers()).catch(() => {});
      raf = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    },
    follow(on: boolean) { following = on; },
    setHighlight(id: string | null) { highlight = id; },
    ripple(p: Point) { ripples.push({ x: p.x, y: p.y, life: 0 }); },
    setOnFrame(fn: (() => void) | null) { onFrame = fn; },
    toWorld: (sx: number, sy: number): Point => ({ x: sx / view.scale + cam.x, y: sy / view.scale + cam.y }),
    toScreen: (wx: number, wy: number): Point => ({ x: (wx - cam.x) * view.scale, y: (wy - cam.y) * view.scale }),
    view,
    cam,
  };
}
