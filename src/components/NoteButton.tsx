import { useEffect, useState } from "react";
import { CreatorNote } from "./CreatorNote";

/** A small icon in the bottom-right corner: tap it to leave a few kind words for the creator. */
export function NoteButton({ hidden }: { hidden: boolean }) {
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
        <div className="note-pop" role="dialog" aria-label="ฝากข้อความให้กำลังใจผู้สร้าง">
          <button type="button" className="note-close" aria-label="ปิด" onClick={() => setOpen(false)}>✕</button>
          <CreatorNote />
        </div>
      )}
      <button
        type="button"
        className="note-fab"
        aria-expanded={open}
        aria-label="ฝากข้อความให้กำลังใจผู้สร้าง"
        title="ฝากข้อความให้กำลังใจผู้สร้าง"
        onClick={() => setOpen((o) => !o)}
      >
        💌
      </button>
    </div>
  );
}
