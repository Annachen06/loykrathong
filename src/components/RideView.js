import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { glow, seeded } from "../engine/math";
import { drawKrathongCached } from "../festivals/loy-krathong/scenery";
// The world is drawn 32 units to a metre. The stalls stand about 30 m in front of the wheel, the sea starts
// 40 m away, and your eyes rise from about 5 m to 18 m above the sand: at the top the stalls' roofs and lights
// are just in view at the bottom of the window, with the whole sea spread out beyond them.
const UNITS_PER_M = 32;
const FAIR_D = 30;
const SHORE_D = 40;
const GROUND_Y = 806; // world y of the sand the stalls stand on
const LOOK_AHEAD = 540; // you face the sea, turned a little towards the pier and the moon
const FLOWERS = ["#ffcf4a", "#ff9ec0", "#ff8fb0", "#fffaf0", "#c9b6ff", "#ffa8c2"];
const STYLES = ["banana", "lotus", "bread", "coconut"];
/**
 * Riding the Ferris wheel, through your own eyes. You sit in the cabin looking out over the sea:
 * the horizon stays at eye level, and as the cabin climbs the sea opens out below you, the krathongs
 * spread across it, and the fair sinks away underneath. Then the wheel brings you back down.
 * Drawn with simple perspective: something d metres away and h metres below your eyes appears F·h/d below the horizon.
 */
export function RideView({ show, progress, source }) {
    const ref = useRef(null);
    const sourceRef = useRef(source);
    sourceRef.current = source;
    useEffect(() => {
        if (!show)
            return;
        const c = ref.current;
        const ctx = c?.getContext("2d", { alpha: false });
        if (!c || !ctx)
            return;
        const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        const r = seeded(23);
        const stars = Array.from({ length: 170 }, () => ({ x: r(), y: Math.pow(r(), 1.3), s: 0.6 + r() * 1.4, p: r() * 6.3, f: 0.6 + r() * 2 }));
        const krathongs = [];
        const lanterns = [];
        const newKrathong = (fresh) => ({
            // set down off the pier and the beach, then carried slowly out to sea
            x: fresh ? 900 + Math.random() * 1600 : -400 + Math.random() * 3600,
            d: fresh ? SHORE_D + 2 + Math.random() * 14 : SHORE_D + Math.pow(Math.random(), 1.8) * 700,
            v: 0.8 + Math.random() * 1.4,
            drift: (Math.random() - 0.5) * 6,
            p: Math.random() * 10,
            flower: FLOWERS[(Math.random() * FLOWERS.length) | 0],
            style: STYLES[(Math.random() * STYLES.length) | 0],
        });
        const newLantern = (fresh) => ({
            x: 400 + Math.random() * 2600,
            d: 45 + Math.random() * 380,
            z: fresh ? 0 : Math.random() * 90,
            v: 1 + Math.random() * 1.2,
            p: Math.random() * 10,
        });
        for (let i = 0; i < 150; i++)
            krathongs.push(newKrathong(false));
        for (let i = 0; i < 26; i++)
            lanterns.push(newLantern(false));
        let raf = 0;
        let last = performance.now();
        const t0 = last;
        let h = -1; // set on the first frame
        const draw = (now) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const t = (now - t0) / 1000;
            const src = sourceRef.current();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const vw = c.clientWidth, vh = c.clientHeight;
            if (c.width !== Math.round(vw * dpr) || c.height !== Math.round(vh * dpr)) {
                c.width = Math.round(vw * dpr);
                c.height = Math.round(vh * dpr);
            }
            // eye height (metres) follows the cabin, with the cabin's gentle sway
            const F = 0.68 * Math.max(vw, vh); // focal length in pixels: a wide view, about 75° across the wider side
            const Y0 = vh * (vw < vh ? 0.38 : 0.4); // the horizon, at eye level
            // a tall phone screen shows more below the horizon, so climb a little higher there to see the same view
            const reach = Math.max(1, (vh - Y0) / F / 0.53);
            const wantH = (5 + 13 * (src?.high ?? 0)) * reach;
            h = h < 0 ? wantH : h + (wantH - h) * Math.min(1, dt * 3);
            const sway = calm ? 0 : Math.sin(t * 0.9) * 0.012;
            const eyeH = h + (calm ? 0 : Math.sin(t * 1.3) * 0.08);
            const cx = vw / 2;
            const viewX = (src?.x ?? 860) + LOOK_AHEAD; // world x straight ahead
            const below = (d) => Y0 + (F * eyeH) / d; // screen y of a point on the sea, d metres away
            const across = (x, d) => cx + (((x - viewX) / UNITS_PER_M) * F) / d;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.save();
            // the cabin sways a little on its hinge
            ctx.translate(cx, vh * 0.2);
            ctx.rotate(sway);
            ctx.translate(-cx, -vh * 0.2);
            const pad = Math.max(vw, vh) * 0.05; // drawn a little beyond the edges so the sway never shows a gap
            // sky
            const sky = ctx.createLinearGradient(0, -pad, 0, Y0);
            sky.addColorStop(0, "#081046");
            sky.addColorStop(0.5, "#16257a");
            sky.addColorStop(0.85, "#3a3f9a");
            sky.addColorStop(1, "#8a6cb8");
            ctx.fillStyle = sky;
            ctx.fillRect(-pad, -pad, vw + pad * 2, Y0 + pad + 1);
            for (const s of stars) {
                const a = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.f + s.p));
                ctx.fillStyle = `rgba(240,240,255,${a})`;
                ctx.fillRect(s.x * (vw + pad * 2) - pad, s.y * (Y0 - 30) - pad * 0.5, s.s, s.s);
            }
            // the full moon, high over the sea, with the rabbit of Thai folklore on its face
            const mr = Math.min(Math.max(Math.min(vw, vh) * 0.075, 26), 58);
            const mx = vw * (vw < vh ? 0.64 : 0.66), my = Math.max(vh * 0.13, Y0 - F * 0.3);
            glow(ctx, mx, my, mr * 6, "190,200,255", 0.16);
            glow(ctx, mx, my, mr * 2.4, "255,240,215", 0.26);
            const mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
            mg.addColorStop(0, "#fffdf6");
            mg.addColorStop(0.75, "#fff3d6");
            mg.addColorStop(1, "#f6dfb4");
            ctx.fillStyle = mg;
            ctx.beginPath();
            ctx.arc(mx, my, mr, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(220,190,150,0.28)";
            ctx.beginPath();
            const u = mr / 80;
            ctx.ellipse(mx + 6 * u, my + 14 * u, 22 * u, 16 * u, -0.2, 0, Math.PI * 2);
            ctx.ellipse(mx - 16 * u, my - 4 * u, 11 * u, 10 * u, 0, 0, Math.PI * 2);
            ctx.ellipse(mx - 14 * u, my - 30 * u, 4.5 * u, 15 * u, -0.3, 0, Math.PI * 2);
            ctx.ellipse(mx - 4 * u, my - 30 * u, 4.5 * u, 15 * u, 0.2, 0, Math.PI * 2);
            ctx.fill();
            // far islands on the horizon
            const isle = (x, w, hh, col) => {
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.moveTo(x, Y0 + 1);
                ctx.bezierCurveTo(x + w * 0.2, Y0 - hh, x + w * 0.6, Y0 - hh * 1.15, x + w, Y0 + 1);
                ctx.fill();
            };
            isle(vw * 0.02, vw * 0.22, vh * 0.025, "#2d2f80");
            isle(vw * 0.2, vw * 0.1, vh * 0.012, "#33358a");
            isle(vw * 0.74, vw * 0.24, vh * 0.03, "#2a2b78");
            // the sea, opening out below you as you climb
            const sea = ctx.createLinearGradient(0, Y0, 0, vh + pad);
            sea.addColorStop(0, "#5a56b0");
            sea.addColorStop(0.08, "#33429a");
            sea.addColorStop(1, "#101a58");
            ctx.fillStyle = sea;
            ctx.fillRect(-pad, Y0, vw + pad * 2, vh - Y0 + pad);
            // ripples: lines on the water, crowded near the horizon and opening out close by
            ctx.lineWidth = 1.2;
            for (let d = 3000; d > SHORE_D; d *= 0.8) {
                const y = below(d);
                if (y > vh + pad)
                    break;
                const depth = Math.min(1, (y - Y0) / (vh - Y0));
                ctx.strokeStyle = `rgba(190,200,255,${0.07 + depth * 0.1})`;
                const amp = Math.min(5, (F * 0.25) / d);
                ctx.beginPath();
                for (let x = -pad; x <= vw + pad; x += 36) {
                    const yy = y + Math.sin(x * 0.02 + t * 0.8 + d * 0.01) * amp;
                    x > -pad ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
                }
                ctx.stroke();
            }
            // the moon's path across the water
            const path = ctx.createLinearGradient(0, Y0, 0, vh);
            path.addColorStop(0, "rgba(255,240,210,0.24)");
            path.addColorStop(1, "rgba(255,240,210,0.04)");
            ctx.fillStyle = path;
            ctx.beginPath();
            ctx.moveTo(mx - mr * 0.5, Y0);
            ctx.lineTo(mx + mr * 0.5, Y0);
            ctx.lineTo(mx + mr * 3.2, vh + pad);
            ctx.lineTo(mx - mr * 3.2, vh + pad);
            ctx.closePath();
            ctx.fill();
            for (let i = 0; i < 70; i++) {
                const tt = Math.pow(i / 70, 1.6);
                const y = Y0 + 3 + tt * (vh - Y0);
                const spread = mr * (0.4 + tt * 2.8);
                const x = mx + Math.sin(i * 12.9898 + Math.floor(t * 1.5 + i) * 0.7) * spread;
                const a = (0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7))) * (0.85 - tt * 0.4);
                const w = 4 + tt * 22;
                ctx.fillStyle = `rgba(255,244,220,${a})`;
                ctx.fillRect(x - w / 2, y, w, 1.4 + tt * 2);
            }
            // krathongs, far ones first, drifting out towards the horizon
            for (const k of krathongs) {
                if (!calm) {
                    k.d += k.v * dt;
                    k.x += k.drift * dt;
                    k.p += dt;
                }
                if (k.d > 760)
                    Object.assign(k, newKrathong(true));
            }
            krathongs.sort((a, b) => b.d - a.d);
            for (const k of krathongs) {
                const y = below(k.d);
                if (y > vh + 20)
                    continue;
                const x = across(k.x, k.d);
                if (x < -40 || x > vw + 40)
                    continue;
                const size = F / k.d; // pixels per metre at this distance
                const flick = 0.78 + 0.22 * Math.sin(t * 13 + k.p * 7) * Math.sin(t * 7.3 + k.p);
                // drawn a little larger than life (about a metre across) so they read from up high
                glow(ctx, x, y - size * 0.5, Math.max(4, size * 2.2), "255,200,120", 0.6 * flick);
                if (size > 3) {
                    const s = (size * 1.1) / 40; // the drawing is 40 units wide at scale 1
                    drawKrathongCached(ctx, x, y + Math.sin(k.p * 2) * size * 0.03, s, k.flower, k.style);
                }
                else {
                    ctx.fillStyle = `rgba(255,236,190,${flick})`;
                    ctx.fillRect(x - 0.8, y - 1.6, 1.6, 1.6);
                }
            }
            // the fair below: stalls, palms and people about 30 m ahead, sinking away as you rise
            const ppw = F / (UNITS_PER_M * FAIR_D); // screen pixels per world unit at the fair's distance
            const groundY = Y0 + (F * eyeH) / FAIR_D;
            if (src && groundY - 360 * ppw < vh + pad) {
                const x0 = viewX - (cx + pad) / ppw, x1 = viewX + (vw - cx + pad) / ppw;
                ctx.save();
                ctx.translate(cx, groundY);
                ctx.scale(ppw, ppw);
                ctx.translate(-viewX, -GROUND_Y);
                src.paintFair(ctx, x0, x1);
                // the sand carries on towards you below the edge of the picture of the fair
                ctx.fillStyle = "#5e4a44";
                ctx.fillRect(x0, 999, x1 - x0, 4000);
                ctx.restore();
            }
            // sky lanterns rising past you: below the horizon while they are lower than your eyes
            for (const l of lanterns) {
                if (!calm) {
                    l.z += l.v * dt;
                    l.p += dt;
                    l.x += Math.sin(l.p * 0.5) * 6 * dt;
                }
                if (l.z > 160)
                    Object.assign(l, newLantern(true));
            }
            for (const l of lanterns) {
                const y = Y0 - (F * (l.z - eyeH)) / l.d;
                const x = across(l.x, l.d);
                if (y < -40 || y > vh + 40 || x < -40 || x > vw + 40)
                    continue;
                const sz = Math.max(1.5, (F * 0.9) / l.d);
                const flick = 0.85 + 0.15 * Math.sin(t * 8 + l.p * 5);
                glow(ctx, x, y, sz * 2.4, "255,180,100", 0.55 * flick);
                ctx.fillStyle = `rgba(255,${Math.round(200 * flick)},130,0.95)`;
                ctx.beginPath();
                ctx.moveTo(x - sz * 0.38, y + sz * 0.5);
                ctx.lineTo(x - sz * 0.5, y - sz * 0.4);
                ctx.quadraticCurveTo(x, y - sz * 0.8, x + sz * 0.5, y - sz * 0.4);
                ctx.lineTo(x + sz * 0.38, y + sz * 0.5);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
            // the cabin around you: just the edges of the big window, so the view stays wide open
            cabinFrame(ctx, vw, vh, t);
            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [show]);
    return (_jsxs("div", { className: `ride-view ${show ? "on" : ""}`, "aria-hidden": !show, children: [_jsx("canvas", { ref: ref, className: "ride-cabin" }), _jsxs("p", { className: "ride-caption", role: "status", children: ["\u0E19\u0E31\u0E48\u0E07\u0E0A\u0E34\u0E07\u0E0A\u0E49\u0E32\u0E2A\u0E27\u0E23\u0E23\u0E04\u0E4C \u00B7 \u0E2B\u0E21\u0E38\u0E19\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27 ", Math.round(progress * 100), "%"] })] }));
}
/** The window of the cabin: a slim frame around the top and sides, the sill and the cabin wall below it. */
function cabinFrame(ctx, vw, vh, t) {
    const OUTLINE = "#2a1d4a", PINK = "#ef6f8e";
    const edge = Math.max(10, Math.min(vw, vh) * 0.022);
    const top = Math.max(18, vh * 0.04);
    const sill = vh - Math.max(40, vh * 0.09) + Math.sin(t * 0.9) * 0.6;
    const radius = Math.min(vw, vh) * 0.06;
    const opening = () => ctx.roundRect(edge, top, vw - edge * 2, sill - top, [radius, radius, 6, 6]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    ctx.fillStyle = PINK;
    ctx.beginPath();
    ctx.rect(0, 0, vw, vh);
    opening();
    ctx.fill("evenodd");
    ctx.beginPath();
    opening();
    ctx.stroke();
    // a faint reflection on the glass
    ctx.save();
    ctx.beginPath();
    opening();
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.beginPath();
    ctx.moveTo(vw * 0.62, top);
    ctx.lineTo(vw * 0.7, top);
    ctx.lineTo(vw * 0.5, sill);
    ctx.lineTo(vw * 0.42, sill);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // the sill, and a darker band of the cabin wall below it
    ctx.fillStyle = "#ffa8c2";
    ctx.beginPath();
    ctx.roundRect(edge - 4, sill - 2, vw - edge * 2 + 8, Math.max(8, vh * 0.012), 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(42,29,74,0.18)";
    ctx.fillRect(0, sill + Math.max(8, vh * 0.012), vw, vh);
}
