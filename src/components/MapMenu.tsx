import { useEffect, useRef, useState } from "react";
import type { FestivalConfig, Place } from "../festivals/types";

type Props = {
  places: Place[];
  groups: FestivalConfig["mapGroups"];
  /** Places with a button that is always visible beside the map button, e.g. the temple and the pier. */
  quick: { id: string; label: string; icon: string }[];
  active: string | null;
  onVisit: (id: string) => void;
  hidden: boolean;
  ui: FestivalConfig["ui"];
};

/**
 * The map: a big, always-visible "แผนที่งาน" button with two shortcuts beside it (the temple, the pier).
 * It opens a sheet of everywhere in the fair, in sections (merit, stroll, float), each place a large tile with a picture.
 */
export function MapMenu({ places, groups, quick, active, onVisit, hidden, ui }: Props) {
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

  const go = (id: string) => { setOpen(false); onVisit(id); };
  const tab = hidden ? -1 : 0;

  return (
    <nav ref={root} className={`dock ${hidden ? "is-hidden" : ""} ${open ? "is-open" : ""}`} aria-label={ui.placesLabel}>
      {open && (
        <div className="map-sheet" id="map-list">
          {groups.map((g) => {
            const list = places.filter((p) => (p.group ?? groups[groups.length - 1].id) === g.id);
            if (!list.length) return null;
            return (
              <section key={g.id}>
                <h3><span aria-hidden="true">{g.icon}</span> {g.label}</h3>
                <ul>
                  {list.map((p) => (
                    <li key={p.id}>
                      <button type="button" className={`tile ${active === p.id ? "active" : ""}`} onClick={() => go(p.id)} aria-label={`${ui.walkTo}${p.name}`}>
                        <span className="tile-icon" aria-hidden="true">{p.icon}</span>
                        <span className="tile-name">{p.shortName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <div className="dock-row">
        <button type="button" className="map-toggle" aria-expanded={open} aria-controls="map-list" tabIndex={tab} onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Zm0 0v13m6-10.5v13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          {open ? ui.close : ui.mapLabel}
        </button>
        {!open && quick.map((q) => (
          <button key={q.id} type="button" className="dock-quick" data-quick={q.id} tabIndex={tab} onClick={() => go(q.id)} aria-label={`${ui.walkTo}${q.label}`}>
            <span aria-hidden="true">{q.icon}</span> {q.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
