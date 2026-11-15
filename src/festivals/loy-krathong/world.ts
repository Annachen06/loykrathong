// Fixed positions in the Loy Krathong scene, in world units (2600 × 1000).
// Left to right: the temple grounds, the fair (Ferris wheel, ram wong stage, game booths),
// the krathong shop, the pier under the moon, the sweet stalls and the Memory Corner.
// The flower cart stands by the temple gate.
import { loyKrathongConfig } from "./config";

export const W = loyKrathongConfig.layout.width;
export const H = loyKrathongConfig.layout.height;
export const HORIZON = 545;
export const SHORE = 778;
export const GROUND = 806; // where buildings and stalls stand
export const MOON = { x: 1900, y: 190, r: 80 };
export const PIER = loyKrathongConfig.layout.walkAreas.find((a) => a.id === "pier")!.rect;
export const OUTLINE = "#2a1d4a";

export const WHEEL = { x: 860, hubY: 586, r: 158, cabins: 10 };
export const STAGE = { x0: 1030, x1: 1260, floor: 748 };
export const TEMPLE = { chediX: 175, hallX: 410 };

/** Coconut palms: trunk base, height and lean. String lights hang between some of them. */
export const PALMS = [
  { x: 1010, base: 814, h: 250, lean: -20 },
  { x: 1612, base: 812, h: 270, lean: 26 },
  { x: 2010, base: 814, h: 250, lean: -28 },
  { x: 2262, base: 816, h: 270, lean: 24 },
  { x: 2572, base: 820, h: 260, lean: -36 },
];
export const LIGHT_STRINGS: [number, number, number][] = [[0, 1, 60], [2, 3, 50], [3, 4, 44]];
