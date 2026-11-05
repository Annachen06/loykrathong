import { useEffect, useRef, useState } from "react";
import type { FestivalConfig, Place } from "../festivals/types";

type Props = { places: Place[]; active: string | null; onVisit: (id: string) => void; hidden: boolean; ui: FestivalConfig["ui"] };

/** One small "map" button. It opens a short list of every place, so you can get anywhere without hunting on the picture. */
export function MapMenu({ places, active, onVisit, hidden, ui }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);

  // close when tapping anywhere else, or with Escape
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc); };
  }, [open]);
  useEffect(() => { if (hidden) setOpen(false); }, [hidden]);

  return (
    <nav ref={root} className={`dock ${hidden ? "is-hidden" : ""} ${open ? "is-open" : ""}`} aria-label={ui.placesLabel}>
      {open && (
        <ul id="map-list">
          {places.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={active === p.id ? "active" : ""}
                onClick={() => { setOpen(false); onVisit(p.id); }}
                aria-label={`${ui.walkTo}${p.name}`}
              >
                {p.shortName}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="map-toggle"
        aria-expanded={open}
        aria-controls="map-list"
        tabIndex={hidden ? -1 : 0}
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Zm0 0v13m6-10.5v13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        {open ? ui.close : ui.mapLabel}
      </button>
    </nav>
  );
}
