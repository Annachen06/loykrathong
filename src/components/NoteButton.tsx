import { useEffect } from "react";
import type { FestivalConfig } from "../festivals/types";
import type { SharedConfig } from "../engine/sharedSea";
import { CreatorNote } from "./CreatorNote";

/** The creator's corner, opened from the map: a note of encouragement first, then a thank-you and a link to the owner's Ko-fi page. */
export function NoteButton({ hidden, open, onClose, support, inbox }: { hidden: boolean; open: boolean; onClose: () => void; support?: FestivalConfig["support"]; inbox?: SharedConfig }) {
  const setOpen = (o: boolean) => { if (!o) onClose(); };
  useEffect(() => {
    if (hidden && open) onClose();
  }, [hidden, open, onClose]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`note${hidden ? " is-hidden" : ""}`}>
      {open && (
        <div className="note-pop" role="dialog" aria-label="ส่งกำลังใจให้ผู้สร้าง">
          <button type="button" className="note-close" aria-label="ปิด" onClick={() => setOpen(false)}>✕</button>
          <h2 className="note-title">☕ ส่งกำลังใจให้ผู้สร้าง</h2>
          <CreatorNote inbox={inbox} />
          {support && (
            <section className="support">
              <h3>{support.title}</h3>
              {support.text.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
              {support.url && (
                <>
                  {support.linkHint && <p className="support-or">{support.linkHint}</p>}
                  <a className="panel-action secondary support-link" href={support.url} target="_blank" rel="noopener noreferrer">{support.linkLabel ?? "ให้กำลังใจ"}</a>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
