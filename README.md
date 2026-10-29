# MOONKRADE

**A Little Festival by the Sea.** First edition: *Loy Krathong by the Moonlit Sea.*

An illustrated festival world that runs in the browser. You step onto a moonlit beach,
tap the sand to walk, and tap glowing places to visit them.

## Run it

```bash
npm install
npm run dev        # open the printed http://localhost:5173 link
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks, then builds the site into `dist/` (this is what Netlify deploys) |
| `npm run preview` | Serves the built `dist/` folder locally |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Opens the built site in a headless browser and checks movement, places, phone layout. Run `npm run build` first. Needs Playwright once: `npm i -D playwright && npx playwright install chromium` |

## How the code is organised

```
src/
  engine/                 reusable for every festival
    renderer.ts           full-screen canvas, camera, frame loop
    visitor.ts            the little character: tap-to-walk + drawing
    walk.ts               where you can walk (beach + pier rectangles)
    math.ts               small helpers
  components/             reusable interface overlays (React)
    PlaceMarkers.tsx      glowing lights on each place; names appear when useful
    PlaceDock.tsx         row of places at the bottom (always-available way to navigate)
    PlacePanel.tsx        the card that opens when you arrive
    Intro.tsx, Hint.tsx
  festivals/
    types.ts              the contract between the engine and a festival
    index.ts              which festival is live
    loy-krathong/         everything specific to this edition
      config.ts           places, text, colours, layout  ← edit words here
      world.ts            fixed positions (moon, pier, palms)
      scenery.ts          static artwork (sky, stalls, pier, gate…)
      scene.ts            everything that moves (sea, lanterns, krathongs, creatures)
  App.tsx                 wires it all together
```

**Why canvas for the world?** The scene has hundreds of small moving lights (stars, lanterns,
water sparkles, floating krathongs). Drawing them on one canvas keeps it smooth on phones.
Everything you *read or press* (place names, cards, buttons) is normal HTML, so it stays
accessible and easy to style.

**Adding a future festival** (e.g. Christmas by the Sea): copy `festivals/loy-krathong/`,
change its config and artwork, and point `festivals/index.ts` at it. The engine and
components don't change.

## Artwork

All artwork is drawn in code (`scenery.ts`, `scene.ts`, `engine/visitor.ts`), so it is original
and there are no third-party image licences to track yet. Fonts: Mitr and Fredoka from Google
Fonts (SIL Open Font License).
