// The festival edition that is currently live. To launch a new edition later,
// add a folder next to loy-krathong/ with its own config + scene and switch it here.
import type { FestivalConfig, Scene } from "./types";
import { loyKrathongConfig } from "./loy-krathong/config";
import { createLoyKrathongScene } from "./loy-krathong/scene";

export type Festival = { config: FestivalConfig; createScene: () => Scene };

export const activeFestival: Festival = {
  config: loyKrathongConfig,
  createScene: createLoyKrathongScene,
};
