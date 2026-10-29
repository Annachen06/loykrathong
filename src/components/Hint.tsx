import { useEffect, useState } from "react";

/** A short line at the top of the screen that fades away on its own. */
export function Hint({ hint }: { hint: { text: string; key: number } | null }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!hint) return;
    setShown(true);
    const t = window.setTimeout(() => setShown(false), 4200);
    return () => window.clearTimeout(t);
  }, [hint]);
  return (
    <div className={`hint ${shown ? "show" : ""}`} role="status" aria-live="polite">
      {hint?.text}
    </div>
  );
}
