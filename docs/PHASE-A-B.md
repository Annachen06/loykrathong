# Phase A + B report

## Phase A: inspection

- **Repository:** none was available to this session (no GitHub account linked, nothing in the
  project's shared files). So there was no existing code, assets or features to reuse or preserve.
  This project starts fresh on the Master Prompt's preferred stack: React + TypeScript + Vite,
  static hosting (Netlify config included). No backend, no game engine, 2 runtime dependencies.
- **Smallest useful milestone:** one illustrated scene, one character, five places from the
  Master Prompt's list, each with a real (if small) behaviour.

## Phase B: what was built

- Full-screen illustrated night beach: moon (with the rabbit of Thai folklore), sea with moonlight
  path, distant islands, temple on the headland with a lit stairway, coconut palms with string
  lights, festival gate, three flower stalls, the krathong boutique, a pier with a sala, and the
  Memory Corner.
- Living details: twinkling stars, shooting stars, fireworks with reflections, sky lanterns,
  krathongs drifting out to sea, gentle waves and foam, swaying palms, flickering lanterns,
  fireflies, glowing jellyfish, festival-goers (some strolling).
- Visitor character: tap/click the sand to walk there; tap a place to walk there and open its card.
  Stays on the sand and pier, routes onto the pier properly, jogs on long trips, the last tap wins.
  Arrow keys / WASD also work.
- Five places: Festival Entrance, Flower & Decoration Stall, Krathong Boutique, Moonlit Shore,
  Memory Corner. Markers are small glowing lights; names show on hover, focus, selection, when
  you're nearby, and briefly after entering. A compact dock gives a reliable way to reach every
  place without tapping the illustration.
- Two tappable creatures: a sleepy shell that opens to show a pearl, and a starfish that hops.
- Phones: portrait screens get a closer framing of the lower scene (not a shrunken desktop),
  the camera follows the visitor and looks up when they walk onto the pier, cards drop into the
  sky so the visitor stays visible, safe areas respected, 40px+ touch targets.
- Reduced-motion preference turns off fireworks, shooting stars and palm sway.

## Honest status of each place

| Place | What it does now | Waiting on |
| --- | --- | --- |
| Festival Entrance | Welcome card; button walks you to the Moonlit Shore | — |
| Flower & Decoration Stall | Card; "Breathe in the jasmine" releases petals | Decoration choices (Phase C) |
| Krathong Boutique | Card says it's being set up; no buttons | Boutique + catalog (Phase C/D) |
| Moonlit Shore | Float a simple leaf krathong; it drifts out to sea | Selection, customisation, private wish, souvenir (Phase C) |
| Memory Corner | Shows how many krathongs you floated this visit (real, in-memory only) | Souvenir cards (Phase C) |

## Not done yet (by design or not reached)

- Sound and music (and their controls) — not built; no sound control is shown.
- Krathong boutique, customisation, wishes, souvenir export — Phase C.
- Product data, free/premium labels, purchase intent — Phase D. No prices or checkout anywhere.
- Nothing is saved (no localStorage yet) and nothing is sent anywhere.
- Tested only in headless Chromium at 1440×900, 1280×720 and an emulated 390×844 phone.
  Not yet tried on a real iPhone/Android or in Safari/Firefox.
