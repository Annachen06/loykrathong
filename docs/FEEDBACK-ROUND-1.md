# Feedback round 1: Thai temple fair

What Anna asked for, and what changed.

| Feedback | Change |
| --- | --- |
| Too much English; it's for Thai players | All text is Thai (places, cards, buttons, hints, screen-reader labels). Only the MOONKRADE brand stays in Latin letters. Words live in `festivals/loy-krathong/config.ts` (`ui`, `places`, `sampleWishes`). |
| The chedi looked like it spilled out of the mountain | The temple now stands on flat, paved temple grounds: a bell-shaped chedi on its stepped base (ฐานเขียง, ฐานบัว, องค์ระฆัง, บัลลังก์, ปล้องไฉน, ปลียอด), an ordination hall with a tiered red roof and chofa, temple flags and a low whitewashed wall (กำแพงแก้ว). The hills are now a backdrop that slopes down to the beach. |
| Felt like a market, not a งานวัด | Ferris wheel with chasing lights, a ram wong stage with dancers, tinsel, speakers and spotlights, balloon-dart and ring-toss booths, loudspeaker horns, flag bunting, cotton-candy and shaved-ice stalls, many more people (kids with balloons, strollers, an audience). |
| Wants things to do | Ride the Ferris wheel (one full turn, you're in a cabin), join the ram wong (your character dances), play balloon darts and ring toss (3 throws, a fun prize message; nothing is stored or charged), make merit at the temple. |
| Wants to see other people's krathongs and wishes | The sea is full of krathongs. Those with a small note on them can be tapped to read the wish. These are clearly tagged **ตัวอย่าง** (example) because there's no shared online wall yet. Your own wish is private: it stays in the page on this device and is never sent anywhere. |
| Screen felt too wide/empty | Wide screens now show ~78% of the world's height, so everything is closer and bigger. Phones show a closer crop still. |

Checked with `npm test`: 50/50 browser checks pass (desktop 1440×900, emulated 390×844 phone, reduced motion).
Not checked: real iPhone/Android devices, Safari, Firefox. Still no sound.
