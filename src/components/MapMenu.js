import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
/** One small "map" button. It opens a short list of every place, so you can get anywhere without hunting on the picture. */
export function MapMenu({ places, active, onVisit, hidden, ui }) {
    const [open, setOpen] = useState(false);
    const root = useRef(null);
    // close when tapping anywhere else, or with Escape
    useEffect(() => {
        if (!open)
            return;
        const away = (e) => { if (!root.current?.contains(e.target))
            setOpen(false); };
        const esc = (e) => { if (e.key === "Escape")
            setOpen(false); };
        window.addEventListener("pointerdown", away);
        window.addEventListener("keydown", esc);
        return () => { window.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc); };
    }, [open]);
    useEffect(() => { if (hidden)
        setOpen(false); }, [hidden]);
    return (_jsxs("nav", { ref: root, className: `dock ${hidden ? "is-hidden" : ""} ${open ? "is-open" : ""}`, "aria-label": ui.placesLabel, children: [open && (_jsx("ul", { id: "map-list", children: places.map((p) => (_jsx("li", { children: _jsx("button", { type: "button", className: active === p.id ? "active" : "", onClick: () => { setOpen(false); onVisit(p.id); }, "aria-label": `${ui.walkTo}${p.name}`, children: p.shortName }) }, p.id))) })), _jsxs("button", { type: "button", className: "map-toggle", "aria-expanded": open, "aria-controls": "map-list", tabIndex: hidden ? -1 : 0, onClick: () => setOpen((o) => !o), children: [_jsx("svg", { viewBox: "0 0 24 24", width: "18", height: "18", "aria-hidden": "true", children: _jsx("path", { d: "M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Zm0 0v13m6-10.5v13", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinejoin: "round" }) }), open ? ui.close : ui.mapLabel] })] }));
}
