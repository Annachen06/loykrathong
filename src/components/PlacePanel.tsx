import { useEffect, useRef } from "react";
import type { Place } from "../festivals/types";

type Props = { place: Place; stat?: number; onAction: () => void; onClose: () => void };

/** The little card that opens when the visitor arrives somewhere. It leaves the world visible. */
export function PlacePanel({ place, stat, onAction, onClose }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    // Move keyboard focus into the card for keyboard users, without scrolling the page.
    if (window.matchMedia("(pointer: fine)").matches) ref.current?.focus({ preventScroll: true });
  }, [place.id]);

  return (
    <aside ref={ref} className="panel" role="dialog" aria-labelledby="panel-title" tabIndex={-1} key={place.id}>
      <button type="button" className="panel-close" aria-label="Close" onClick={onClose}>
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <p className="panel-th">{place.nameTh}</p>
      <h2 id="panel-title">{place.nameEn}</h2>
      <p className="panel-text">{place.description}</p>
      {place.stat && (
        <p className="panel-stat">
          <strong>{stat ?? 0}</strong> {place.stat.label}
        </p>
      )}
      {place.note && <p className="panel-note">{place.note}</p>}
      {place.action && (
        <button type="button" className="panel-action" onClick={onAction}>
          {place.action.label}
        </button>
      )}
    </aside>
  );
}
