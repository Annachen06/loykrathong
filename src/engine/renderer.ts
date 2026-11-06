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
  // The scene always paints every pixel, so the canvas needs no transparency (cheaper to draw and show).
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const back = document.createElement("canvas");
  const front = document.createElement("canvas");
  const { width: W, height: H, focusY, portraitHeight, viewHeight } = config.layout;

  const view = { vw: 1, vh: 1, scale: 1, dpr: 1, layerK: 1, visW: 1, visH: 1, zoom: 1 };
  // The cached front layer is empty above the tallest building; only the part with something in it is copied each frame.
  let frontTop = 0;

  // Smoothness first: if frames come too slowly, draw at a slightly lower resolution (sharp screens have pixels to spare).
  // Steps only go down, after two slow stretches in a row, so a single hiccup doesn't blur the picture.
  const QUALITY = [2, 1.5, 1.25, 1];
  let quality = 0;
  let slowRuns = 0;
  let sampleFrom = 0;
  const samples: number[] = [];
  function watchSpeed(dt: number, now: number) {
    if (document.hidden || now < sampleFrom) { samples.length = 0; return; }
    samples.push(dt);
    if (samples.length < 90) return;
    const sorted = samples.slice().sort((a, b) => a - b);
    const typical = sorted[Math.floor(sorted.length / 2)];
    samples.length = 0;
    slowRuns = typical > 0.0185 ? slowRuns + 1 : 0; // under about 55 frames a second
    if (slowRuns >= 2 && renderDpr() > 1) {
      while (quality < QUALITY.length - 1 && QUALITY[quality] >= renderDpr()) quality++;
      slowRuns = 0;
      resize(false); // repaint the scenery at the new resolution, but keep the camera where it is
    }
  }
  const renderDpr = () => Math.min(window.devicePixelRatio || 1, QUALITY[quality]);
  const cam = { x: 0, y: 0 };
  const ripples: { x: number; y: number; life: number }[] = [];
  let following = false;
  let highlight: string | null = null;
  let raf = 0;
  let last = 0;
  let time = 0;
  let onFrame: (() => void) | null = null;

  function cameraTarget() {
    // the scene can take over the camera, e.g. to ride along in a Ferris wheel cabin
    const over = following ? scene.camera?.() : null;
    if (over) {
      return {
        x: clamp(over.x - view.visW / 2, 0, Math.max(0, W - view.visW)),
        // a wide view may show more height than the world has: keep the ground at the bottom, open sky above
        y: over.wide && view.visH > H ? H - view.visH : clamp(over.y - view.visH / 2, 0, Math.max(0, H - view.visH)),
      };
    }
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
    let k = view.scale * view.dpr; // same resolution as the screen, so copying it each frame is a plain 1:1 copy
    k = Math.min(k, Math.sqrt(MAX_LAYER_PIXELS / (W * H)));
    view.layerK = k;
    for (const [layer, paint] of [[back, scene.paintBack], [front, scene.paintFront]] as const) {
      layer.width = Math.ceil(W * k);
      layer.height = Math.ceil(H * k);
      const c = layer.getContext("2d")!;
      c.setTransform(k, 0, 0, k, 0, 0);
      paint(c);
    }
    frontTop = firstPaintedRow(front) / k;
  }

  /** The highest row of a layer with anything drawn on it (checked on a small copy, once per repaint). */
  function firstPaintedRow(layer: HTMLCanvasElement) {
    try {
      const sw = 64, sh = 128;
      const probe = document.createElement("canvas");
      probe.width = sw;
      probe.height = sh;
      const p = probe.getContext("2d", { willReadFrequently: true })!;
      p.drawImage(layer, 0, 0, sw, sh);
      const data = p.getImageData(0, 0, sw, sh).data;
      for (let row = 0; row < sh; row++) {
        for (let col = 0; col < sw; col++) if (data[(row * sw + col) * 4 + 3] > 0) return Math.max(0, ((row - 1) / sh) * layer.height);
      }
    } catch {
      /* reading pixels can be refused; then copy the whole layer */
    }
    return 0;
  }

  function resize(snap = true) {
    view.vw = Math.max(1, window.innerWidth);
    view.vh = Math.max(1, window.innerHeight);
    view.dpr = renderDpr();
    // Portrait phones: frame the lower part of the world (beach, stalls, sea) a little closer.
    const portrait = view.vw / view.vh < 0.9;
    view.scale = Math.max(view.vw / W, view.vh / (portrait ? portraitHeight : viewHeight));
    view.visW = view.vw / (view.scale * view.zoom);
    view.visH = view.vh / (view.scale * view.zoom);
    canvas.width = Math.round(view.vw * view.dpr);
    canvas.height = Math.round(view.vh * view.dpr);
    paintLayers();
    sampleFrom = performance.now() + 2000; // let things settle before judging speed again
    if (!snap) return;
    const t = cameraTarget();
    cam.x = t.x;
    cam.y = t.y;
  }

  // Copy the part of a cached layer that is on screen. The camera can look past the world's edges
  // (the wide view from the Ferris wheel), so only the overlapping part is copied.
  const blit = (layer: HTMLCanvasElement, top = 0) => {
    const k = view.layerK;
    const x0 = Math.max(0, cam.x), y0 = Math.max(top, cam.y);
    const x1 = Math.min(W, cam.x + view.visW), y1 = Math.min(H, cam.y + view.visH);
    if (x1 <= x0 || y1 <= y0) return;
    const s = view.scale * view.zoom * view.dpr;
    ctx.drawImage(layer, x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, (x0 - cam.x) * s, (y0 - cam.y) * s, (x1 - x0) * s, (y1 - y0) * s);
  };

  function frame(now: number) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    time += dt;
    watchSpeed(dt, now);

    scene.update(dt, visitor);
    visitor.update(dt);
    const over = following ? scene.camera?.() : null;
    let wantZoom = over?.zoom || 1;
    if (over?.wide) wantZoom = Math.max(wantZoom, view.vw / (view.scale * W)); // never wider than the world
    else if (view.vw / view.vh < 0.9) wantZoom = 1 + (wantZoom - 1) * 0.6; // phones are already close in
    view.zoom = lerp(view.zoom, wantZoom, Math.min(1, dt * 1.6));
    if (Math.abs(view.zoom - wantZoom) < 0.002) view.zoom = wantZoom;
    view.visW = view.vw / (view.scale * view.zoom);
    view.visH = view.vh / (view.scale * view.zoom);
    const t = cameraTarget();
    const ease = Math.min(1, dt * (following ? 3.2 : 0.5));
    cam.x = lerp(cam.x, t.x, ease);
    cam.y = lerp(cam.y, t.y, ease);
    // never show past the sides or the bottom of the world while easing (zoom and camera move together)
    cam.x = clamp(cam.x, 0, Math.max(0, W - view.visW));
    cam.y = view.visH <= H ? clamp(cam.y, 0, H - view.visH) : Math.min(cam.y, H - view.visH);

    if (over?.cover) {
      // a full-screen view covers the world (the Ferris wheel cabin): keep time moving, skip the drawing
      onFrame?.();
      raf = requestAnimationFrame(frame);
      return;
    }

    const s = view.scale * view.zoom * view.dpr;
    const world = () => ctx.setTransform(s, 0, 0, s, -cam.x * s, -cam.y * s);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (cam.x < 0 || cam.y < 0 || cam.x + view.visW > W + 0.5 || cam.y + view.visH > H + 0.5) {
      // looking past the edge of the world (the wide view from the Ferris wheel): night sky there
      ctx.fillStyle = config.layout.skyTop ?? "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    blit(back);
    world();
    scene.drawMiddle(ctx, time, { x: cam.x, y: cam.y, w: view.visW, h: view.visH });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    blit(front, frontTop);
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
    /**
     * Paint the fair (stalls, palms, lights and the people in it) onto another canvas whose transform is already
     * set to world units: used by the view from the Ferris wheel cabin, which sees the fair from up high.
     * Only world x from x0 to x1 is needed.
     */
    paintFair(c: CanvasRenderingContext2D, x0: number, x1: number) {
      const k = view.layerK;
      const a = Math.max(0, x0), b = Math.min(W, x1);
      if (b <= a) return;
      c.drawImage(front, a * k, frontTop * k, (b - a) * k, (H - frontTop) * k, a, frontTop, b - a, H - frontTop);
      scene.drawGround(c, time, null);
      const order = [...scene.actors].sort((p, q) => p.y - q.y);
      for (const act of order) act.draw(c, time);
    },
    setHighlight(id: string | null) { highlight = id; },
    ripple(p: Point) { ripples.push({ x: p.x, y: p.y, life: 0 }); },
    setOnFrame(fn: (() => void) | null) { onFrame = fn; },
    toWorld: (sx: number, sy: number): Point => ({ x: sx / (view.scale * view.zoom) + cam.x, y: sy / (view.scale * view.zoom) + cam.y }),
    toScreen: (wx: number, wy: number): Point => ({ x: (wx - cam.x) * view.scale * view.zoom, y: (wy - cam.y) * view.scale * view.zoom }),
    view,
    cam,
  };
}
