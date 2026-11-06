import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
/** The little card that opens when the visitor arrives somewhere. It leaves the world visible. */
export function PlacePanel({ place, ui, stat, onAction, onClose, children }) {
    const ref = useRef(null);
    useEffect(() => {
        // Move keyboard focus into the card for keyboard users, without scrolling the page.
        if (window.matchMedia("(pointer: fine)").matches)
            ref.current?.focus({ preventScroll: true });
    }, [place.id]);
    return (_jsxs("aside", { ref: ref, className: `panel panel-${place.panel ?? "basic"}`, role: "dialog", "aria-labelledby": "panel-title", tabIndex: -1, children: [_jsx("button", { type: "button", className: "panel-close", "aria-label": ui.close, onClick: onClose, children: _jsx("svg", { viewBox: "0 0 16 16", width: "16", height: "16", "aria-hidden": "true", children: _jsx("path", { d: "M3 3l10 10M13 3L3 13", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }) }) }), _jsx("h2", { id: "panel-title", children: place.name }), _jsx("p", { className: "panel-text", children: place.description }), place.stat && (_jsxs("p", { className: "panel-stat", children: [place.stat.label, " ", _jsx("strong", { children: stat ?? 0 })] })), children, place.note && _jsx("p", { className: "panel-note", children: place.note }), place.action && !place.panel && (_jsx("button", { type: "button", className: "panel-action", onClick: onAction, children: place.action.label }))] }, place.id));
}
