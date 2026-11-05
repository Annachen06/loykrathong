import { useEffect, useState } from "react";

export type Bubble = { title: string; text: string; tag?: string; key: number };

/** A paper note that opens when you tap a krathong on the water. Fades away on its own. */
export function WishBubble({ bubble, onClose }: { bubble: Bubble | null; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!bubble) return;
    setShown(true);
    const t = window.setTimeout(() => setShown(false), 6500);
    return () => window.clearTimeout(t);
  }, [bubble]);
  if (!bubble) return null;
  return (
    <div className={`wish-bubble ${shown ? "show" : ""}`} role="status" aria-live="polite" onClick={() => { setShown(false); onClose(); }}>
      <div className="wish-head">
        <span>{bubble.title}</span>
        {bubble.tag && <span className="wish-tag">{bubble.tag}</span>}
      </div>
      <p>“{bubble.text}”</p>
    </div>
  );
}
