import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
/** A short line at the top of the screen that fades away on its own. */
export function Hint({ hint }) {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        if (!hint)
            return;
        setShown(true);
        const t = window.setTimeout(() => setShown(false), 4200);
        return () => window.clearTimeout(t);
    }, [hint]);
    return (_jsx("div", { className: `hint ${shown ? "show" : ""}`, role: "status", "aria-live": "polite", children: hint?.text }));
}
