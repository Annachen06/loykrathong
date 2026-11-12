import { useEffect } from "react";
import type { HeldThing } from "../festivals/types";

// Prizes for the booth games. Every game ends with a "tier" from 0 (nothing this time) to 3 (the big prize).
// Soft toys and treats are carried in the character's hand; every prize is also listed on the souvenir card. Nothing costs money.

export type Prize = { name: string; hold?: HeldThing };
export type OnPrize = (p: Prize) => void;
export type GameId = "darts" | "rings" | "shoot" | "cans" | "eggs";

export const PRIZES: Record<GameId, (Prize | null)[]> = {
  darts: [null, { name: "ลูกอมรสมะม่วง" }, { name: "พวงกุญแจเปลือกหอย" }, { name: "ตุ๊กตาปลาดาวตัวใหญ่", hold: "plushStar" }],
  rings: [null, { name: "สายไหมหนึ่งไม้", hold: "cottonCandy" }, { name: "ตุ๊กตาแมงกะพรุน", hold: "plushJelly" }, { name: "ตุ๊กตากระต่ายส่องจันทร์", hold: "plushRabbit" }],
  shoot: [null, { name: "ลูกอมรสส้ม" }, { name: "พวงกุญแจตุ๊กตาจิ๋ว" }, { name: "ตุ๊กตากระต่ายส่องจันทร์", hold: "plushRabbit" }],
  cans: [null, { name: "ขนมข้าวโพดคั่ว" }, { name: "สายไหมหนึ่งไม้", hold: "cottonCandy" }, { name: "ตุ๊กตาปลาดาวตัวใหญ่", hold: "plushStar" }],
  eggs: [null, { name: "ลูกอมรสมะนาว" }, { name: "พวงกุญแจไข่ทองคำ" }, { name: "ตุ๊กตาแมงกะพรุน", hold: "plushJelly" }],
};

const MISSED: Record<GameId, string> = {
  darts: "เกือบได้แล้ว ลองอีกทีนะ",
  rings: "ห่วงไม่ลงเลย ลองอีกทีนะ",
  shoot: "ตุ๊กตายังยืนอยู่ ลองอีกทีนะ",
  cans: "กระป๋องยังไม่ล้มเลย ลองอีกทีนะ",
  eggs: "ไข่ใบนี้ว่างเปล่า ลองอีกใบนะ",
};

export const prizeFor = (game: GameId, tier: number) => PRIZES[game][Math.max(0, Math.min(tier, 3))];

export function prizeText(tier: number, game: GameId) {
  const p = prizeFor(game, tier);
  if (!p) return MISSED[game];
  return p.hold ? `ได้${p.name}! ถืออยู่ในมือตัวละครแล้ว` : `ได้${p.name}! เก็บไว้ในการ์ดที่ระลึกแล้ว`;
}

/** Hand over the prize once, when a round ends. */
export function usePrize(done: boolean, tier: number, game: GameId, onPrize: OnPrize) {
  useEffect(() => {
    const p = prizeFor(game, tier);
    if (done && p) onPrize(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
}
