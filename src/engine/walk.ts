// Where the visitor may walk. The ground is a few rectangles (the beach, a pier)
// joined at "junctions". This is deliberately simple: no grid pathfinding.
import type { Point, Rect, WorldLayout } from "../festivals/types";
import { clamp, dist } from "./math";

const inside = (r: Rect, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

export function areaAt(layout: WorldLayout, x: number, y: number): string | null {
  for (const a of layout.walkAreas) if (inside(a.rect, x, y)) return a.id;
  return null;
}

export const isWalkable = (layout: WorldLayout, x: number, y: number) => areaAt(layout, x, y) !== null;

/** Snap any point (a tap on the sea, the sky...) to the nearest walkable spot. */
export function nearestWalkable(layout: WorldLayout, p: Point): Point {
  if (isWalkable(layout, p.x, p.y)) return { ...p };
  let best: Point = p;
  let bestD = Infinity;
  for (const a of layout.walkAreas) {
    const q = { x: clamp(p.x, a.rect.x0, a.rect.x1), y: clamp(p.y, a.rect.y0, a.rect.y1) };
    const d = dist(p.x, p.y, q.x, q.y);
    if (d < bestD) { bestD = d; best = q; }
  }
  return best;
}

/** Which walk area a point belongs to, preferring a non-first area where they overlap (e.g. the pier). */
function homeArea(layout: WorldLayout, p: Point): string | null {
  let found: string | null = null;
  for (const a of layout.walkAreas) if (inside(a.rect, p.x, p.y)) found = a.id;
  return found;
}

/** Waypoints from `from` to `to`: straight if they share an area, otherwise via the junction. */
export function planPath(layout: WorldLayout, from: Point, to: Point): Point[] {
  const a = homeArea(layout, from);
  // On a narrow pier, a tap on the water towards you means "take me back", not "stay on the planks":
  // aim for the sand straight below instead of snapping to the nearest plank.
  let aim = to;
  const here = layout.walkAreas.find((w) => w.id === a);
  // ...and so does a tap on the open space around the foot of the pier: keep walking until off the planks
  if (here && a !== layout.walkAreas[0].id && !isWalkable(layout, to.x, to.y) && (to.y > from.y + 12 || to.y > here.rect.y1 - 110)) {
    const ground = layout.walkAreas[0].rect;
    aim = { x: clamp(to.x, ground.x0, ground.x1), y: Math.max(to.y, ground.y0) };
  }
  const target = nearestWalkable(layout, aim);
  const b = homeArea(layout, target);
  if (a && b && a !== b) {
    const j = layout.junctions.find((j) => (j.a === a && j.b === b) || (j.a === b && j.b === a));
    if (j) return [j.via, target];
  }
  return [target];
}
