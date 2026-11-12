import { useEffect, useRef, useState } from "react";
import type { FairItem } from "../festivals/types";
import { drawPaperLantern } from "../engine/person";

type Props = {
  lanterns: FairItem[];
  onRelease: (lantern: FairItem, wish: string) => void;
};

/** At the lantern ground: pick a colour, write a wish (optional), and let it go. The wish stays on this device only. */
export function LanternForm({ lanterns, onRelease }: Props) {
  const [pick, setPick] = useState(lanterns[0]);
  const [wish, setWish] = useState("");
  return (
    <form
      className="float-form"
      onSubmit={(e) => {
        e.preventDefault();
        onRelease(pick, wish.trim());
        setWish("");
      }}
    >
      <div className="lantern-colors" role="radiogroup" aria-label="สีโคม">
        {lanterns.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={pick.id === l.id}
            data-lantern={l.id}
            className={`lantern-color ${pick.id === l.id ? "on" : ""}`}
            onClick={() => setPick(l)}
          >
            <LanternIcon lantern={l} />
            {l.name}
            {l.premium && <em className="premium-tag">พิเศษ</em>}
          </button>
        ))}
      </div>
      <p className="lantern-note">{pick.text}{pick.premium && " (รุ่นพิเศษ ฟรีช่วงทดลอง)"}</p>
      <label htmlFor="lantern-wish">ตั้งจิตอธิษฐาน (ไม่ใส่ก็ได้)</label>
      <textarea id="lantern-wish" value={wish} maxLength={80} rows={2} placeholder="ขอให้…" onChange={(e) => setWish(e.target.value)} />
      <p className="privacy">คำอธิษฐานของคุณเป็นความลับ อยู่แค่ในเครื่องนี้ ไม่ได้ส่งไปที่ไหน</p>
      <button type="submit" className="panel-action">ปล่อย{pick.name}</button>
    </form>
  );
}

/** A small lit lantern, drawn with the same code as the one in the sky. */
function LanternIcon({ lantern }: { lantern: FairItem }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 26 * dpr;
    c.height = 30 * dpr;
    ctx.scale(dpr, dpr);
    drawPaperLantern(ctx, 13, 15, 1.45, lantern.color ?? "#ffb35c", 0.6, lantern.style, lantern.color2, "#2a1d4a", 1.2);
  }, [lantern]);
  return <canvas ref={ref} className="lantern-icon" width={26} height={30} aria-hidden="true" />;
}
