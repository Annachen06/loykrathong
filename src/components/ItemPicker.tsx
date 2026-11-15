import { useEffect, useRef } from "react";
import type { FairItem } from "../festivals/types";

type Props = {
  items: FairItem[];
  /** Ids of items you already have (shown as "มีแล้ว"). */
  owned: string[];
  pickLabel: string;
  onPick: (item: FairItem) => void;
  /** Draws a small picture of the item, centred in a 64 × 56 box. */
  preview: (ctx: CanvasRenderingContext2D, item: FairItem) => void;
};

/** A stall's choices: a small picture, a name, one line, and a button. Everything is free; nothing is sold. */
export function ItemPicker({ items, owned, pickLabel, onPick, preview }: Props) {
  return (
    <ul className="item-picker">
      {items.map((item) => (
        <li key={item.id} className={item.premium ? "is-premium" : undefined}>
          <ItemPicture item={item} preview={preview} />
          <div className="item-words">
            <strong>{item.name}</strong>
            {item.premium && <em className="premium-tag">รุ่นพิเศษ · ฟรีช่วงทดลอง</em>}
            <span>{item.text}</span>
          </div>
          <button type="button" className="item-pick" data-item={item.id} onClick={() => onPick(item)} aria-label={`${pickLabel}${item.name}`}>
            {owned.includes(item.id) ? "มีแล้ว ✓" : pickLabel}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ItemPicture({ item, preview }: { item: FairItem; preview: Props["preview"] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 64 * dpr;
    c.height = 56 * dpr;
    ctx.scale(dpr, dpr);
    preview(ctx, item);
  }, [item, preview]);
  return <canvas ref={ref} className="item-picture" width={64} height={56} aria-hidden="true" />;
}
