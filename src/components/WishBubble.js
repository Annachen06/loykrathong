import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
/** A paper note that opens when you tap a krathong on the water or something on the sand. Fades away on its own. */
export function WishBubble({ bubble, onClose }) {
    const [shown, setShown] = useState(false);
    useEffect(() => {
        if (!bubble)
            return;
        setShown(true);
        const t = window.setTimeout(() => setShown(false), 6500);
        return () => window.clearTimeout(t);
    }, [bubble]);
    if (!bubble)
        return null;
    return (_jsxs("div", { className: `wish-bubble ${shown ? "show" : ""}`, role: "status", "aria-live": "polite", onClick: () => { setShown(false); onClose(); }, children: [_jsxs("div", { className: "wish-head", children: [_jsx("span", { children: bubble.title }), bubble.tag && _jsx("span", { className: "wish-tag", children: bubble.tag })] }), _jsxs("p", { children: ["\u201C", bubble.text, "\u201D"] }), bubble.note && _jsx("p", { className: "wish-note", children: bubble.note })] }));
}
