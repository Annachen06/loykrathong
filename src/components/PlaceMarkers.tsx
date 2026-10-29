import type { MutableRefObject } from "react";
import type { Place } from "../festivals/types";

type Props = {
  places: Place[];
  refs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  labelled: (id: string) => boolean;
  active: string | null;
  onVisit: (id: string) => void;
  onHover: (id: string | null) => void;
  hidden: boolean;
};

/**
 * A small glowing light at each place. Its name only appears when it is useful:
 * on hover or keyboard focus, when selected, or when the visitor is nearby.
 * The renderer moves these every frame (see App.tsx) so they stay pinned to the world.
 */
export function PlaceMarkers({ places, refs, labelled, active, onVisit, onHover, hidden }: Props) {
  return (
    <div className={`markers ${hidden ? "is-hidden" : ""}`}>
      {places.map((p) => (
        <button
          key={p.id}
          ref={(el) => { refs.current[p.id] = el; }}
          type="button"
          className={`marker ${labelled(p.id) ? "labelled" : ""} ${active === p.id ? "active" : ""}`}
          aria-label={`Walk to ${p.nameEn}`}
          tabIndex={hidden ? -1 : 0}
          onClick={() => onVisit(p.id)}
          onPointerEnter={(e) => e.pointerType === "mouse" && onHover(p.id)}
          onPointerLeave={() => onHover(null)}
          onFocus={() => onHover(p.id)}
          onBlur={() => onHover(null)}
        >
          <span className="marker-label" aria-hidden="true">
            <span className="marker-th">{p.nameTh}</span>
            <span className="marker-en">{p.nameEn}</span>
          </span>
          <span className="marker-dot" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
