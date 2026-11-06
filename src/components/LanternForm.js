import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
/** At the lantern ground: pick a colour, write a wish (optional), and let it go. The wish stays on this device only. */
export function LanternForm({ lanterns, onRelease }) {
    const [pick, setPick] = useState(lanterns[0]);
    const [wish, setWish] = useState("");
    return (_jsxs("form", { className: "float-form", onSubmit: (e) => {
            e.preventDefault();
            onRelease(pick, wish.trim());
            setWish("");
        }, children: [_jsx("div", { className: "lantern-colors", role: "radiogroup", "aria-label": "\u0E2A\u0E35\u0E42\u0E04\u0E21", children: lanterns.map((l) => (_jsxs("button", { type: "button", role: "radio", "aria-checked": pick.id === l.id, "data-lantern": l.id, className: `lantern-color ${pick.id === l.id ? "on" : ""}`, onClick: () => setPick(l), children: [_jsx("span", { className: "lantern-dot", style: { background: l.color }, "aria-hidden": "true" }), l.name] }, l.id))) }), _jsx("p", { className: "lantern-note", children: pick.text }), _jsx("label", { htmlFor: "lantern-wish", children: "\u0E15\u0E31\u0E49\u0E07\u0E08\u0E34\u0E15\u0E2D\u0E18\u0E34\u0E29\u0E10\u0E32\u0E19 (\u0E44\u0E21\u0E48\u0E43\u0E2A\u0E48\u0E01\u0E47\u0E44\u0E14\u0E49)" }), _jsx("textarea", { id: "lantern-wish", value: wish, maxLength: 80, rows: 2, placeholder: "\u0E02\u0E2D\u0E43\u0E2B\u0E49\u2026", onChange: (e) => setWish(e.target.value) }), _jsx("p", { className: "privacy", children: "\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E29\u0E10\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E27\u0E32\u0E21\u0E25\u0E31\u0E1A \u0E2D\u0E22\u0E39\u0E48\u0E41\u0E04\u0E48\u0E43\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E19\u0E35\u0E49 \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2A\u0E48\u0E07\u0E44\u0E1B\u0E17\u0E35\u0E48\u0E44\u0E2B\u0E19" }), _jsxs("button", { type: "submit", className: "panel-action", children: ["\u0E1B\u0E25\u0E48\u0E2D\u0E22", pick.name] })] }));
}
