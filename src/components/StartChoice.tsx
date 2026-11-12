import { useEffect, useRef } from "react";
import type { FestivalConfig } from "../festivals/types";

type Props = {
  choices: FestivalConfig["startChoices"];
  show: boolean;
  onPick: (choice: FestivalConfig["startChoices"][number]) => void;
};

/** Right after stepping in: "where to first?", so the visitor is taken straight to what they came for. */
export function StartChoice({ choices, show, onPick }: Props) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (show) first.current?.focus({ preventScroll: true }); }, [show]);
  if (!show) return null;
  return (
    <section className="start-choice" role="dialog" aria-labelledby="start-title">
      <h2 id="start-title">วันนี้อยากไปไหนก่อนดี</h2>
      <div className="start-options">
        {choices.map((c, i) => (
          <button key={c.id} ref={i === 0 ? first : undefined} type="button" data-start={c.id} className="start-option" onClick={() => onPick(c)}>
            <span className="start-icon" aria-hidden="true">{c.icon}</span>
            <span className="start-words">
              <strong>{c.label}</strong>
              <span>{c.text}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
