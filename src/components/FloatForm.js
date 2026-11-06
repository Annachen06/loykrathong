import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
/** At the end of the pier: write a wish (optional) and float your krathong. The wish stays on this device only. */
export function FloatForm({ label, krathong, onFloat, onShop }) {
    const [wish, setWish] = useState("");
    return (_jsxs("form", { className: "float-form", onSubmit: (e) => {
            e.preventDefault();
            onFloat(wish.trim());
            setWish("");
        }, children: [_jsxs("p", { className: "float-krathong", children: [krathong ? _jsxs(_Fragment, { children: ["\u0E43\u0E19\u0E21\u0E37\u0E2D\u0E04\u0E38\u0E13: ", _jsx("strong", { children: krathong })] }) : _jsx(_Fragment, { children: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E01\u0E23\u0E30\u0E17\u0E07 \u0E08\u0E30\u0E44\u0E14\u0E49\u0E01\u0E23\u0E30\u0E17\u0E07\u0E43\u0E1A\u0E15\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E17\u0E48\u0E32\u0E19\u0E49\u0E33\u0E44\u0E1B\u0E01\u0E48\u0E2D\u0E19" }), !krathong && _jsx("button", { type: "button", className: "link", onClick: onShop, children: "\u0E44\u0E1B\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E17\u0E35\u0E48\u0E23\u0E49\u0E32\u0E19\u0E01\u0E23\u0E30\u0E17\u0E07" })] }), _jsx("label", { htmlFor: "wish-input", children: "\u0E15\u0E31\u0E49\u0E07\u0E08\u0E34\u0E15\u0E2D\u0E18\u0E34\u0E29\u0E10\u0E32\u0E19 (\u0E44\u0E21\u0E48\u0E43\u0E2A\u0E48\u0E01\u0E47\u0E44\u0E14\u0E49)" }), _jsx("textarea", { id: "wish-input", value: wish, maxLength: 80, rows: 2, placeholder: "\u0E02\u0E2D\u0E43\u0E2B\u0E49\u2026", onChange: (e) => setWish(e.target.value) }), _jsx("p", { className: "privacy", children: "\u0E04\u0E33\u0E2D\u0E18\u0E34\u0E29\u0E10\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E27\u0E32\u0E21\u0E25\u0E31\u0E1A \u0E2D\u0E22\u0E39\u0E48\u0E41\u0E04\u0E48\u0E43\u0E19\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E19\u0E35\u0E49 \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2A\u0E48\u0E07\u0E44\u0E1B\u0E17\u0E35\u0E48\u0E44\u0E2B\u0E19" }), _jsx("button", { type: "submit", className: "panel-action", children: label })] }));
}
