import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { drawPerson } from "../engine/person";
// Everyone dresses as they like: body shape, clothes and hair are separate choices, with no "man" or "woman" button.
const BODIES = [
    { id: "man", label: "ทรงตรง" },
    { id: "woman", label: "ทรงเว้า" },
];
const OUTFITS = [
    { id: "pha-sin", label: "ผ้าซิ่น" },
    { id: "dress", label: "ชุดเดรส" },
    { id: "blouse-skirt", label: "เสื้อ+กระโปรง" },
    { id: "blouse-pants", label: "เสื้อ+กางเกง" },
    { id: "shirt-pants", label: "เชิ้ต+กางเกง" },
    { id: "shirt-shorts", label: "เชิ้ต+ขาสั้น" },
];
const HAIRS = [
    { id: "crop", label: "สั้นเกรียน" },
    { id: "short", label: "สั้น" },
    { id: "bob", label: "บ๊อบ" },
    { id: "ponytail", label: "หางม้า" },
    { id: "long", label: "ยาว" },
    { id: "bun", label: "มวย" },
];
const SKINS = ["#f6d2b8", "#eec1a0", "#e0aa84", "#c98e68", "#b07a56", "#8a5a3e"];
const HAIR_COLORS = ["#1c1418", "#3a2420", "#6a4030", "#b8b4bc", "#c86a9a", "#4a6ac8"];
/** Clothes colours: top, bottom, trim. */
const PALETTES = [
    ["#ffd27a", "#ef6f8e", "#fff0b8"],
    ["#3fa7a0", "#c8b48a", "#ffe08a"],
    ["#c9b6ff", "#2f6a52", "#e8c066"],
    ["#ef8fb0", "#4a6aa0", "#fff4e2"],
    ["#5a7ad0", "#d8c49a", "#c8d8ff"],
    ["#fff4e2", "#7a4ab0", "#ffcf6e"],
    ["#33303c", "#2e3a6a", "#ef6f8e"],
];
const PATTERNS = [
    { id: "plain", label: "เรียบ" },
    { id: "floral", label: "ลายดอก" },
    { id: "stripes", label: "ลายทาง" },
    { id: "plaid", label: "ลายสก็อต" },
];
const STORE_KEY = "fair-look";
const pick = (list) => list[Math.floor(Math.random() * list.length)];
function tidy(look) {
    // shirts get a collar; everything else keeps its own neckline
    return { ...look, collar: look.outfit.startsWith("shirt"), sleeves: look.outfit === "pha-sin" ? look.sleeves ?? "short" : "short" };
}
function randomLook(base) {
    const [top, bottom, accent] = pick(PALETTES);
    const pattern = pick(PATTERNS).id;
    return tidy({
        ...base,
        figure: pick(BODIES).id,
        outfit: pick(OUTFITS).id,
        hairStyle: pick(HAIRS).id,
        skin: pick(SKINS),
        hair: pick(HAIR_COLORS.slice(0, 4)),
        top, bottom, accent,
        pattern: pattern === "plain" ? undefined : pattern,
        flower: Math.random() < 0.35,
        glasses: Math.random() < 0.2,
    });
}
function savedLook(fallback) {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw)
            return { ...fallback, ...JSON.parse(raw) };
    }
    catch {
        /* storage may be blocked */
    }
    return fallback;
}
/** The first moment: the world is already alive behind a soft veil. Make your character, then step in. */
export function Intro({ config, onEnter, hidden }) {
    const [look, setLook] = useState(() => savedLook(config.visitors[0].look));
    const set = (patch) => setLook((l) => tidy({ ...l, ...patch }));
    const enter = () => {
        if (hidden)
            return;
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(look));
        }
        catch { /* ignore */ }
        onEnter(look);
    };
    const tab = hidden ? -1 : 0;
    const palette = PALETTES.findIndex(([t, b]) => t === look.top && b === look.bottom);
    return (_jsx("section", { className: "intro", "aria-hidden": hidden, "aria-labelledby": "intro-title", children: _jsxs("div", { className: "intro-inner", children: [_jsx("p", { className: "intro-eyebrow", children: config.intro.eyebrow }), _jsx("h1", { id: "intro-title", children: config.brand }), _jsx("p", { className: "intro-tagline", children: config.tagline }), _jsx("p", { className: "intro-edition", children: config.edition }), _jsx("p", { className: "intro-pick", children: config.intro.pickLabel }), _jsxs("div", { className: "look-maker", children: [_jsxs("div", { className: "look-preview", children: [_jsx(Portrait, { look: look }), _jsx("button", { type: "button", className: "look-random", tabIndex: tab, onClick: () => setLook(randomLook(look)), children: "\u0E2A\u0E38\u0E48\u0E21\u0E25\u0E38\u0E04" })] }), _jsxs("div", { className: "look-options", children: [_jsx(Choice, { label: "\u0E23\u0E39\u0E1B\u0E23\u0E48\u0E32\u0E07", items: BODIES, value: look.figure, onPick: (figure) => set({ figure }), tab: tab }), _jsx(Choice, { label: "\u0E0A\u0E38\u0E14", items: OUTFITS, value: look.outfit, onPick: (outfit) => set({ outfit }), tab: tab }), _jsx(Choice, { label: "\u0E25\u0E32\u0E22", items: PATTERNS, value: look.pattern ?? "plain", onPick: (p) => set({ pattern: p === "plain" ? undefined : p }), tab: tab }), _jsx(Choice, { label: "\u0E17\u0E23\u0E07\u0E1C\u0E21", items: HAIRS, value: look.hairStyle, onPick: (hairStyle) => set({ hairStyle }), tab: tab }), _jsx(Swatches, { label: "\u0E2A\u0E35\u0E1C\u0E34\u0E27", colors: SKINS, value: look.skin, onPick: (skin) => set({ skin }), tab: tab }), _jsx(Swatches, { label: "\u0E2A\u0E35\u0E1C\u0E21", colors: HAIR_COLORS, value: look.hair, onPick: (hair) => set({ hair }), tab: tab }), _jsxs("div", { className: "look-row", role: "radiogroup", "aria-label": "\u0E2A\u0E35\u0E0A\u0E38\u0E14", children: [_jsx("span", { className: "look-label", children: "\u0E2A\u0E35\u0E0A\u0E38\u0E14" }), _jsx("div", { className: "look-chips", children: PALETTES.map(([top, bottom, accent], i) => (_jsx("button", { type: "button", role: "radio", "aria-checked": palette === i, "aria-label": `สีชุดแบบที่ ${i + 1}`, tabIndex: tab, className: `look-swatch duo ${palette === i ? "on" : ""}`, style: { background: `linear-gradient(135deg, ${top} 50%, ${bottom} 50%)` }, onClick: () => set({ top, bottom, accent }) }, i))) })] }), _jsxs("div", { className: "look-row", children: [_jsx("span", { className: "look-label", children: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E1B\u0E23\u0E30\u0E14\u0E31\u0E1A" }), _jsxs("div", { className: "look-chips", children: [_jsx("button", { type: "button", tabIndex: tab, "aria-pressed": !!look.flower, className: `look-chip ${look.flower ? "on" : ""}`, onClick: () => set({ flower: !look.flower }), children: "\u0E17\u0E31\u0E14\u0E14\u0E2D\u0E01\u0E44\u0E21\u0E49" }), _jsx("button", { type: "button", tabIndex: tab, "aria-pressed": !!look.glasses, className: `look-chip ${look.glasses ? "on" : ""}`, onClick: () => set({ glasses: !look.glasses }), children: "\u0E41\u0E27\u0E48\u0E19\u0E15\u0E32" })] })] })] })] }), _jsx("button", { type: "button", className: "intro-enter", tabIndex: tab, onClick: enter, children: config.intro.enterLabel }), _jsx("p", { className: "intro-help", children: config.intro.help })] }) }));
}
function Choice({ label, items, value, onPick, tab }) {
    return (_jsxs("div", { className: "look-row", role: "radiogroup", "aria-label": label, children: [_jsx("span", { className: "look-label", children: label }), _jsx("div", { className: "look-chips", children: items.map((it) => (_jsx("button", { type: "button", role: "radio", "aria-checked": value === it.id, tabIndex: tab, "data-look": it.id, className: `look-chip ${value === it.id ? "on" : ""}`, onClick: () => onPick(it.id), children: it.label }, it.id))) })] }));
}
function Swatches({ label, colors, value, onPick, tab }) {
    return (_jsxs("div", { className: "look-row", role: "radiogroup", "aria-label": label, children: [_jsx("span", { className: "look-label", children: label }), _jsx("div", { className: "look-chips", children: colors.map((c, i) => (_jsx("button", { type: "button", role: "radio", "aria-checked": value === c, "aria-label": `${label}แบบที่ ${i + 1}`, tabIndex: tab, className: `look-swatch ${value === c ? "on" : ""}`, style: { background: c }, onClick: () => onPick(c) }, c))) })] }));
}
/** A standing picture of the character, drawn with the same code as in the world. */
function Portrait({ look }) {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current;
        const ctx = c?.getContext("2d");
        if (!c || !ctx)
            return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = 96 * dpr;
        c.height = 132 * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, 96, 132);
        drawPerson(ctx, 48, 124, 1.55, 1, 0, 0, 1, look);
    }, [look]);
    return _jsx("canvas", { ref: ref, className: "intro-portrait", width: 96, height: 132, "aria-label": "\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E32\u0E15\u0E31\u0E27\u0E25\u0E30\u0E04\u0E23\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13", role: "img" });
}
