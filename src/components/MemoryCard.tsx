import { useState } from "react";
import type { VisitorLook } from "../festivals/types";
import { drawPerson, type Hold } from "../engine/person";

export type Memories = {
  wishes: string[];
  /** wishes sent up with sky lanterns */
  lanterns: string[];
  fortune: string | null;
  prayed: number;
  offered: string[];
  prizes: string[];
  treats: string[];
  treasures: string[];
  rode: boolean;
  danced: boolean;
};

type Props = {
  memories: Memories;
  look: VisitorLook;
  hand?: { hold: Hold; color?: string; color2?: string; style?: string };
  brand: string;
  treasureTotal: number;
  support?: { title: string; text: string; url?: string; linkLabel?: string; qr?: string };
};

/** What you did tonight, gathered into a souvenir card you can save as a picture. Nothing leaves this device. */
export function MemoryCard({ memories: m, look, hand, brand, treasureTotal, support }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const rows = memoryRows(m, treasureTotal);

  const make = () => {
    const c = document.createElement("canvas");
    c.width = 720;
    c.height = 960;
    const ctx = c.getContext("2d")!;
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
    for (let i = 0; i < 4; i++) ctx.fillRect(520 + Math.sin(i) * 20, 566 + i * 8, 80 - i * 12, 3);
    ctx.fillStyle = "rgba(255,244,226,0.1)";
    ctx.beginPath();
    ctx.roundRect(22, 592, 676, 346, 22);
    ctx.fill();
    drawPerson(ctx, 150, 560, 4.2, 1, 0, 0, 1, look, hand ? { hold: hand.hold, holdColor: hand.color, holdColor2: hand.color2, holdStyle: hand.style } : {});
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
        if (y > 930) break;
        ctx.fillText(line, 40, y);
        y += 32;
      }
      y += 6;
    }
    setImage(c.toDataURL("image/png"));
  };

  return (
    <div className="memory">
      {rows.length ? (
        <ul className="memory-list">
          {rows.map((r) => (
            <li key={r.label}><strong>{r.label}</strong> {r.text}</li>
          ))}
        </ul>
      ) : (
        <p className="wish-empty">ยังไม่มีความทรงจำคืนนี้ ลองไหว้พระ เล่นเกม หรือลอยกระทงก่อนแล้วค่อยกลับมานะ</p>
      )}
      <button type="button" className="panel-action" onClick={make}>สร้างการ์ดที่ระลึก</button>
      {image && (
        <div className="memory-card">
          <img src={image} alt="การ์ดที่ระลึกคืนนี้" />
          <a className="panel-action secondary" href={image} download="ลอยกระทงริมทะเล.png">บันทึกรูปลงเครื่อง</a>
        </div>
      )}
      <p className="wish-fine">การ์ดสร้างในเครื่องนี้เท่านั้น ไม่ได้ส่งขึ้นที่ไหน</p>
      {support && (support.url || support.qr) && (
        <aside className="support" aria-label={support.title}>
          <h3>{support.title}</h3>
          <p>{support.text}</p>
          {support.qr && <img className="support-qr" src={support.qr} alt="QR สำหรับให้กำลังใจ" />}
          {support.url && (
            <a className="panel-action secondary" href={support.url} target="_blank" rel="noopener noreferrer">{support.linkLabel ?? "ให้กำลังใจ"}</a>
          )}
        </aside>
      )}
    </div>
  );
}

function memoryRows(m: Memories, treasureTotal: number) {
  const rows: { label: string; text: string }[] = [];
  if (m.wishes.length) rows.push({ label: "คำอธิษฐาน", text: m.wishes.map((w) => w || "ลอยกระทงโดยไม่เขียนคำอธิษฐาน").join(" · ") });
  if (m.lanterns.length) rows.push({ label: "ปล่อยโคม", text: m.lanterns.map((w) => w || "ปล่อยโคมโดยไม่เขียนคำอธิษฐาน").join(" · ") });
  if (m.prayed) rows.push({ label: "ไหว้พระ", text: m.offered.length ? `${m.prayed} ครั้ง ถวาย${m.offered.join(" ")}` : `${m.prayed} ครั้ง` });
  if (m.fortune) rows.push({ label: "เซียมซี", text: m.fortune });
  if (m.prizes.length) rows.push({ label: "ของรางวัล", text: m.prizes.join(" · ") });
  if (m.treats.length) rows.push({ label: "ของกิน", text: m.treats.join(" · ") });
  if (m.treasures.length) rows.push({ label: `สมบัติริมหาด ${m.treasures.length}/${treasureTotal}`, text: m.treasures.join(" · ") });
  const fun = [m.rode && "ขึ้นชิงช้าสวรรค์", m.danced && "รำวงบนเวที"].filter(Boolean);
  if (fun.length) rows.push({ label: "ความสนุก", text: fun.join(" · ") });
  return rows;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  // Thai has no spaces between words, so break by characters when a line gets too long.
  const lines: string[] = [];
  let line = "";
  for (const ch of Array.from(text)) {
    if (ctx.measureText(line + ch).width > width && /[^ัิ-ฺ็-๎]/.test(ch)) {
      lines.push(line);
      line = "";
    }
    line += ch;
  }
  if (line) lines.push(line);
  return lines;
}
