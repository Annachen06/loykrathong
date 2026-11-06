import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
const BALLOON_COLOURS = ["#ef5a5a", "#ffd84a", "#4fc08a", "#5aa0ef", "#ff8fc0", "#c9b6ff"];
const PRIZES = {
    darts: [null, { name: "ลูกอมรสมะม่วง" }, { name: "พวงกุญแจเปลือกหอย" }, { name: "ตุ๊กตาปลาดาวตัวใหญ่", hold: "plushStar" }],
    rings: [null, { name: "สายไหมหนึ่งไม้", hold: "cottonCandy" }, { name: "ตุ๊กตาแมงกะพรุน", hold: "plushJelly" }, { name: "ตุ๊กตากระต่ายส่องจันทร์", hold: "plushRabbit" }],
};
function prizeText(score, game) {
    const p = PRIZES[game][score];
    if (!p)
        return game === "darts" ? "เกือบได้แล้ว ลองอีกทีนะ" : "ห่วงไม่ลงเลย ลองอีกทีนะ";
    return p.hold ? `ได้${p.name}! ถืออยู่ในมือตัวละครแล้ว` : `ได้${p.name}! เก็บไว้ในการ์ดที่ระลึกแล้ว`;
}
/** Hand over the prize once, when a round ends. */
function usePrize(done, score, game, onPrize) {
    useEffect(() => {
        const p = PRIZES[game][score];
        if (done && p)
            onPrize(p);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [done]);
}
/** Balloon darts: balloons drift on the board; tap one to throw a dart at it. Three darts. */
function BalloonDarts({ onPrize, onPop }) {
    const [darts, setDarts] = useState(3);
    const [popped, setPopped] = useState([]);
    const [misses, setMisses] = useState([]);
    const [round, setRound] = useState(0);
    const done = darts === 0;
    usePrize(done, popped.length, "darts", onPrize);
    const hit = (i, miss) => {
        if (done)
            return;
        setDarts((d) => d - 1);
        if (i !== null && !popped.includes(i)) {
            setPopped((p) => [...p, i]);
            onPop?.();
        }
        else if (miss)
            setMisses((m) => [...m, miss]);
    };
    const throwAt = (e) => {
        const target = e.target.closest("[data-balloon]");
        const box = e.currentTarget.getBoundingClientRect();
        hit(target ? Number(target.dataset.balloon) : null, { x: e.clientX - box.left, y: e.clientY - box.top });
    };
    const again = () => { setDarts(3); setPopped([]); setMisses([]); setRound((r) => r + 1); };
    return (_jsxs("div", { className: "game", children: [_jsx("p", { className: "game-help", children: "\u0E41\u0E15\u0E30\u0E25\u0E39\u0E01\u0E42\u0E1B\u0E48\u0E07\u0E17\u0E35\u0E48\u0E25\u0E2D\u0E22\u0E44\u0E1B\u0E21\u0E32\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E32\u0E40\u0E1B\u0E49\u0E32 \u0E21\u0E35\u0E25\u0E39\u0E01\u0E14\u0E2D\u0E01 3 \u0E14\u0E2D\u0E01" }), _jsxs("div", { className: "dart-board", onPointerDown: throwAt, role: "group", "aria-label": "\u0E01\u0E23\u0E30\u0E14\u0E32\u0E19\u0E25\u0E39\u0E01\u0E42\u0E1B\u0E48\u0E07", children: [Array.from({ length: 12 }, (_, i) => (_jsx("button", { type: "button", "data-balloon": i, className: `balloon ${popped.includes(i) ? "popped" : ""}`, style: {
                            left: `${8 + (i % 6) * 15}%`,
                            top: `${12 + Math.floor(i / 6) * 42}%`,
                            background: BALLOON_COLOURS[i % BALLOON_COLOURS.length],
                            animationDuration: `${2.2 + ((i * 7) % 5) * 0.45}s`,
                            animationDelay: `${-i * 0.37}s`,
                        }, "aria-label": `ลูกโป่งลูกที่ ${i + 1}`, "aria-disabled": done || popped.includes(i), onClick: (e) => { if (e.detail === 0)
                            hit(i); /* keyboard: Enter/Space throws at this balloon */ } }, `${round}-${i}`))), misses.map((m, i) => _jsx("span", { className: "dart-miss", style: { left: m.x, top: m.y } }, i))] }), _jsx("div", { className: "game-status", "aria-live": "polite", children: done ? (_jsxs(_Fragment, { children: [_jsxs("strong", { children: ["\u0E41\u0E15\u0E01 ", popped.length, " \u0E25\u0E39\u0E01 \u00B7 ", prizeText(popped.length, "darts")] }), _jsx("button", { type: "button", className: "game-again", onClick: again, children: "\u0E40\u0E25\u0E48\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07" })] })) : (_jsxs("span", { children: ["\u0E25\u0E39\u0E01\u0E14\u0E2D\u0E01\u0E40\u0E2B\u0E25\u0E37\u0E2D ", darts, " \u00B7 \u0E41\u0E15\u0E01\u0E41\u0E25\u0E49\u0E27 ", popped.length] })) })] }));
}
/** Ring toss: the ring's aim sweeps across the bottles; press "โยน" to throw. Three rings. */
function RingToss({ onPrize }) {
    const [rings, setRings] = useState(3);
    const [hits, setHits] = useState([]);
    const [last, setLast] = useState("");
    const aim = useRef(0); // 0..1 across the table
    const marker = useRef(null);
    const done = rings === 0;
    const BOTTLES = [0.1, 0.3, 0.5, 0.7, 0.9];
    usePrize(done, hits.length, "rings", onPrize);
    useEffect(() => {
        if (done)
            return;
        let raf = 0;
        const t0 = performance.now();
        const tick = (now) => {
            aim.current = 0.5 + 0.5 * Math.sin((now - t0) / 380);
            if (marker.current)
                marker.current.style.left = `${aim.current * 100}%`;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [done]);
    const toss = () => {
        if (done)
            return;
        const a = aim.current;
        const i = BOTTLES.findIndex((b) => Math.abs(b - a) < 0.045);
        setRings((r) => r - 1);
        if (i >= 0 && !hits.includes(i)) {
            setHits((h) => [...h, i]);
            setLast("คล้องได้!");
        }
        else
            setLast("พลาดไปนิดเดียว");
    };
    const again = () => { setRings(3); setHits([]); setLast(""); };
    return (_jsxs("div", { className: "game", children: [_jsx("p", { className: "game-help", children: "\u0E01\u0E14 \"\u0E42\u0E22\u0E19\" \u0E15\u0E2D\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E48\u0E27\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E15\u0E23\u0E07\u0E04\u0E2D\u0E02\u0E27\u0E14\u0E1E\u0E2D\u0E14\u0E35 \u0E21\u0E35\u0E2B\u0E48\u0E27\u0E07 3 \u0E27\u0E07" }), _jsxs("div", { className: "ring-table", children: [BOTTLES.map((b, i) => (_jsx("span", { className: `bottle ${hits.includes(i) ? "ringed" : ""}`, style: { left: `${b * 100}%` } }, i))), !done && _jsx("div", { ref: marker, className: "ring-aim", "aria-hidden": "true" })] }), _jsx("div", { className: "game-status", "aria-live": "polite", children: done ? (_jsxs(_Fragment, { children: [_jsxs("strong", { children: ["\u0E04\u0E25\u0E49\u0E2D\u0E07\u0E44\u0E14\u0E49 ", hits.length, " \u0E27\u0E07 \u00B7 ", prizeText(hits.length, "rings")] }), _jsx("button", { type: "button", className: "game-again", onClick: again, children: "\u0E40\u0E25\u0E48\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07" })] })) : (_jsxs(_Fragment, { children: [_jsxs("span", { children: ["\u0E2B\u0E48\u0E27\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D ", rings, last && ` · ${last}`] }), _jsx("button", { type: "button", className: "panel-action toss", onClick: toss, children: "\u0E42\u0E22\u0E19!" })] })) })] }));
}
export function FairGames({ onPrize, onPop }) {
    const [tab, setTab] = useState("darts");
    return (_jsxs("div", { className: "fair-games", children: [_jsxs("div", { className: "tabs", role: "tablist", children: [_jsx("button", { type: "button", role: "tab", "aria-selected": tab === "darts", className: tab === "darts" ? "on" : "", onClick: () => setTab("darts"), children: "\u0E1B\u0E32\u0E40\u0E1B\u0E49\u0E32\u0E25\u0E39\u0E01\u0E42\u0E1B\u0E48\u0E07" }), _jsx("button", { type: "button", role: "tab", "aria-selected": tab === "rings", className: tab === "rings" ? "on" : "", onClick: () => setTab("rings"), children: "\u0E42\u0E22\u0E19\u0E2B\u0E48\u0E27\u0E07" })] }), tab === "darts" ? _jsx(BalloonDarts, { onPrize: onPrize, onPop: onPop }) : _jsx(RingToss, { onPrize: onPrize }), _jsx("p", { className: "game-fine", children: "\u0E15\u0E38\u0E4A\u0E01\u0E15\u0E32\u0E08\u0E30\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E21\u0E37\u0E2D\u0E15\u0E31\u0E27\u0E25\u0E30\u0E04\u0E23 \u0E02\u0E2D\u0E07\u0E23\u0E32\u0E07\u0E27\u0E31\u0E25\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E14\u0E39\u0E44\u0E14\u0E49\u0E17\u0E35\u0E48\u0E21\u0E38\u0E21\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33 \u0E40\u0E25\u0E48\u0E19\u0E1F\u0E23\u0E35" })] }));
}
