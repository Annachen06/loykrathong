import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { drawPerson } from "../engine/person";
/** What you did tonight, gathered into a souvenir card you can save as a picture. Nothing leaves this device. */
export function MemoryCard({ memories: m, look, hand, brand, treasureTotal }) {
    const [image, setImage] = useState(null);
    const rows = memoryRows(m, treasureTotal);
    const make = () => {
        const c = document.createElement("canvas");
        c.width = 720;
        c.height = 960;
        const ctx = c.getContext("2d");
        const g = ctx.createLinearGradient(0, 0, 0, 960);
        g.addColorStop(0, "#0d1440");
        g.addColorStop(0.7, "#3a2d6e");
        g.addColorStop(1, "#6a4a8a");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 720, 960);
        for (let i = 0; i < 90; i++) {
            ctx.fillStyle = `rgba(255,246,225,${0.3 + ((i * 37) % 7) / 10})`;
            ctx.fillRect((i * 151) % 720, (i * 97) % 520, 2, 2);
        }
        const moon = ctx.createRadialGradient(560, 150, 10, 560, 150, 160);
        moon.addColorStop(0, "rgba(255,246,220,0.6)");
        moon.addColorStop(1, "rgba(255,246,220,0)");
        ctx.fillStyle = moon;
        ctx.fillRect(380, 0, 340, 330);
        ctx.fillStyle = "#fff4d6";
        ctx.beginPath();
        ctx.arc(560, 150, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1d2a66";
        ctx.fillRect(0, 560, 720, 400);
        ctx.fillStyle = "rgba(255,214,140,0.5)";
        for (let i = 0; i < 4; i++)
            ctx.fillRect(520 + Math.sin(i) * 20, 566 + i * 8, 80 - i * 12, 3);
        ctx.fillStyle = "rgba(255,244,226,0.1)";
        ctx.beginPath();
        ctx.roundRect(22, 592, 676, 346, 22);
        ctx.fill();
        drawPerson(ctx, 150, 560, 4.2, 1, 0, 0, 1, look, hand ? { hold: hand.hold, holdColor: hand.color, holdColor2: hand.color2 } : {});
        ctx.fillStyle = "#ffcf6e";
        ctx.font = "500 46px Mitr, sans-serif";
        ctx.fillText(brand, 300, 330);
        ctx.fillStyle = "#fff4e2";
        ctx.font = "400 22px Mitr, sans-serif";
        ctx.fillText(new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }), 300, 372);
        ctx.font = "400 21px Mitr, sans-serif";
        let y = 620;
        for (const r of rows) {
            for (const line of wrap(ctx, `${r.label}: ${r.text}`, 640)) {
                if (y > 930)
                    break;
                ctx.fillText(line, 40, y);
                y += 32;
            }
            y += 6;
        }
        setImage(c.toDataURL("image/png"));
    };
    return (_jsxs("div", { className: "memory", children: [rows.length ? (_jsx("ul", { className: "memory-list", children: rows.map((r) => (_jsxs("li", { children: [_jsx("strong", { children: r.label }), " ", r.text] }, r.label))) })) : (_jsx("p", { className: "wish-empty", children: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E17\u0E23\u0E07\u0E08\u0E33\u0E04\u0E37\u0E19\u0E19\u0E35\u0E49 \u0E25\u0E2D\u0E07\u0E44\u0E2B\u0E27\u0E49\u0E1E\u0E23\u0E30 \u0E40\u0E25\u0E48\u0E19\u0E40\u0E01\u0E21 \u0E2B\u0E23\u0E37\u0E2D\u0E25\u0E2D\u0E22\u0E01\u0E23\u0E30\u0E17\u0E07\u0E01\u0E48\u0E2D\u0E19\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E2D\u0E22\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E19\u0E30" })), _jsx("button", { type: "button", className: "panel-action", onClick: make, children: "\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E01\u0E32\u0E23\u0E4C\u0E14\u0E17\u0E35\u0E48\u0E23\u0E30\u0E25\u0E36\u0E01" }), image && (_jsxs("div", { className: "memory-card", children: [_jsx("img", { src: image, alt: "\u0E01\u0E32\u0E23\u0E4C\u0E14\u0E17\u0E35\u0E48\u0E23\u0E30\u0E25\u0E36\u0E01\u0E04\u0E37\u0E19\u0E19\u0E35\u0E49" }), _jsx("a", { className: "panel-action secondary", href: image, download: "\u0E25\u0E2D\u0E22\u0E01\u0E23\u0E30\u0E17\u0E07\u0E23\u0E34\u0E21\u0E40\u0E25.png", children: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E23\u0E39\u0E1B\u0E25\u0E07\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07" })] })), _jsx("p", { className: "wish-fine", children: "\u0E01\u0E32\u0E23\u0E4C\u0E14\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E43\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19 \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2A\u0E48\u0E07\u0E02\u0E36\u0E49\u0E19\u0E17\u0E35\u0E48\u0E44\u0E2B\u0E19" })] }));
}
function memoryRows(m, treasureTotal) {
    const rows = [];
    if (m.wishes.length)
        rows.push({ label: "คำอธิษฐาน", text: m.wishes.map((w) => w || "ลอยกระทงโดยไม่เขียนคำอธิษฐาน").join(" · ") });
    if (m.lanterns.length)
        rows.push({ label: "ปล่อยโคม", text: m.lanterns.map((w) => w || "ปล่อยโคมโดยไม่เขียนคำอธิษฐาน").join(" · ") });
    if (m.prayed)
        rows.push({ label: "ไหว้พระ", text: m.offered.length ? `${m.prayed} ครั้ง ถวาย${m.offered.join(" ")}` : `${m.prayed} ครั้ง` });
    if (m.fortune)
        rows.push({ label: "เซียมซี", text: m.fortune });
    if (m.prizes.length)
        rows.push({ label: "ของรางวัล", text: m.prizes.join(" · ") });
    if (m.treats.length)
        rows.push({ label: "ของกิน", text: m.treats.join(" · ") });
    if (m.treasures.length)
        rows.push({ label: `สมบัติริมหาด ${m.treasures.length}/${treasureTotal}`, text: m.treasures.join(" · ") });
    const fun = [m.rode && "ขึ้นชิงช้าสวรรค์", m.danced && "รำวงบนเวที"].filter(Boolean);
    if (fun.length)
        rows.push({ label: "ความสนุก", text: fun.join(" · ") });
    return rows;
}
function wrap(ctx, text, width) {
    // Thai has no spaces between words, so break by characters when a line gets too long.
    const lines = [];
    let line = "";
    for (const ch of Array.from(text)) {
        if (ctx.measureText(line + ch).width > width && /[^ัิ-ฺ็-๎]/.test(ch)) {
            lines.push(line);
            line = "";
        }
        line += ch;
    }
    if (line)
        lines.push(line);
    return lines;
}
