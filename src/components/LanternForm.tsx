import { useState } from "react";
import type { FairItem } from "../festivals/types";

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
            <span className="lantern-dot" style={{ background: l.color }} aria-hidden="true" />
            {l.name}
          </button>
        ))}
      </div>
      <p className="lantern-note">{pick.text}</p>
      <label htmlFor="lantern-wish">ตั้งจิตอธิษฐาน (ไม่ใส่ก็ได้)</label>
      <textarea id="lantern-wish" value={wish} maxLength={80} rows={2} placeholder="ขอให้…" onChange={(e) => setWish(e.target.value)} />
      <p className="privacy">คำอธิษฐานของคุณเป็นความลับ อยู่แค่ในเครื่องนี้ ไม่ได้ส่งไปที่ไหน</p>
      <button type="submit" className="panel-action">ปล่อย{pick.name}</button>
    </form>
  );
}
