// The contract between the reusable world engine and one festival edition.
// A future edition (e.g. Christmas by the Sea) supplies its own config + scene
// and reuses everything in src/engine and src/components.

export type Point = { x: number; y: number };

/** Something a person can carry in their hand. */
export type HeldThing =
  | "balloon" | "krathong" | "cottonCandy" | "cane" | "shavedIce" | "siamsi"
  | "garland" | "lotus" | "plushStar" | "plushRabbit" | "plushJelly" | "lantern";

/** An item the visitor picks up at the fair (free, nothing is sold). */
export type FairItem = {
  id: string;
  name: string;
  /** One line about it, shown on the stall's card. */
  text: string;
  /** How it looks in the character's hand. Leave out for things kept in the bag (sweets, a keyring). */
  hold?: HeldThing;
  color?: string;
  color2?: string;
  /** Worn instead of carried (a flower behind the ear). */
  wear?: "flower";
  /** Can be offered at the temple. */
  offering?: boolean;
  /** A special edition (gold krathong, heart lantern...). Free while the fair is in its trial run. */
  premium?: boolean;
  /** Which shape to draw when there is more than one (lanterns: "heart", "gold", "lanna"). */
  style?: string;
};
export type Rect = { x0: number; y0: number; x1: number; y1: number };

/** One place the visitor can walk to and interact with. */
export type Place = {
  id: string;
  /** Full name shown on the marker and the card, e.g. "ชิงช้าสวรรค์". */
  name: string;
  /** Short name for the map. */
  shortName: string;
  /** Which section of the map lists it (see FestivalConfig.mapGroups), and a small picture (an emoji) for its tile. */
  group?: string;
  icon?: string;
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
  /** A richer card body for this place (see App.tsx for which component each one opens). */
  panel?: "float" | "games" | "memory" | "temple" | "krathongShop" | "flowers" | "food" | "lantern";
  /** For stalls: what you can pick up here. */
  items?: FairItem[];
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
export type Curio = {
  id: string;
  label: string;
  at: Point;
  radius: number;
  /** What you find the first time you tap it (it's added to your beach treasures). */
  found: string;
};

export type WalkArea = { id: string; rect: Rect };

export type WorldLayout = {
  width: number;
  height: number;
  /** World y the camera tries to keep in view on very wide screens. */
  focusY: number;
  /** On wide screens, show this much of the world's height, so the fair feels close rather than far away. */
  viewHeight: number;
  /** On portrait phones, show only this much of the world's height (the bottom part),
   *  so the ground and characters stay a comfortable size instead of shrinking. */
  portraitHeight: number;
  /** Colour of the night above the top of the world, seen when the camera pulls far out (the Ferris wheel view). */
  skyTop?: string;
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
  /** Shirt, blouse or dress colour. */
  top: string;
  /** Trousers, shorts or skirt colour. */
  bottom: string;
  /** Pattern, hem band and hair-tie colour. */
  accent: string;
  outline: string;
  /** Body build. Visitors always use "neutral": clothes and hair are chosen freely, with no gender attached. Crowd extras may use the others. */
  figure: "man" | "woman" | "neutral";
  /** Any outfit goes with any body: nothing is "for" one gender. */
  outfit: "shirt-pants" | "shirt-shorts" | "shirt-skirt" | "blouse-pants" | "blouse-shorts" | "blouse-skirt" | "pha-sin" | "dress";
  /** Who the visitor is tonight: decides which fortune slips they get. */
  stage?: "student" | "worker" | "other";
  hairStyle: "short" | "crop" | "bald" | "long" | "ponytail" | "bob" | "bun";
  age?: "adult" | "kid" | "elder";
  sleeves?: "short" | "long" | "none";
  collar?: boolean;
  pattern?: "floral" | "stripes" | "plaid";
  shoes?: string;
  /** A plumeria tucked behind the ear. */
  flower?: boolean;
  glasses?: boolean;
  /** Small height variation, about 0.94 to 1.06. */
  height?: number;
};

export type FestivalConfig = {
  id: string;
  brand: string;
  tagline: string;
  edition: string;
  intro: { eyebrow: string; enterLabel: string; pickLabel: string; help: string };
  /** Words used by the shared interface, so every edition can be fully localised. */
  ui: {
    walkTo: string; // prefix for screen-reader labels: "เดินไป"
    close: string;
    mapLabel: string;
    placesLabel: string;
    wishTitle: string;
    sampleTag: string;
    yourWishTag: string;
  };
  /** An optional "buy me a coffee" corner in the Memory Corner. The fair takes no payments itself: it only links to the owner's own page or shows their QR. Hidden while neither is set. */
  support?: { title: string; text: string; url?: string; linkLabel?: string; qr?: string };
  /** Sections of the map, in order, e.g. "ทำบุญ", "เดินเล่น", "ลอยกระทง". Each place says which one it belongs to. */
  /** The maker's story, told in a sheet that opens from a small button (kept word for word as the owner wrote it). */
  story?: { title: string; subtitle: string; paragraphs: string[] };
  /** The shared sea: krathongs floated by other visitors show up for everyone, with no names. Off until filled in. */
  shared?: { projectId: string; apiKey: string; collection?: string; pollMs?: number; minGapMs?: number; blocked?: string[]; databaseUrl?: string };
  /** Inviting a friend: the words that go with the link when it is shared. */
  invite?: { label: string; title: string; text: string; copied: string; failed: string };
  mapGroups: { id: string; label: string; icon: string }[];
  /** The "where first?" question shown on arrival. `go` is the place to walk to; leave it out to just start strolling. */
  startChoices: { id: string; icon: string; label: string; text: string; go?: string; hint: string }[];
  /** Clearly-labelled example wishes shown on other krathongs until there is a real shared wall. */
  sampleWishes: string[];
  /** Fortune slips for the temple's siamsi sticks. */
  fortunes: { student: string[]; worker: string[]; other: string[] };
  /** Krathong designs to choose from at the krathong shop. */
  krathongs: FairItem[];
  welcomeHint: string;
  places: Place[];
  curios: Curio[];
  layout: WorldLayout;
  /** Characters the player can be. The first is the default. */
  visitors: { id: string; label: string; look: VisitorLook }[];
  /** CSS custom properties applied to the page for this edition. */
  theme: Record<string, string>;
};

/** What part of the world is on screen, in world units. */
export type CameraView = { x: number; y: number; w: number; h: number };

/** What a tap on the world revealed (a wish on a krathong, a creature's reaction...). */
export type TapResult = {
  bubble?: { title: string; text: string; tag?: string };
  /** A beach treasure was found. */
  /** Something picked up off the sand. `again` when it was already in your collection. */
  found?: { id: string; label: string; text: string; again?: boolean };
};

/** Something drawn in depth order with the visitor (other festival-goers, creatures on the sand). */
export type Actor = { y: number; draw: (ctx: CanvasRenderingContext2D, t: number) => void };

/** The festival's painter and animator. The engine calls these every frame in this order. */
export type Scene = {
  /** Static scenery behind the animated sea (sky, distant islands, cliffs). Painted once per resize. */
  paintBack(ctx: CanvasRenderingContext2D): void;
  /** Static scenery in front of the sea (sand, stalls, pier). Painted once per resize. */
  paintFront(ctx: CanvasRenderingContext2D): void;
  update(dt: number, visitor: Point): void;
  /** Optional: take over the camera (centre and zoom), e.g. while riding the Ferris wheel. null = follow the visitor.
   *  `wide` lets it look past the world's edges; `cover` means something else fills the screen, so the world needn't be drawn. */
  camera?(): { x: number; y: number; zoom: number; wide?: boolean; cover?: boolean } | null;
  /** Animated layer between back and front (stars, moon, water, things floating on it). */
  drawMiddle(ctx: CanvasRenderingContext2D, t: number, cam: CameraView): void;
  /** Animated layer over the front scenery but behind people (lights, palms, foam). */
  drawGround(ctx: CanvasRenderingContext2D, t: number, highlight: string | null): void;
  actors: Actor[];
  /** Optional: while on, the scene leaves out tap hints and cues (used when a still picture of it is painted). */
  setStill?(on: boolean): void;
  /** Optional: krathongs floated by other visitors (only their look). `fresh` ones arrive at the shore; the rest are already out on the water. */
  addShared?(items: { style: string; color: string; wish?: string }[], fresh: boolean): void;
  /** Drawn over everyone (sky lanterns, sparkles). */
  drawTop(ctx: CanvasRenderingContext2D, t: number): void;
  /** Runs a place's action. Returns false if the action is unknown. */
  runAction(
    placeId: string, actionId: string, visitor: Point & { look: VisitorLook },
    input?: { wish?: string; style?: string; flower?: string; color2?: string; hold?: HeldThing },
  ): boolean;
  /** A tap on the world that isn't a place: krathongs on the water, creatures... null if nothing there. */
  tap(p: Point): TapResult | null;
  /** True while the visitor is away doing something (e.g. riding the Ferris wheel): hide them and ignore walking. */
  visitorAway(): boolean;
  /** Things that just happened and could make a sound (fireworks...). The app empties this list every frame. */
  events?: { name: string; x: number; y: number }[];
  /** Internal state for automated browser tests only. */
  debug?(): Record<string, unknown>;
  /** Real, local-only numbers for this visit (nothing is invented or sent anywhere). */
  stats(): Record<string, number>;
};
