import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * A small glowing light at each place. Its name only appears when it is useful:
 * on hover or keyboard focus, when selected, or when the visitor is nearby.
 * The renderer moves these every frame (see App.tsx) so they stay pinned to the world.
 */
export function PlaceMarkers({ places, refs, labelled, active, onVisit, onHover, hidden, ui }) {
    return (_jsx("div", { className: `markers ${hidden ? "is-hidden" : ""}`, children: places.map((p) => (_jsxs("button", { ref: (el) => { refs.current[p.id] = el; }, type: "button", className: `marker ${labelled(p.id) ? "labelled" : ""} ${active === p.id ? "active" : ""}`, "aria-label": `${ui.walkTo}${p.name}`, tabIndex: hidden ? -1 : 0, onClick: () => onVisit(p.id), onPointerEnter: (e) => e.pointerType === "mouse" && onHover(p.id), onPointerLeave: () => onHover(null), onFocus: () => onHover(p.id), onBlur: () => onHover(null), children: [_jsx("span", { className: "marker-label", "aria-hidden": "true", children: _jsx("span", { className: "marker-name", children: p.name }) }), _jsx("span", { className: "marker-dot", "aria-hidden": "true" })] }, p.id))) }));
}
