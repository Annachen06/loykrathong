# ลอยกระทงริมเล

**งานวัดเล็กๆ ริมทะเล** An online Loy Krathong temple fair by the sea. (The working name was MOONKRADE; the fair's name lives in `config.ts` as `brand` and also appears on the entrance arch.)

An illustrated Thai temple fair on a moonlit beach that runs in the browser, in Thai.
Tap the sand to walk, tap glowing lights to visit places, ride the Ferris wheel, join the
ram wong, play the fair games, read wishes on the krathongs and float your own.

## Run it

```bash
npm install
npm run dev        # open the printed http://localhost:5173 link
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-checks, then builds the site into `dist/` (this is what gets uploaded to the host) |
| `npm run preview` | Serves the built `dist/` folder locally |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Opens the built site in a headless browser and checks movement, places, phone layout. Run `npm run build` first. Needs Playwright once: `npm i -D playwright && npx playwright install chromium` |

## How the code is organised

```
src/
  engine/                 reusable for every festival
    renderer.ts           full-screen canvas, camera, frame loop
    visitor.ts            the player character: tap-to-walk movement
    person.ts             draws every person (outfit, hair, age, what they carry)
    walk.ts               where you can walk (beach + pier rectangles)
    math.ts               small helpers
  components/             reusable interface overlays (React)
    PlaceMarkers.tsx      glowing lights on each place; names appear when useful
    MapMenu.tsx           one "แผนที่งาน" button that opens the list of places
    PlacePanel.tsx        the card that opens when you arrive
    FloatForm.tsx         write a private wish and float your krathong
    WishBubble.tsx        the note that opens when you tap a krathong on the water
    WishBoard.tsx         Memory Corner: your wishes + example wishes
    FairGames.tsx         balloon darts and ring toss
    Intro.tsx             welcome screen; pick your character (ผู้หญิง / ผู้ชาย)
    Hint.tsx
  festivals/
    types.ts              the contract between the engine and a festival
    index.ts              which festival is live
    loy-krathong/         everything specific to this edition
      config.ts           places, text, colours, layout  ← edit words here
      world.ts            fixed positions (moon, pier, palms)
      scenery.ts          static artwork (sky, stalls, pier, gate…)
      crowd.ts            what each person at the fair wears  ← add or change outfits here
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
