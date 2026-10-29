import { useCallback, useEffect, useRef, useState } from "react";
import { activeFestival } from "./festivals";
import type { Scene } from "./festivals/types";
import { createRenderer, type Renderer } from "./engine/renderer";
import { createVisitor, type Visitor } from "./engine/visitor";
import { dist } from "./engine/math";
import { Intro } from "./components/Intro";
import { PlaceMarkers } from "./components/PlaceMarkers";
import { PlacePanel } from "./components/PlacePanel";
import { PlaceDock } from "./components/PlaceDock";
import { Hint } from "./components/Hint";

const festival = activeFestival;
const { config } = festival;
const NEAR_DISTANCE = 260; // labels appear when the visitor is this close to a place

type Engine = { renderer: Renderer; visitor: Visitor; scene: Scene };

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const markerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const nearRef = useRef<string | null>(null);

  const [entered, setEntered] = useState(false);
  const [target, setTarget] = useState<string | null>(null); // place being walked to / selected
  const [openId, setOpenId] = useState<string | null>(null); // place whose panel is open
  const [hovered, setHovered] = useState<string | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false); // briefly show every label after entering
  const [hint, setHint] = useState<{ text: string; key: number } | null>(null);

  const say = useCallback((text: string) => setHint({ text, key: Date.now() }), []);

  // ---- start the world once
  useEffect(() => {
    const canvas = canvasRef.current!;
    const scene = festival.createScene();
    const visitor = createVisitor(config.layout, config.visitor);
    const renderer = createRenderer(canvas, config, scene, visitor);
    engineRef.current = { renderer, visitor, scene };

    renderer.setOnFrame(() => {
      // keep the DOM markers pinned to their spot in the world
      const { vw, vh } = renderer.view;
      for (const p of config.places) {
        const el = markerRefs.current[p.id];
        if (!el) continue;
        const s = renderer.toScreen(p.marker.x, p.marker.y);
        const off = s.x < -60 || s.x > vw + 60 || s.y < -10 || s.y > vh;
        el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
        el.classList.toggle("offscreen", off);
      }
      let best: string | null = null;
      let bestD = NEAR_DISTANCE;
      for (const p of config.places) {
        const d = dist(visitor.x, visitor.y, p.anchor.x, p.anchor.y);
        if (d < bestD) { bestD = d; best = p.id; }
      }
      if (best !== nearRef.current) {
        nearRef.current = best;
        setNear(best);
      }
    });
    renderer.start();

    // Hooks for automated browser checks (tests/smoke.cjs).
    (window as unknown as { __moonkrade: unknown }).__moonkrade = {
      visitor,
      renderer,
      places: config.places.map((p) => ({ id: p.id, name: p.nameEn, anchor: p.anchor, marker: p.marker, hitArea: p.hitArea })),
      curios: config.curios,
      state: () => ({ x: Math.round(visitor.x), y: Math.round(visitor.y), moving: visitor.moving, cam: { ...renderer.cam }, view: { ...renderer.view }, stats: scene.stats() }),
    };
    return () => renderer.stop();
  }, []);

  useEffect(() => {
    engineRef.current?.renderer.setHighlight(hovered ?? target);
  }, [hovered, target]);

  const closePanel = useCallback(() => {
    setOpenId(null);
    setTarget(null);
  }, []);

  const visit = useCallback((id: string) => {
    const e = engineRef.current;
    const place = config.places.find((p) => p.id === id);
    if (!e || !place) return;
    setOpenId(null);
    setTarget(id);
    e.visitor.walkTo(place.anchor, () => setOpenId(id));
  }, []);

  const enter = useCallback(() => {
    if (entered) return;
    setEntered(true);
    engineRef.current?.renderer.follow(true);
    setReveal(true);
    window.setTimeout(() => setReveal(false), 4500);
    window.setTimeout(() => say(config.welcomeHint), 1200);
  }, [entered, say]);

  // ---- tapping the illustration
  const onPointerDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const e = engineRef.current;
    if (!e) return;
    if (!entered) return enter();
    const w = e.renderer.toWorld(ev.clientX, ev.clientY);
    const curio = config.curios.find((c) => dist(w.x, w.y, c.at.x, c.at.y - 12) < c.radius);
    if (curio) return e.scene.pokeCurio(curio.id);
    const place = config.places.find((p) => w.x >= p.hitArea.x0 && w.x <= p.hitArea.x1 && w.y >= p.hitArea.y0 && w.y <= p.hitArea.y1);
    if (place) return visit(place.id);
    closePanel();
    e.renderer.ripple(e.visitor.walkTo(w));
  };

  const onPointerMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const e = engineRef.current;
    if (!e || ev.pointerType !== "mouse") return;
    const w = e.renderer.toWorld(ev.clientX, ev.clientY);
    const place = config.places.find((p) => w.x >= p.hitArea.x0 && w.x <= p.hitArea.x1 && w.y >= p.hitArea.y0 && w.y <= p.hitArea.y1);
    const curio = config.curios.some((c) => dist(w.x, w.y, c.at.x, c.at.y - 12) < c.radius);
    setHovered(place?.id ?? null);
    ev.currentTarget.style.cursor = place || curio ? "pointer" : "default";
  };

  // ---- keyboard: arrows / WASD walk, Escape closes the panel
  useEffect(() => {
    const dirs: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1],
    };
    const held = new Set<string>();
    const sync = () => {
      const v = engineRef.current?.visitor;
      if (!v) return;
      let x = 0, y = 0;
      held.forEach((k) => { x += dirs[k][0]; y += dirs[k][1]; });
      v.steer.x = Math.sign(x);
      v.steer.y = Math.sign(y);
    };
    const key = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closePanel();
      const k = key(e);
      if (!dirs[k] || !entered) return;
      if ((e.target as HTMLElement).closest?.("input, textarea, button")) {
        if (k.length === 1) return; // let people type letters into fields
      }
      e.preventDefault();
      if (!held.has(k)) closePanel();
      held.add(k);
      sync();
    };
    const up = (e: KeyboardEvent) => { held.delete(key(e)); sync(); };
    const blur = () => { held.clear(); sync(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [entered, closePanel]);

  const openPlace = config.places.find((p) => p.id === openId) ?? null;

  const runAction = () => {
    const e = engineRef.current;
    const action = openPlace?.action;
    if (!e || !openPlace || !action) return;
    if (action.goTo) {
      say(action.doneHint);
      return visit(action.goTo);
    }
    if (e.scene.runAction(openPlace.id, action.id, e.visitor)) {
      // close the card so the visitor can watch what happens in the world
      say(action.doneHint);
      setOpenId(null);
    }
  };

  return (
    <main className={`app ${entered ? "entered" : ""}`}>
      <canvas
        ref={canvasRef}
        className="world"
        aria-label={`${config.brand}: ${config.edition}. An illustrated festival on a moonlit beach.`}
        role="img"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHovered(null)}
      />

      <header className="brand" aria-hidden={!entered}>
        <span className="brand-name">{config.brand}</span>
        <span className="brand-tag">{config.tagline}</span>
      </header>

      <PlaceMarkers
        places={config.places}
        refs={markerRefs}
        labelled={(id) => reveal || id === hovered || id === target || id === near}
        active={target}
        onVisit={visit}
        onHover={setHovered}
        hidden={!entered}
      />

      <PlaceDock places={config.places} active={target} onVisit={visit} hidden={!entered} />

      {openPlace && (
        <PlacePanel
          place={openPlace}
          stat={openPlace.stat ? engineRef.current?.scene.stats()[openPlace.stat.key] ?? 0 : undefined}
          onAction={runAction}
          onClose={closePanel}
        />
      )}

      <Hint hint={hint} />

      <Intro config={config} onEnter={enter} hidden={entered} />
    </main>
  );
}
