// Fixed positions in the Loy Krathong scene, in world units (2400 × 1000).
import { loyKrathongConfig } from "./config";

export const W = loyKrathongConfig.layout.width;
export const H = loyKrathongConfig.layout.height;
export const HORIZON = 545;
export const SHORE = 778;
export const MOON = { x: 1640, y: 190, r: 80 };
export const PIER = loyKrathongConfig.layout.walkAreas.find((a) => a.id === "pier")!.rect;
export const OUTLINE = "#2a1d4a";

/** Coconut palms: trunk base, height and lean. String lights hang between some of them. */
export const PALMS = [
  { x: 590, base: 814, h: 250, lean: 40 },
  { x: 1105, base: 808, h: 230, lean: -26 },
  { x: 1480, base: 812, h: 270, lean: 30 },
  { x: 1880, base: 814, h: 240, lean: -30 },
  { x: 2370, base: 820, h: 280, lean: -44 },
];
export const LIGHT_STRINGS: [number, number, number][] = [[0, 1, 40], [1, 2, 46], [3, 4, 52]];
