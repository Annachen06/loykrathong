import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { activeFestival } from "./festivals";
import { createRenderer } from "./engine/renderer";
import { createVisitor } from "./engine/visitor";
import { createSound } from "./engine/sound";
import { dist } from "./engine/math";
import { Intro } from "./components/Intro";
import { PlaceMarkers } from "./components/PlaceMarkers";
import { PlacePanel } from "./components/PlacePanel";
import { MapMenu } from "./components/MapMenu";
import { Hint } from "./components/Hint";
import { WishBubble } from "./components/WishBubble";
import { FloatForm } from "./components/FloatForm";
import { LanternForm } from "./components/LanternForm";
import { FairGames } from "./components/FairGames";
import { ItemPicker } from "./components/ItemPicker";
import { TemplePanel } from "./components/TemplePanel";
import { RideView } from "./components/RideView";
import { MemoryCard } from "./components/MemoryCard";
import { drawHeldThing } from "./engine/person";
import { drawKrathong } from "./festivals/loy-krathong/scenery";
const festival = activeFestival;
const { config } = festival;
const NEAR_DISTANCE = 260; // labels appear when the visitor is this close to a place
const EMPTY_MEMORIES = { wishes: [], lanterns: [], fortune: null, prayed: 0, offered: [], prizes: [], treats: [], treasures: [], rode: false, danced: false };
/** Little pictures of stall items: krathongs are drawn as on the water, everything else as held in the hand. */
const previewItem = (ctx, item) => {
    if (item.hold === "krathong")
        return drawKrathong(ctx, 32, 46, 1.35, item.color, item.id);
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
    if (item.hold)
        drawHeldThing(ctx, item.hold, 30, item.hold === "garland" ? 12 : 42, 2.8, item.color, item.color2);
};
export default function App() {
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const markerRefs = useRef({});
    const nearRef = useRef(null);
    const [entered, setEntered] = useState(false);
    const [target, setTarget] = useState(null); // place being walked to / selected
    const [openId, setOpenId] = useState(null); // place whose panel is open
    const [hovered, setHovered] = useState(null);
    const [near, setNear] = useState(null);
    const [reveal, setReveal] = useState(false); // briefly show every label after entering
    const [hint, setHint] = useState(null);
    const [bubble, setBubble] = useState(null);
    // Everything below is for this visit only and stays on this device.
    const [memories, setMemories] = useState(EMPTY_MEMORIES);
    const [bag, setBag] = useState([]); // things you're carrying
    const [hand, setHand] = useState(null); // the one shown in your hand
    const [ritual, setRitual] = useState(null); // briefly held during an activity (the siamsi cup)
    const [look, setLook] = useState(config.visitors[0].look);
    const [ride, setRide] = useState({ view: false, progress: 0, focus: false });
    const [muted, setMuted] = useState(false);
    const sfx = useCallback((name) => engineRef.current?.sound.play(name), []);
    const remember = useCallback((m) => setMemories((prev) => ({ ...prev, ...(typeof m === "function" ? m(prev) : m) })), []);
    const say = useCallback((text) => setHint({ text, key: Date.now() }), []);
    // what the Ferris wheel cabin view needs each frame: how high you are, where along the beach, and the fair to paint below
    const rideSource = useCallback(() => {
        const e = engineRef.current;
        if (!e)
            return null;
        const st = e.scene.stats();
        return { high: st.rideHigh ?? 0, x: st.rideX ?? 0, paintFair: e.renderer.paintFair };
    }, []);
    // ---- start the world once
    useEffect(() => {
        const canvas = canvasRef.current;
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
                if (!el)
                    continue;
                const s = renderer.toScreen(p.marker.x, p.marker.y);
                const off = s.x < -60 || s.x > vw + 60 || s.y < -10 || s.y > vh;
                el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
                el.classList.toggle("offscreen", off);
            }
            let best = null;
            let bestD = NEAR_DISTANCE;
            for (const p of config.places) {
                const d = dist(visitor.x, visitor.y, p.anchor.x, p.anchor.y);
                if (d < bestD) {
                    bestD = d;
                    best = p.id;
                }
            }
            if (best !== nearRef.current) {
                nearRef.current = best;
                setNear(best);
            }
            const st = scene.stats();
            // sounds: things that happened in the world, quieter the further away they are
            for (const ev of scene.events?.splice(0) ?? []) {
                sound.play(ev.name, Math.max(0.15, 1 - Math.abs(ev.x - visitor.x) / 2000));
            }
            sound.listen(visitor.x, visitor.y, st.dancing === 1, st.rideView === 1);
            const view = st.rideView === 1, progress = Math.round((st.rideProgress ?? 0) * 20) / 20, focus = st.focus === 1;
            setRide((r) => (r.view === view && r.progress === progress && r.focus === focus ? r : { view, progress, focus }));
        });
        renderer.start();
        // Hooks for automated browser checks (tests/smoke.cjs).
        window.__fair = {
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
        if (!v)
            return;
        const shown = ritual ?? hand;
        v.hold = shown?.hold;
        v.holdColor = shown?.color;
        v.holdColor2 = shown?.color2;
        v.look = look;
    }, [hand, ritual, look]);
    /** Pick something up: it goes in your bag and into your hand. */
    const pickUp = useCallback((item) => {
        setBag((b) => [...b.filter((i) => i.id !== item.id && !(item.hold === "krathong" && i.hold === "krathong")), item]);
        if (item.hold)
            setHand(item);
    }, []);
    /** Use something up (a krathong floated, a garland offered). Your hand moves to the next thing you carry. */
    const consume = useCallback((item) => {
        setBag((b) => {
            const rest = b.filter((i) => i.id !== item.id);
            setHand((h) => (h?.id === item.id ? [...rest].reverse().find((i) => i.hold) ?? null : h));
            return rest;
        });
    }, []);
    const awayMessage = () => engineRef.current?.scene.stats().riding ? "กำลังนั่งชิงช้าสวรรค์อยู่ รอหมุนครบรอบก่อนนะ" : "กำลังรำวงอยู่บนเวที รอเพลงจบก่อนนะ";
    const closePanel = useCallback(() => {
        setOpenId(null);
        setTarget(null);
    }, []);
    const visit = useCallback((id) => {
        const e = engineRef.current;
        const place = config.places.find((p) => p.id === id);
        if (!e || !place)
            return;
        if (e.scene.visitorAway())
            return say(awayMessage());
        setOpenId(null);
        setTarget(id);
        e.visitor.walkTo(place.anchor, () => setOpenId(id));
    }, [say]);
    const enter = useCallback((chosen) => {
        if (entered)
            return;
        if (chosen)
            setLook(chosen);
        engineRef.current?.sound.start();
        setMuted(engineRef.current?.sound.muted ?? false);
        setEntered(true);
        engineRef.current?.renderer.follow(true);
        setReveal(true);
        window.setTimeout(() => setReveal(false), 4500);
        window.setTimeout(() => say(config.welcomeHint), 1200);
    }, [entered, say]);
    // ---- tapping the illustration
    const onPointerDown = (ev) => {
        const e = engineRef.current;
        if (!e)
            return;
        if (!entered)
            return enter();
        const w = e.renderer.toWorld(ev.clientX, ev.clientY);
        const tapped = e.scene.tap(w);
        if (tapped) {
            if (tapped.bubble)
                setBubble({ ...tapped.bubble, key: Date.now() });
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
        if (e.scene.visitorAway())
            return say(awayMessage());
        const place = config.places.find((p) => w.x >= p.hitArea.x0 && w.x <= p.hitArea.x1 && w.y >= p.hitArea.y0 && w.y <= p.hitArea.y1);
        if (place)
            return visit(place.id);
        closePanel();
        e.renderer.ripple(e.visitor.walkTo(w));
    };
    const onPointerMove = (ev) => {
        const e = engineRef.current;
        if (!e || ev.pointerType !== "mouse")
            return;
        const w = e.renderer.toWorld(ev.clientX, ev.clientY);
        const place = config.places.find((p) => w.x >= p.hitArea.x0 && w.x <= p.hitArea.x1 && w.y >= p.hitArea.y0 && w.y <= p.hitArea.y1);
        const curio = config.curios.some((c) => dist(w.x, w.y, c.at.x, c.at.y - 12) < c.radius);
        setHovered(place?.id ?? null);
        ev.currentTarget.style.cursor = place || curio ? "pointer" : "default";
    };
    // ---- keyboard: arrows / WASD walk, Escape closes the panel
    useEffect(() => {
        const dirs = {
            ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
            a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1],
        };
        const held = new Set();
        const sync = () => {
            const v = engineRef.current?.visitor;
            if (!v)
                return;
            let x = 0, y = 0;
            held.forEach((k) => { x += dirs[k][0]; y += dirs[k][1]; });
            v.steer.x = Math.sign(x);
            v.steer.y = Math.sign(y);
        };
        const key = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
        const down = (e) => {
            if (e.key === "Escape")
                return closePanel();
            const k = key(e);
            if (!dirs[k] || !entered || engineRef.current?.scene.visitorAway())
                return;
            if (e.target.closest?.("input, textarea, button")) {
                if (k.length === 1)
                    return; // let people type letters into fields
            }
            e.preventDefault();
            if (!held.has(k))
                closePanel();
            held.add(k);
            sync();
        };
        const up = (e) => { held.delete(key(e)); sync(); };
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
        if (!e || !openPlace || !action)
            return;
        if (action.goTo) {
            say(action.doneHint);
            return visit(action.goTo);
        }
        if (e.scene.runAction(openPlace.id, action.id, e.visitor)) {
            if (action.id === "ride")
                remember({ rode: true });
            if (action.id === "dance")
                remember({ danced: true });
            // close the card so the visitor can watch what happens in the world
            say(action.doneHint);
            setOpenId(null);
        }
    };
    // ---- the temple: kneel, light incense, offer flowers, bow three times
    const offering = bag.find((i) => i.offering) ?? null;
    const pray = () => {
        const e = engineRef.current;
        if (!e)
            return;
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
        if (!e)
            return;
        setOpenId(null);
        setRitual({ id: "siamsi", name: "เซียมซี", text: "", hold: "siamsi" });
        say("ตั้งจิตอธิษฐาน แล้วเขย่าเซียมซีเบาๆ…");
        e.visitor.perform("fortune", 4.2, -1, () => {
            setRitual(null);
            const f = config.fortunes[Math.floor(Math.random() * config.fortunes.length)];
            remember({ fortune: f });
            sfx("chime");
            setBubble({ title: "เซียมซีหล่นออกมาหนึ่งไม้", text: f, tag: "เสี่ยงเซียมซีเพื่อความสนุก", key: Date.now() });
        });
    };
    // ---- the pier: kneel at the end and set your krathong on the water
    const krathong = bag.find((i) => i.hold === "krathong") ?? null;
    const floatKrathong = (wish) => {
        const e = engineRef.current;
        if (!e || !openPlace?.action)
            return;
        const k = krathong ?? config.krathongs[0];
        const doneHint = openPlace.action.doneHint;
        setOpenId(null);
        setRitual(k);
        say("นั่งลงที่ปลายสะพาน แล้วค่อยๆ วางกระทงลงน้ำ…");
        e.visitor.perform("float", 3.4, 1, () => { });
        window.setTimeout(() => {
            if (e.visitor.act?.kind !== "float") {
                setRitual(null);
                return;
            } // walked away: keep the krathong
            e.scene.runAction("shore", "float", e.visitor, { wish, style: k.id, flower: k.color });
            sfx("splash");
            setRitual(null);
            if (krathong)
                consume(krathong);
            remember((m) => ({ wishes: [...m.wishes, wish] }));
            say(doneHint);
        }, 1500);
    };
    // ---- the lantern ground: hold your lantern up while it fills with warm air, then let it go
    const releaseLantern = (lantern, wish) => {
        const e = engineRef.current;
        if (!e)
            return;
        setOpenId(null);
        setRitual(lantern);
        say("จุดไฟใต้โคม ชูขึ้นสูงๆ รอให้ลมร้อนพยุงโคมขึ้น…");
        e.visitor.perform("lantern", 3.2, 1, () => { });
        window.setTimeout(() => {
            if (e.visitor.act?.kind !== "lantern") {
                setRitual(null);
                return;
            } // walked away before letting go
            setRitual(null);
            e.scene.runAction("lanterns", "release", e.visitor, { wish, flower: lantern.color });
            remember((m) => ({ lanterns: [...m.lanterns, wish] }));
            say(`ปล่อย${lantern.name}ลอยขึ้นฟ้าแล้ว แตะที่โคมเพื่ออ่านคำอธิษฐานได้นะ`);
        }, 2700);
    };
    // ---- stalls: everything is free to pick up
    const pick = (item) => {
        const e = engineRef.current;
        if (!e)
            return;
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
        }
        else if (item.hold === "krathong") {
            say(`ได้${item.name}แล้ว ถือไปลอยที่ปลายสะพานได้เลย`);
        }
        else if (item.offering) {
            e.scene.runAction("flowers", "petals", e.visitor);
            say(`ได้${item.name}แล้ว เอาไปถวายพระที่วัดได้นะ`);
        }
    };
    const onPrize = useCallback((p) => {
        remember((m) => ({ prizes: [...m.prizes, p.name] }));
        sfx("chime");
        if (p.hold)
            pickUp({ id: `prize-${p.name}`, name: p.name, text: "", hold: p.hold });
    }, [remember, pickUp, sfx]);
    return (_jsxs("main", { className: `app ${entered ? "entered" : ""}`, children: [_jsx("canvas", { ref: canvasRef, className: "world", "aria-label": `${config.brand} ${config.tagline} ใต้พระจันทร์เต็มดวง`, role: "img", onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerLeave: () => setHovered(null) }), _jsxs("header", { className: "brand", "aria-hidden": !entered, children: [_jsx("span", { className: "brand-name", children: config.brand }), _jsx("span", { className: "brand-tag", children: config.tagline })] }), _jsxs("button", { type: "button", className: `sound-toggle ${entered ? "" : "is-hidden"}`, tabIndex: entered ? 0 : -1, "aria-pressed": !muted, "aria-label": muted ? "เปิดเสียง" : "ปิดเสียง", onClick: () => {
                    const s = engineRef.current?.sound;
                    if (!s)
                        return;
                    s.start();
                    s.setMuted(!muted);
                    setMuted(!muted);
                }, children: [_jsxs("svg", { viewBox: "0 0 24 24", width: "20", height: "20", "aria-hidden": "true", children: [_jsx("path", { d: "M4 9h4l5-4v14l-5-4H4z", fill: "currentColor" }), muted
                                ? _jsx("path", { d: "M16 9l5 6M21 9l-5 6", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })
                                : _jsx("path", { d: "M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" })] }), _jsx("span", { children: muted ? "เปิดเสียง" : "เสียง" })] }), _jsx(PlaceMarkers, { places: config.places, refs: markerRefs, labelled: (id) => reveal || id === hovered || id === target || id === near, active: target, onVisit: visit, onHover: setHovered, hidden: !entered || ride.focus, ui: config.ui }), _jsx(MapMenu, { places: config.places, active: target, onVisit: visit, hidden: !entered || ride.view, ui: config.ui }), openPlace && (_jsxs(PlacePanel, { place: openPlace, ui: config.ui, stat: openPlace.stat ? engineRef.current?.scene.stats()[openPlace.stat.key] ?? 0 : undefined, onAction: runAction, onClose: closePanel, children: [openPlace.panel === "float" && openPlace.action && (_jsx(FloatForm, { label: openPlace.action.label, krathong: krathong?.name ?? null, onFloat: floatKrathong, onShop: () => visit("boutique") })), openPlace.panel === "lantern" && openPlace.items && _jsx(LanternForm, { lanterns: openPlace.items, onRelease: releaseLantern }), openPlace.panel === "games" && _jsx(FairGames, { onPrize: onPrize, onPop: () => sfx("pop") }), openPlace.panel === "temple" && _jsx(TemplePanel, { offering: offering, fortune: memories.fortune, onPray: pray, onFortune: shakeFortune }), openPlace.panel === "krathongShop" && (_jsxs(_Fragment, { children: [_jsx(ItemPicker, { items: config.krathongs, owned: krathong ? [krathong.id] : [], pickLabel: "\u0E40\u0E25\u0E37\u0E2D\u0E01", onPick: pick, preview: previewItem }), krathong && _jsxs("button", { type: "button", className: "panel-action", onClick: () => visit("shore"), children: ["\u0E16\u0E37\u0E2D", krathong.name, "\u0E44\u0E1B\u0E25\u0E2D\u0E22\u0E40\u0E25\u0E22"] })] })), (openPlace.panel === "flowers" || openPlace.panel === "food") && openPlace.items && (_jsx(ItemPicker, { items: openPlace.items, owned: [...bag.map((i) => i.id), ...(look.flower ? ["plumeria"] : [])], pickLabel: openPlace.panel === "food" ? "รับ" : "เลือก", onPick: pick, preview: previewItem })), openPlace.panel === "memory" && (_jsx(MemoryCard, { memories: memories, look: look, hand: hand?.hold ? { hold: hand.hold, color: hand.color, color2: hand.color2 } : undefined, brand: config.brand, treasureTotal: config.curios.length }))] })), _jsx(RideView, { show: ride.view, progress: ride.progress, source: rideSource }), _jsx(Hint, { hint: hint }), _jsx(WishBubble, { bubble: bubble, onClose: () => setBubble(null) }), _jsx(Intro, { config: config, onEnter: enter, hidden: entered })] }));
}
