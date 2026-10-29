// The contract between the reusable world engine and one festival edition.
// A future edition (e.g. Christmas by the Sea) supplies its own config + scene
// and reuses everything in src/engine and src/components.

export type Point = { x: number; y: number };
export type Rect = { x0: number; y0: number; x1: number; y1: number };

/** One place the visitor can walk to and interact with. */
export type Place = {
  id: string;
  nameTh: string;
  nameEn: string;
  /** Where the small glowing marker sits in the world. */
  marker: Point;
  /** Where the visitor character walks to and stops. */
  anchor: Point;
  /** Tapping inside this area of the illustration also selects the place. */
  hitArea: Rect;
  /** Short text shown in the place's panel. */
  description: string;
  /** Optional honest note, e.g. that something opens in a later update. */
  note?: string;
  /** Optional live number from Scene.stats() shown in the panel, e.g. krathongs floated this visit. */
  stat?: { key: string; label: string };
  /** Optional action button. The scene performs it (see Scene.runAction). */
  action?: {
    id: string;
    label: string;
    doneHint: string;
    /** If set, the button walks the visitor to this place instead of asking the scene. */
    goTo?: string;
  };
};

/** A small decorative object with its own tap reaction (a shell, a starfish...). */
export type Curio = { id: string; label: string; at: Point; radius: number };

export type WalkArea = { id: string; rect: Rect };

export type WorldLayout = {
  width: number;
  height: number;
  /** World y the camera tries to keep in view on very wide screens. */
  focusY: number;
  /** On portrait phones, show only this much of the world's height (the bottom part),
   *  so the ground and characters stay a comfortable size instead of shrinking. */
  portraitHeight: number;
  walkAreas: WalkArea[];
  /** Where to step when moving between two walk areas. */
  junctions: { a: string; b: string; via: Point }[];
  spawn: Point;
  /** Perspective: visitor scale at the back (yBack) and front (yFront) of the walkable ground. */
  depth: { yBack: number; yFront: number; scaleBack: number; scaleFront: number };
};

export type VisitorLook = {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  accent: string;
  outline: string;
  /** Hair bun with a jasmine flower (default true). */
  bun?: boolean;
};

export type FestivalConfig = {
  id: string;
  brand: string;
  tagline: string;
  edition: string;
  intro: { eyebrow: string; enterLabel: string; help: string };
  welcomeHint: string;
  places: Place[];
  curios: Curio[];
  layout: WorldLayout;
  visitor: VisitorLook;
  /** CSS custom properties applied to the page for this edition. */
  theme: Record<string, string>;
};

/** What part of the world is on screen, in world units. */
export type CameraView = { x: number; y: number; w: number; h: number };

/** Something drawn in depth order with the visitor (other festival-goers, creatures on the sand). */
export type Actor = { y: number; draw: (ctx: CanvasRenderingContext2D, t: number) => void };

/** The festival's painter and animator. The engine calls these every frame in this order. */
export type Scene = {
  /** Static scenery behind the animated sea (sky, distant islands, cliffs). Painted once per resize. */
  paintBack(ctx: CanvasRenderingContext2D): void;
  /** Static scenery in front of the sea (sand, stalls, pier). Painted once per resize. */
  paintFront(ctx: CanvasRenderingContext2D): void;
  update(dt: number): void;
  /** Animated layer between back and front (stars, moon, water, things floating on it). */
  drawMiddle(ctx: CanvasRenderingContext2D, t: number, cam: CameraView): void;
  /** Animated layer over the front scenery but behind people (lights, palms, foam). */
  drawGround(ctx: CanvasRenderingContext2D, t: number, highlight: string | null): void;
  actors: Actor[];
  /** Drawn over everyone (sky lanterns, sparkles). */
  drawTop(ctx: CanvasRenderingContext2D, t: number): void;
  /** Runs a place's action. Returns false if the action is unknown. */
  runAction(placeId: string, actionId: string, visitor: Point): boolean;
  /** Tap reaction for a curio. */
  pokeCurio(id: string): void;
  /** Real, local-only numbers for this visit (nothing is invented or sent anywhere). */
  stats(): Record<string, number>;
};
