import { useEffect, useRef, type ReactNode } from "react";
import type { FestivalConfig, Place } from "../festivals/types";

type Props = {
  place: Place;
  ui: FestivalConfig["ui"];
  stat?: number;
  onAction: () => void;
  onClose: () => void;
  /** Extra content for richer places (the floating form, the games, the wish board). */
  children?: ReactNode;
};

/** The little card that opens when the visitor arrives somewhere. It leaves the world visible. */
export function PlacePanel({ place, ui, stat, onAction, onClose, children }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    // Move keyboard focus into the card for keyboard users, without scrolling the page.
    if (window.matchMedia("(pointer: fine)").matches) ref.current?.focus({ preventScroll: true });
  }, [place.id]);

  return (
    <aside ref={ref} className={`panel panel-${place.panel ?? "basic"}`} role="dialog" aria-labelledby="panel-title" tabIndex={-1} key={place.id}>
      <button type="button" className="panel-close" aria-label={ui.close} onClick={onClose}>
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <h2 id="panel-title">{place.name}</h2>
      <p className="panel-text">{place.description}</p>
      {place.stat && (
        <p className="panel-stat">
          {place.stat.label} <strong>{stat ?? 0}</strong>
        </p>
      )}
      {children}
      {place.note && <p className="panel-note">{place.note}</p>}
      {place.action && !place.panel && (
        <button type="button" className="panel-action" onClick={onAction}>
          {place.action.label}
        </button>
      )}
    </aside>
  );
}
