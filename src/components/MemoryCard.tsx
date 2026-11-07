import { useCallback, useEffect, useState } from "react";
import { makeMemoryCard } from "./memoryCardImage";

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
  /** Paints the real fair with this visitor in it onto the card's canvas (1080 × 1920). */
  paintScene: (canvas: HTMLCanvasElement) => void;
  brand: string;
  treasureTotal: number;
};

const CARD_NAME = "loykrathong-memory.png";

/** What you did tonight, listed, and gathered into a 9:16 souvenir card (for an Instagram Story) you can save. Nothing leaves this device. */
export function MemoryCard({ memories: m, paintScene, brand, treasureTotal }: Props) {
  const [card, setCard] = useState<{ url: string; file: File } | null>(null);
  const [failed, setFailed] = useState(false);
  const rows = memoryRows(m, treasureTotal);

  // the preview is the very file that gets saved, so the two can never differ
  useEffect(() => {
    let live = true;
    let url = "";
    makeMemoryCard({ paintScene, title: brand, site: window.location.host || "loykrathong" })
      .then((blob) => {
        if (!live) return;
        url = URL.createObjectURL(blob);
        setCard({ url, file: new File([blob], CARD_NAME, { type: "image/png" }) });
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [paintScene, brand]);

  const save = useCallback(() => {
    if (!card) return;
    const a = document.createElement("a");
    a.href = card.url;
    a.download = CARD_NAME;
    a.click();
  }, [card]);
  // phones that can share a picture also get a share button (Instagram shows up in that sheet)
  const canShare = !!card && typeof navigator.canShare === "function" && navigator.canShare({ files: [card.file] }) && window.matchMedia("(pointer: coarse)").matches;
  const share = useCallback(() => {
    if (card) navigator.share({ files: [card.file] }).catch(() => {});
  }, [card]);

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
      <div className="memory-card">
        {card ? <img src={card.url} alt="การ์ดความทรงจำคืนนี้" width={1080} height={1920} /> : <p className="wish-fine">{failed ? "สร้างการ์ดไม่สำเร็จ ลองเปิดมุมความทรงจำใหม่อีกครั้งนะ" : "กำลังเตรียมการ์ด…"}</p>}
      </div>
      <button type="button" className="panel-action" onClick={save} disabled={!card}>บันทึกการ์ดของฉัน</button>
      {canShare && <button type="button" className="panel-action secondary" onClick={share}>แชร์ลงสตอรี่</button>}
      <p className="wish-fine">การ์ดสร้างในเครื่องนี้เท่านั้น ไม่ได้ส่งขึ้นที่ไหน</p>
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

