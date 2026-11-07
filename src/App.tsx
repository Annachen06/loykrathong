import { useCallback, useEffect, useRef, useState } from "react";
import { activeFestival } from "./festivals";
import type { FairItem, Scene, VisitorLook } from "./festivals/types";
import { createRenderer, type Renderer } from "./engine/renderer";
import { cleanWish, createSharedSea, sharedEnabled, type SharedConfig } from "./engine/sharedSea";
import { createVisitor, type Visitor } from "./engine/visitor";
import { createSound, type Sound, type SoundName } from "./engine/sound";
import { dist } from "./engine/math";
import { Intro } from "./components/Intro";
import { PlaceMarkers } from "./components/PlaceMarkers";
import { PlacePanel } from "./components/PlacePanel";
import { MapMenu } from "./components/MapMenu";
import { StartChoice } from "./components/StartChoice";
import { Joystick } from "./components/Joystick";
import { NoteButton } from "./components/NoteButton";
import { StorySheet } from "./components/StorySheet";
import { Hint } from "./components/Hint";
import { WishBubble, type Bubble } from "./components/WishBubble";
import { FloatForm } from "./components/FloatForm";
import { LanternForm } from "./components/LanternForm";
import { FairGames, type Prize } from "./components/FairGames";
import { ItemPicker } from "./components/ItemPicker";
import { TemplePanel } from "./components/TemplePanel";
import { RideView, type RideSource } from "./components/RideView";
import { MemoryCard, type Memories } from "./components/MemoryCard";
import { drawHeldThing } from "./engine/person";
import { drawKrathong } from "./festivals/loy-krathong/scenery";

const festival = activeFestival;
const { config } = festival;
const NEAR_DISTANCE = 260; // labels appear when the visitor is this close to a place

type Engine = { renderer: Renderer; visitor: Visitor; scene: Scene; sound: Sound };

const EMPTY_MEMORIES: Memories = { wishes: [], lanterns: [], fortune: null, prayed: 0, offered: [], prizes: [], treats: [], treasures: [], rode: false, danced: false };

/** Little pictures of stall items: krathongs are drawn as on the water, everything else as held in the hand. */
const previewItem = (ctx: CanvasRenderingContext2D, item: FairItem) => {
  if (item.hold === "krathong") return drawKrathong(ctx, 32, 46, 1.35, item.color, item.id);
  if (item.wear === "flower") {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.fillStyle = "#fff6f0";
      ctx.strokeStyle = "#2a1d4a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(32 + Math.cos(a) * 8, 28 + Math.sin(a) * 8, 7, 4.6, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#f6c56b";
    ctx.beginPath();
    ctx.arc(32, 28, 4, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (item.hold) drawHeldThing(ctx, item.hold, 30, item.hold === "garland" ? 12 : 42, 2.8, item.color, item.color2);
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const markerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const nearRef = useRef<string | null>(null);

  const [entered, setEntered] = useState(false);
  const [asking, setAsking] = useState(false); // the "where to first?" question right after entering
  const [target, setTarget] = useState<string | null>(null); // place being walked to / selected
  const [openId, setOpenId] = useState<string | null>(null); // place whose panel is open
  const [hovered, setHovered] = useState<string | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false); // briefly show every label after entering
  const [hint, setHint] = useState<{ text: string; key: number } | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  // Everything below is for this visit only and stays on this device.
  const [memories, setMemories] = useState<Memories>(EMPTY_MEMORIES);
  const [bag, setBag] = useState<FairItem[]>([]); // things you're carrying
  const [hand, setHand] = useState<FairItem | null>(null); // the one shown in your hand
  const [ritual, setRitual] = useState<FairItem | null>(null); // briefly held during an activity (the siamsi cup)
  const cardHoldRef = useRef<FairItem | null>(null);
  // the shared sea: other visitors' krathongs (look only, nobody's name), when the owner has set a database up
  const sharedCfg: SharedConfig | undefined = { ...config.shared, ...(window as unknown as { __FAIR_SHARED__?: SharedConfig }).__FAIR_SHARED__ };
  const sharedOn = sharedEnabled(sharedCfg);
  const seaRef = useRef<ReturnType<typeof createSharedSea> | null>(null);
  const seaMe = useRef({ nonce: Math.random().toString(36).slice(2, 14), last: 0, sent: 0 });
  const [look, setLook] = useState(config.visitors[0].look);
  const [ride, setRide] = useState({ view: false, progress: 0, focus: false });
  const [muted, setMuted] = useState(false);
  const [story, setStory] = useState(false); // the maker's story sheet
  const sfx = useCallback((name: SoundName) => engineRef.current?.sound.play(name), []);
  // where the visitor last did something worth remembering: the souvenir card is "taken" there
  const spotRef = useRef<{ x: number; y: number } | null>(null);
  const remember = useCallback((m: Partial<Memories> | ((prev: Memories) => Partial<Memories>)) => {
    const v = engineRef.current?.visitor;
    if (v) spotRef.current = { x: v.x, y: v.y };
    setMemories((prev) => ({ ...prev, ...(typeof m === "function" ? m(prev) : m) }));
  }, []);

  const say = useCallback((text: string) => setHint({ text, key: Date.now() }), []);
  // what the Ferris wheel cabin view needs each frame: how high you are, where along the beach, and the fair to paint below
  const rideSource = useCallback((): RideSource | null => {
    const e = engineRef.current;
    if (!e) return null;
    const st = e.scene.stats();
    return { high: st.rideHigh ?? 0, x: st.rideX ?? 0, paintFair: e.renderer.paintFair };
  }, []);

  // ---- start the world once
  useEffect(() => {
    const canvas = canvasRef.current!;
    const scene = festival.createScene();
    const visitor = createVisitor(config.layout, config.visitors[0].look);
    const renderer = createRenderer(canvas, config, scene, visitor);
    const stage = config.places.find((p) => p.id === "stage");
    const sound = createSound(stage?.anchor.x ?? config.layout.width / 2);
    engineRef.current = { renderer, visitor, scene, sound };

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
      const st = scene.stats();
      // sounds: things that happened in the world, quieter the further away they are
      for (const ev of scene.events?.splice(0) ?? []) {
        sound.play(ev.name as SoundName, Math.max(0.15, 1 - Math.abs(ev.x - visitor.x) / 2000));
      }
      sound.listen(visitor.x, visitor.y, st.dancing === 1, st.rideView === 1);
      const view = st.rideView === 1, progress = Math.round((st.rideProgress ?? 0) * 20) / 20, focus = st.focus === 1;
      setRide((r) => (r.view === view && r.progress === progress && r.focus === focus ? r : { view, progress, focus }));
    });
    renderer.start();

    // Hooks for automated browser checks (tests/smoke.cjs).
    (window as unknown as { __fair: unknown }).__fair = {
      visitor,
      renderer,
      places: config.places.map((p) => ({ id: p.id, name: p.name, anchor: p.anchor, marker: p.marker, hitArea: p.hitArea })),
      curios: config.curios,
      scene,
      state: () => ({ sound: { running: sound.running, muted: sound.muted }, look: visitor.look.figure, hold: visitor.hold ?? null, act: visitor.act?.kind ?? null, x: Math.round(visitor.x), y: Math.round(visitor.y), moving: visitor.moving, cam: { ...renderer.cam }, view: { ...renderer.view }, stats: scene.stats() }),
    };
    return () => { renderer.stop(); sound.stop(); };
  }, []);

  useEffect(() => {
    engineRef.current?.renderer.setHighlight(hovered ?? target);
  }, [hovered, target]);

  useEffect(() => {
    const v = engineRef.current?.visitor;
    if (!v) return;
    const shown = ritual ?? hand;
    v.hold = shown?.hold;
    v.holdColor = shown?.color;
    v.holdColor2 = shown?.color2;
    v.holdStyle = shown?.style;
    v.look = look;
  }, [hand, ritual, look]);

  /** Pick something up: it goes in your bag and into your hand. */
  const pickUp = useCallback((item: FairItem) => {
    setBag((b) => [...b.filter((i) => i.id !== item.id && !(item.hold === "krathong" && i.hold === "krathong")), item]);
    if (item.hold) setHand(item);
    if (item.hold === "krathong" || item.hold === "lantern") cardHoldRef.current = item; // the card shows the one you chose
  }, []);
  /** Use something up (a krathong floated, a garland offered). Your hand moves to the next thing you carry. */
  const consume = useCallback((item: FairItem) => {
    setBag((b) => {
      const rest = b.filter((i) => i.id !== item.id);
      setHand((h) => (h?.id === item.id ? [...rest].reverse().find((i) => i.hold) ?? null : h));
      return rest;
    });
  }, []);

  /** Paints the real fair onto the souvenir card: where you last did something, you standing there holding your krathong. */
  const handRef = useRef(hand);
  handRef.current = hand;
  const paintCard = useCallback((canvas: HTMLCanvasElement) => {
    const e = engineRef.current;
    if (!e) return;
    const spot = spotRef.current ?? { x: e.visitor.x, y: e.visitor.y };
    const item = cardHoldRef.current ?? handRef.current;
    const held = item?.hold ? { hold: item.hold, color: item.color, color2: item.color2, style: item.style } : undefined;
    e.renderer.snapshot(canvas, spot, 1.5, (c) => e.visitor.drawStill(c, spot.x, spot.y, held));
  }, []);

  /** Ask a friend along: share the link with a short invitation (the share sheet on phones, copy to the clipboard elsewhere). */
  const invite = useCallback(async () => {
    const cfg = config.invite;
    if (!cfg) return;
    const url = window.location.origin + window.location.pathname;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: cfg.title, text: cfg.text, url });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // they closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(`${cfg.text} ${url}`);
      say(cfg.copied);
    } catch {
      say(cfg.failed);
    }
  }, [say]);

  // ---- the shared sea: fill the water with the krathongs others floated, then keep an eye out for new ones
  useEffect(() => {
    if (!entered || !sharedEnabled(sharedCfg)) return;
    const sea = createSharedSea(sharedCfg, config.krathongs.map((k) => k.id));
    seaRef.current = sea;
    let latest = 0, alive = true;
    const scene = engineRef.current?.scene;
    sea.latest(40).then((items) => {
      if (!alive) return;
      for (const k of items) latest = Math.max(latest, k.t);
      scene?.addShared?.(items.filter((k) => k.c !== seaMe.current.nonce).map((k) => ({ style: k.s, color: k.l, wish: k.w })), false);
    }).catch(() => {});
    const timer = window.setInterval(() => {
      if (document.hidden || !latest) return;
      sea.since(latest).then((items) => {
        if (!alive || !items.length) return;
        for (const k of items) latest = Math.max(latest, k.t);
        scene?.addShared?.(items.filter((k) => k.c !== seaMe.current.nonce).map((k) => ({ style: k.s, color: k.l, wish: k.w })), true);
      }).catch(() => {});
    }, Math.max(1000, sharedCfg.pollMs ?? 20000));
    return () => { alive = false; window.clearInterval(timer); seaRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered]);

  const awayMessage = () =>
    engineRef.current?.scene.stats().riding ? "กำลังนั่งชิงช้าสวรรค์อยู่ รอหมุนครบรอบก่อนนะ" : "กำลังรำวงอยู่บนเวที รอเพลงจบก่อนนะ";

  const closePanel = useCallback(() => {
    setOpenId(null);
    setTarget(null);
  }, []);

  const visit = useCallback((id: string) => {
    const e = engineRef.current;
    const place = config.places.find((p) => p.id === id);
    if (!e || !place) return;
    if (e.scene.visitorAway()) return say(awayMessage());
    setOpenId(null);
    setTarget(id);
    e.visitor.walkTo(place.anchor, () => setOpenId(id));
  }, [say]);

  const enter = useCallback((chosen?: VisitorLook) => {
    if (entered) return;
    if (chosen) setLook(chosen);
    engineRef.current?.sound.start();
    setMuted(engineRef.current?.sound.muted ?? false);
    setEntered(true);
    engineRef.current?.renderer.follow(true);
    setReveal(true);
    setAsking(true);
    window.setTimeout(() => setReveal(false), 4500);
  }, [entered]);
  const startWhere = useCallback((choice: (typeof config.startChoices)[number]) => {
    setAsking(false);
    say(choice.hint);
    if (choice.go) visit(choice.go);
  }, [say, visit]);

  // ---- tapping the illustration
  const onPointerDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const e = engineRef.current;
    if (!e) return;
    if (!entered) return enter();
    if (asking) setAsking(false); // tapping the world means "I'll look around myself"
    const w = e.renderer.toWorld(ev.clientX, ev.clientY);
    const tapped = e.scene.tap(w);
    if (tapped) {
      if (tapped.bubble) setBubble({ ...tapped.bubble, key: Date.now() });
      if (tapped.found) {
        const f = tapped.found;
        if (!f.again) {
          remember((m) => ({ treasures: [...m.treasures, f.label] }));
          sfx("chime");
        }
        const n = e.scene.stats().treasures ?? 0;
        const total = config.curios.length;
        setBubble({
          title: f.again ? f.label : `เจอ${f.label}!`,
          text: f.text,
          tag: `ของสะสม ${n}/${total}`,
          note: f.again
            ? "ชิ้นนี้เก็บไว้แล้ว ดูของที่สะสมได้ที่มุมความทรงจำ"
            : n < total
              ? `เป็นของสะสมริมหาด เก็บใส่กระเป๋าแล้ว ยังมีซ่อนอยู่บนหาดอีก ${total - n} ชิ้น`
              : "เก็บของสะสมริมหาดครบทุกชิ้นแล้ว! ไปดูที่มุมความทรงจำได้เลย",
          key: Date.now(),
        });
      }
      return;
    }
    if (e.scene.visitorAway()) return say(awayMessage());
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
      if (!dirs[k] || !entered || engineRef.current?.scene.visitorAway()) return;
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
  // the on-screen stick: moving it closes any open card and walks that way, like the arrow keys
  const steer = useCallback((x: number, y: number) => {
    const e = engineRef.current;
    if (!e || e.scene.visitorAway()) return;
    if (x || y) closePanel();
    e.visitor.steer.x = x;
    e.visitor.steer.y = y;
  }, [closePanel]);

  const runAction = () => {
    const e = engineRef.current;
    const action = openPlace?.action;
    if (!e || !openPlace || !action) return;
    if (action.goTo) {
      say(action.doneHint);
      return visit(action.goTo);
    }
    if (e.scene.runAction(openPlace.id, action.id, e.visitor)) {
      if (action.id === "ride") remember({ rode: true });
      if (action.id === "dance") remember({ danced: true });
      // close the card so the visitor can watch what happens in the world
      say(action.doneHint);
      setOpenId(null);
    }
  };

  // ---- the temple: kneel, light incense, offer flowers, bow three times
  const offering = bag.find((i) => i.offering) ?? null;
  const pray = () => {
    const e = engineRef.current;
    if (!e) return;
    setOpenId(null);
    e.scene.runAction("temple", "incense", e.visitor);
    const gift = offering;
    if (gift) {
      e.scene.runAction("temple", "offer", e.visitor, { hold: gift.hold });
      consume(gift);
    }
    say(gift ? `ถวาย${gift.name} จุดธูป แล้วพนมมือกราบสามครั้ง` : "จุดธูป แล้วพนมมือกราบสามครั้ง");
    sfx("bell");
    e.visitor.perform("pray", 7.5, -1, () => {
      e.scene.runAction("temple", "blessing", e.visitor);
      sfx("bell");
      say("ไหว้พระเสร็จแล้ว ขอให้สมหวังทุกประการ");
    });
    remember((m) => ({ prayed: m.prayed + 1, offered: gift ? [...m.offered, gift.name] : m.offered }));
  };
  const shakeFortune = () => {
    const e = engineRef.current;
    if (!e) return;
    setOpenId(null);
    setRitual({ id: "siamsi", name: "เซียมซี", text: "", hold: "siamsi" });
    say("ตั้งจิตอธิษฐาน แล้วเขย่าเซียมซีเบาๆ…");
    e.visitor.perform("fortune", 4.2, -1, () => {
      setRitual(null);
      // slips that fit who you are tonight: a student hears about exams and the road ahead, a worker about money, work and health
      const pool = config.fortunes[look.stage ?? "other"];
      const f = pool[Math.floor(Math.random() * pool.length)];
      remember({ fortune: f });
      sfx("chime");
      setBubble({ title: "เซียมซีหล่นออกมาหนึ่งไม้", text: f, tag: "เสี่ยงเซียมซีเพื่อความสนุก", key: Date.now() });
    });
  };

  // ---- the pier: kneel at the end and set your krathong on the water
  const krathong = bag.find((i) => i.hold === "krathong") ?? null;
  const floatKrathong = (wish: string, share = false) => {
    const e = engineRef.current;
    if (!e || !openPlace?.action) return;
    const k = krathong ?? config.krathongs[0];
    const doneHint = openPlace.action.doneHint;
    setOpenId(null);
    setRitual(k);
    say("นั่งลงที่ปลายสะพาน แล้วค่อยๆ วางกระทงลงน้ำ…");
    e.visitor.perform("float", 3.4, 1, () => {});
    window.setTimeout(() => {
      if (e.visitor.act?.kind !== "float") { setRitual(null); return; } // walked away: keep the krathong
      e.scene.runAction("shore", "float", e.visitor, { wish, style: k.id, flower: k.color });
      sfx("splash");
      setRitual(null);
      if (krathong) consume(krathong);
      // everyone else sees it float too: only its look goes out, never the wish
      const me = seaMe.current, now = Date.now();
      if (seaRef.current && now - me.last > (sharedCfg?.minGapMs ?? 15000) && me.sent < 12) {
        me.last = now;
        me.sent++;
        // the wish goes out only if its owner agreed AND it is plain kind words (no contact details, no blocked words)
        const shown = share && wish ? cleanWish(wish, sharedCfg?.blocked) : "";
        if (share && wish && !shown) window.setTimeout(() => say("คำอธิษฐานนี้มีข้อมูลที่อาจบอกตัวตนได้ จึงเก็บไว้แค่ในเครื่องคุณ"), 3800);
        seaRef.current.publish({ s: k.id, l: k.color ?? "#ffcf4a", t: now, c: me.nonce, ...(shown ? { w: shown } : {}) }).catch(() => {});
      }
      remember((m) => ({ wishes: [...m.wishes, wish] }));
      say(doneHint);
    }, 1500);
  };

  // ---- the lantern ground: hold your lantern up while it fills with warm air, then let it go
  const releaseLantern = (lantern: FairItem, wish: string) => {
    const e = engineRef.current;
    if (!e) return;
    setOpenId(null);
    setRitual(lantern);
    say("จุดไฟใต้โคม ชูขึ้นสูงๆ รอให้ลมร้อนพยุงโคมขึ้น…");
    e.visitor.perform("lantern", 3.2, 1, () => {});
    window.setTimeout(() => {
      if (e.visitor.act?.kind !== "lantern") { setRitual(null); return; } // walked away before letting go
      setRitual(null);
      e.scene.runAction("lanterns", "release", e.visitor, { wish, flower: lantern.color, style: lantern.style, color2: lantern.color2 });
      remember((m) => ({ lanterns: [...m.lanterns, wish] }));
      say(`ปล่อย${lantern.name}ลอยขึ้นฟ้าแล้ว แตะที่โคมเพื่ออ่านคำอธิษฐานได้นะ`);
    }, 2700);
  };

  // ---- stalls: everything is free to pick up
  const pick = (item: FairItem) => {
    const e = engineRef.current;
    if (!e) return;
    if (item.wear === "flower") {
      setLook((l) => ({ ...l, flower: true }));
      e.scene.runAction("flowers", "petals", e.visitor);
      return say(`ทัด${item.name.replace("ทัดหู", "")}ไว้ที่หูแล้ว สวยมาก`);
    }
    pickUp(item);
    sfx("pickup");
    if (item.hold === "cottonCandy" || item.hold === "shavedIce") {
      remember((m) => ({ treats: [...m.treats, item.name] }));
      say(`ได้${item.name}แล้ว อร่อยชื่นใจ`);
    } else if (item.hold === "krathong") {
      say(`ได้${item.name}แล้ว ถือไปลอยที่ปลายสะพานได้เลย`);
    } else if (item.offering) {
      e.scene.runAction("flowers", "petals", e.visitor);
      say(`ได้${item.name}แล้ว เอาไปถวายพระที่วัดได้นะ`);
    }
  };
  const onPrize = useCallback((p: Prize) => {
    remember((m) => ({ prizes: [...m.prizes, p.name] }));
    sfx("chime");
    if (p.hold) pickUp({ id: `prize-${p.name}`, name: p.name, text: "", hold: p.hold });
  }, [remember, pickUp, sfx]);

  return (
    <main className={`app ${entered ? "entered" : ""}`}>
      <canvas
        ref={canvasRef}
        className="world"
        aria-label={`${config.brand} ${config.tagline} ใต้พระจันทร์เต็มดวง`}
        role="img"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHovered(null)}
      />

      <header className="brand" aria-hidden={!entered}>
        <span className="brand-name">{config.brand}</span>
        <span className="brand-tag">{config.tagline}</span>
      </header>

      <div className="top-actions">
      {config.invite && (
        <button
          type="button"
          className={`story-toggle invite-toggle ${entered ? "" : "is-hidden"}`}
          tabIndex={entered ? 0 : -1}
          aria-label={config.invite.label}
          title={config.invite.label}
          onClick={invite}
        >
          <span aria-hidden="true">👫</span>
          <span className="story-toggle-text">ชวนเพื่อน</span>
        </button>
      )}
      {config.story && (
        <button
          type="button"
          className={`story-toggle ${entered ? "" : "is-hidden"}`}
          tabIndex={entered ? 0 : -1}
          aria-label="แตะตรงนี้เพื่ออ่านเรื่องราวของลอยริมเล"
          title="แตะตรงนี้เพื่ออ่านเรื่องราวของลอยริมเล"
          onClick={() => setStory(true)}
        >
          <span aria-hidden="true">🌙</span>
          <span className="story-toggle-text">เรื่องราว</span>
        </button>
      )}

      <button
        type="button"
        className={`sound-toggle ${entered ? "" : "is-hidden"}`}
        tabIndex={entered ? 0 : -1}
        aria-pressed={!muted}
        aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
        onClick={() => {
          const s = engineRef.current?.sound;
          if (!s) return;
          s.start();
          s.setMuted(!muted);
          setMuted(!muted);
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
          {muted
            ? <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            : <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
        </svg>
        <span>{muted ? "เปิดเสียง" : "เสียง"}</span>
      </button>
      </div>

      <PlaceMarkers
        places={config.places}
        refs={markerRefs}
        labelled={(id) => reveal || id === hovered || id === target || id === near}
        active={target}
        onVisit={visit}
        onHover={setHovered}
        hidden={!entered || ride.focus}
        ui={config.ui}
      />

      <MapMenu
        places={config.places}
        groups={config.mapGroups}
        active={target}
        onVisit={visit}
        onOpen={() => setOpenId(null)}
        hidden={!entered || asking || ride.view}
        ui={config.ui}
      />
      <Joystick onSteer={steer} hidden={!entered || asking || !!openPlace || ride.view || story} />
      <NoteButton support={config.support} inbox={sharedCfg} hidden={!entered || asking || !!openPlace || ride.view || story} />
      {config.story && <StorySheet story={config.story} open={story} onClose={() => setStory(false)} />}
      <StartChoice choices={config.startChoices} show={entered && asking} onPick={startWhere} />

      {openPlace && (
        <PlacePanel
          place={openPlace}
          ui={config.ui}
          stat={openPlace.stat ? engineRef.current?.scene.stats()[openPlace.stat.key] ?? 0 : undefined}
          onAction={runAction}
          onClose={closePanel}
        >
          {openPlace.panel === "float" && openPlace.action && (
            <FloatForm shared={sharedOn} label={openPlace.action.label} krathong={krathong?.name ?? null} onFloat={floatKrathong} onShop={() => visit("boutique")} />
          )}
          {openPlace.panel === "lantern" && openPlace.items && <LanternForm lanterns={openPlace.items} onRelease={releaseLantern} />}
          {openPlace.panel === "games" && <FairGames onPrize={onPrize} onPop={() => sfx("pop")} />}
          {openPlace.panel === "temple" && <TemplePanel offering={offering} fortune={memories.fortune} onPray={pray} onFortune={shakeFortune} />}
          {openPlace.panel === "krathongShop" && (
            <>
              <ItemPicker items={config.krathongs} owned={krathong ? [krathong.id] : []} pickLabel="เลือก" onPick={pick} preview={previewItem} />
              {krathong && <button type="button" className="panel-action" onClick={() => visit("shore")}>ถือ{krathong.name}ไปลอยเลย</button>}
            </>
          )}
          {(openPlace.panel === "flowers" || openPlace.panel === "food") && openPlace.items && (
            <ItemPicker
              items={openPlace.items}
              owned={[...bag.map((i) => i.id), ...(look.flower ? ["plumeria"] : [])]}
              pickLabel={openPlace.panel === "food" ? "รับ" : "เลือก"}
              onPick={pick}
              preview={previewItem}
            />
          )}
          {openPlace.panel === "memory" && (
            <MemoryCard
              memories={memories}
              paintScene={paintCard}
              brand={config.brand}
              onInvite={config.invite ? invite : undefined}
              treasureTotal={config.curios.length}
            />
          )}
        </PlacePanel>
      )}

      <RideView show={ride.view} progress={ride.progress} source={rideSource} />
      <Hint hint={hint} />
      <WishBubble bubble={bubble} onClose={() => setBubble(null)} />

      <Intro config={config} onEnter={enter} hidden={entered} onStory={config.story ? () => setStory(true) : undefined} />
    </main>
  );
}
