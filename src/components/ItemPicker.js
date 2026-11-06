import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
/** A stall's choices: a small picture, a name, one line, and a button. Everything is free; nothing is sold. */
export function ItemPicker({ items, owned, pickLabel, onPick, preview }) {
    return (_jsx("ul", { className: "item-picker", children: items.map((item) => (_jsxs("li", { children: [_jsx(ItemPicture, { item: item, preview: preview }), _jsxs("div", { className: "item-words", children: [_jsx("strong", { children: item.name }), _jsx("span", { children: item.text })] }), _jsx("button", { type: "button", className: "item-pick", "data-item": item.id, onClick: () => onPick(item), "aria-label": `${pickLabel}${item.name}`, children: owned.includes(item.id) ? "มีแล้ว ✓" : pickLabel })] }, item.id))) }));
}
function ItemPicture({ item, preview }) {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current;
        const ctx = c?.getContext("2d");
        if (!c || !ctx)
            return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = 64 * dpr;
        c.height = 56 * dpr;
        ctx.scale(dpr, dpr);
        preview(ctx, item);
    }, [item, preview]);
    return _jsx("canvas", { ref: ref, className: "item-picture", width: 64, height: 56, "aria-hidden": "true" });
}
