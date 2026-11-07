import { useEffect, useState } from "react";
import type { FestivalConfig } from "../festivals/types";
import { CreatorNote } from "./CreatorNote";
import { SupportSlip } from "./SupportSlip";

/** A small cup icon in the bottom-right corner. Tap it for the creator's corner: a thank-you, the PromptPay QR, a place to send the slip, and a note of encouragement. */
export function NoteButton({ hidden, support }: { hidden: boolean; support?: FestivalConfig["support"] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`note${hidden ? " is-hidden" : ""}`}>
      {open && (
        <div className="note-pop" role="dialog" aria-label={support?.title ?? "ฝากข้อความให้กำลังใจผู้สร้าง"}>
          <button type="button" className="note-close" aria-label="ปิด" onClick={() => setOpen(false)}>✕</button>
          {support && (
            <section className="support">
              <h3>{support.title}</h3>
              {support.text.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
              {support.qr && <img className="support-qr" src={support.qr} alt="QR PromptPay สำหรับให้กำลังใจ สแกนด้วยแอปธนาคารแล้วใส่จำนวนเงินเอง" />}
              {support.url && (
                <a className="panel-action secondary" href={support.url} target="_blank" rel="noopener noreferrer">{support.linkLabel ?? "ให้กำลังใจ"}</a>
              )}
              {support.qr && <SupportSlip />}
            </section>
          )}
          <CreatorNote />
        </div>
      )}
      <button
        type="button"
        className="note-fab"
        aria-expanded={open}
        aria-label="Buy Me a Cocoa และฝากข้อความให้กำลังใจผู้สร้าง"
        title="Buy Me a Cocoa · ฝากข้อความถึงผู้สร้าง"
        onClick={() => setOpen((o) => !o)}
      >
        ☕
      </button>
    </div>
  );
}
