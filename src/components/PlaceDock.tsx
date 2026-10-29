import { useEffect, useRef } from "react";
import type { Place } from "../festivals/types";

/** A compact row of places: a reliable way to get anywhere, even without tapping the illustration. */
export function PlaceDock({ places, active, onVisit, hidden }: { places: Place[]; active: string | null; onVisit: (id: string) => void; hidden: boolean }) {
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    // on narrow screens the row scrolls; keep the chosen place in view
    list.current?.querySelector<HTMLElement>(".active")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);
  return (
    <nav className={`dock ${hidden ? "is-hidden" : ""}`} aria-label="Places in the festival">
      <ul ref={list}>
        {places.map((p) => (
          <li key={p.id}>
            <button type="button" className={active === p.id ? "active" : ""} onClick={() => onVisit(p.id)} tabIndex={hidden ? -1 : 0} aria-label={`Walk to ${p.nameEn}`}>
              {p.nameEn}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
