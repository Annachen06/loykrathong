# Feedback round 2

| Feedback | What changed |
| --- | --- |
| Drop the name MOONKRADE | The fair is now called **ลอยกระทงริมเล** (welcome screen, top-left label, page title, and the arch over the entrance). Change it in `festivals/loy-krathong/config.ts` → `brand`. |
| Men were wearing skirts | People are drawn by `engine/person.ts` from a look: `figure` (man/woman), `outfit` and `hairStyle`. Men wear a shirt with trousers or shorts; pha sin, skirts and dresses are only used for women and girls. |
| Every outfit was the same | `festivals/loy-krathong/crowd.ts` lists 28 different people: grown-ups, children and elders, with different skin tones, hair (short, crop, long, ponytail, bob, bun, grey, balding), sleeves, patterns (floral, stripes, plaid), glasses and things they carry (krathong, balloon, cotton candy, walking stick). |
| Characters should look more real | Proportions changed from a big-head chibi to about five heads tall, with a neck, shoulders, a waist, knees and visible legs. The face has small eyes, brows, a nose and a mouth. Children are shorter with relatively bigger heads; elders stoop slightly. |
| Too many tabs at the bottom | The row of nine place buttons is gone. One **แผนที่งาน** button opens a small list of places; tapping one walks you there and closes the list. The glowing lights in the scene still work as before. |
| (added) Play as a man or a woman | The welcome screen has two character cards. Tapping one enters the fair as that character. |
