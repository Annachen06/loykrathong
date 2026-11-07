// End-to-end checks in a real (headless) Chromium browser.
// Usage: npm run build && npm test
// Needs Playwright with Chromium available: `npm i -D playwright && npx playwright install chromium`.
const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("playwright");

const PORT = 4174;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS_DIR || path.join(__dirname, "..", "test-results");
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

async function startServer() {
  const proc = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    cwd: path.join(__dirname, ".."),
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(BASE);
      if (r.ok) return proc;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error("preview server did not start (did you run `npm run build`?)");
}

// helpers that run inside the page
const state = (p) => p.evaluate(() => window.__fair.state());
const places = (p) => p.evaluate(() => window.__fair.places);
const toScreen = (p, x, y) => p.evaluate(([x, y]) => window.__fair.renderer.toScreen(x, y), [x, y]);
async function waitStopped(p, timeout = 15000) {
  await p.waitForFunction(() => !window.__fair.state().moving, null, { timeout });
}
// The places list sits behind one "map" button: open it if needed, then pick the place.
async function viaMap(p, name, touch = false) {
  if (!(await p.$(".dock.is-open"))) await (touch ? p.tap(".map-toggle") : p.click(".map-toggle"));
  const sel = `.dock ul button[aria-label="เดินไป${name}"]`;
  await (touch ? p.tap(sel) : p.click(sel));
}
async function panelTitle(p) {
  const el = await p.$(".panel h2");
  return el ? el.textContent() : null;
}

async function desktopSuite(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push(String(e)));

  await p.goto(BASE);
  await p.waitForFunction(() => !!window.__fair);
  await p.waitForTimeout(800);

  // The canvas should be painted with many different colours (not blank).
  const colours = await p.evaluate(() => {
    const c = document.querySelector("canvas.world");
    const g = c.getContext("2d");
    const set = new Set();
    for (let i = 0; i < 400; i++) {
      const d = g.getImageData(Math.floor(Math.random() * c.width), Math.floor(Math.random() * c.height), 1, 1).data;
      set.add(`${d[0] >> 4},${d[1] >> 4},${d[2] >> 4}`);
    }
    return set.size;
  });
  check("world renders full-screen with real artwork", colours > 40, `${colours} distinct colour buckets`);

  // Animation is running: two snapshots of the canvas differ.
  const changed = await p.evaluate(async () => {
    const c = document.querySelector("canvas.world");
    const a = c.toDataURL();
    await new Promise((r) => setTimeout(r, 400));
    return a !== c.toDataURL();
  });
  check("environment is animated", changed);

  check("intro is shown first, where you make your own character", (await p.locator(".look-chip").count()) > 10 && await p.isVisible(".intro-enter"));
  // age, clothes and hair are separate choices (no man/woman button, no body-shape button)
  check("no body-shape or man/woman choice", (await p.locator('[aria-label="รูปร่าง"], [data-look="man"], [data-look="woman"]').count()) === 0);
  check("life stage choices: student, worker, other", (await p.locator('.look-chip[data-look="student"], .look-chip[data-look="worker"], .look-chip[data-look="other"]').count()) === 3);
  await p.click('.look-chip[data-look="student"]');
  await p.click('.look-chip[data-look="pha-sin"]');
  await p.click('.look-chip[data-look="bun"]');
  await p.click(".intro-enter");
  await p.waitForTimeout(1600);
  check("entering hides the intro", !(await p.isVisible(".intro-enter")));
  check("your choices dress the visitor", (await p.evaluate(() => { const l = window.__fair.visitor.look; return l.stage + "/" + l.outfit + "/" + l.hairStyle + "/" + l.figure; })) === "student/pha-sin/bun/neutral");
  check("sound starts when you enter the fair", (await state(p)).sound.running);
  check("arrival asks where to go first (three choices)", (await p.locator(".start-choice .start-option").count()) === 3 && (await p.isVisible(".start-choice")));
  await p.click('.start-option[data-start="stroll"]');
  check("choosing to stroll closes the question and shows the map", !(await p.$(".start-choice")) && (await p.isVisible(".map-toggle")));
  await p.click(".sound-toggle");
  check("the sound button mutes", (await state(p)).sound.muted && (await p.getAttribute(".sound-toggle", "aria-label")) === "เปิดเสียง");
  await p.click(".sound-toggle");
  check("…and unmutes", !(await state(p)).sound.muted);
  check("map button is large and alone (no extra shortcut buttons)", (await p.locator(".dock-row button:visible").count()) === 1 && (await p.locator(".map-toggle").boundingBox()).height >= 48);
  check("no on-screen stick on a desktop with a mouse", !(await p.isVisible(".joystick")));
  await p.click(".map-toggle");
  check("map lists every place as a tile, in sections", (await p.locator(".map-sheet ul button").count()) === (await places(p)).length && (await p.locator(".map-sheet h3").count()) === 3);
  // tap the sand just beside the visitor (the sky would send them out onto the pier)
  const beside = await p.evaluate(() => { const v = window.__fair.visitor; return window.__fair.renderer.toScreen(v.x - 80, v.y + 10); });
  await p.mouse.click(beside.x, beside.y);
  check("tapping elsewhere closes the map list", !(await p.$(".dock.is-open")));
  await waitStopped(p);
  await p.waitForTimeout(1200); // let the camera finish following

  // Tap the sand: the visitor walks there and stops.
  let s0 = await state(p);
  let target = { x: s0.x + 300, y: 900 };
  let sp = await toScreen(p, target.x, target.y);
  await p.mouse.click(sp.x, sp.y);
  await p.waitForTimeout(150);
  check("tapping sand starts walking", (await state(p)).moving);
  await waitStopped(p);
  let s1 = await state(p);
  check("visitor stops at the tapped spot", Math.abs(s1.x - target.x) < 3 && Math.abs(s1.y - target.y) < 3, `at ${s1.x},${s1.y}`);

  // Tap the open sea: the visitor stays on the sand.
  sp = await toScreen(p, s1.x + 100, 650);
  await p.mouse.click(sp.x, sp.y);
  await waitStopped(p);
  s1 = await state(p);
  check("tapping the sea keeps the visitor on the beach", s1.y >= 805, `y=${s1.y}`);

  // Rapid repeated taps: the last tap wins, no jitter. (Let the camera settle first so screen spots map to the same ground.)
  await p.waitForTimeout(1500);
  for (const dx of [-200, 150, -80, 60]) {
    const q = await toScreen(p, s1.x + dx, 880);
    await p.mouse.click(q.x, q.y);
    await p.waitForTimeout(40);
  }
  await waitStopped(p);
  const s2 = await state(p);
  check("repeated taps: the last tap decides", Math.abs(s2.x - (s1.x + 60)) < 3 && Math.abs(s2.y - 880) < 3, `at ${s2.x},${s2.y}`);

  // Every place via the dock: walk there, stop at the anchor, the right card opens.
  for (const pl of await places(p)) {
    await viaMap(p, pl.name);
    await p.waitForSelector(".panel h2", { timeout: 15000 });
    const st = await state(p);
    const title = await panelTitle(p);
    check(`map → ${pl.name}: arrives and opens its card`, title === pl.name && Math.abs(st.x - pl.anchor.x) < 2 && Math.abs(st.y - pl.anchor.y) < 2, `title="${title}" at ${st.x},${st.y}`);
    await p.screenshot({ path: path.join(SHOTS, `desktop-${pl.id}.png`) });
  }

  // Krathong shop: pick a design, it's in your hand, and the card offers to take you to the pier.
  await viaMap(p, "ร้านกระทง");
  await p.waitForSelector('.item-pick[data-item="lotus"]', { timeout: 15000 });
  check("krathong shop shows special editions, free during the trial", (await p.locator(".item-picker li.is-premium").count()) === 3 && (await p.textContent(".item-picker li.is-premium")).includes("ฟรีช่วงทดลอง"));
  check("no payment step anywhere in the shop", !(await p.textContent(".panel")).match(/บาท|ชำระ|ซื้อ/));
  await p.click('.item-pick[data-item="lotus"]');
  check("krathong shop: picking a krathong puts it in your hand", (await state(p)).hold === "krathong");
  await p.screenshot({ path: path.join(SHOTS, "desktop-krathong-shop.png") });

  // Walking out onto the pier never crosses the water.
  await p.click('.panel .panel-action:has-text("ไปลอย")');
  const samples = [];
  for (let i = 0; i < 80; i++) {
    samples.push(await state(p));
    if (!samples[samples.length - 1].moving && i > 3) break;
    await p.waitForTimeout(60);
  }
  const offGround = samples.filter((s) => s.y < 805 && (s.x < 1876 || s.x > 1924));
  check("route to the pier stays on sand and planks", offGround.length === 0, `${samples.length} samples, ${offGround.length} in the water`);
  await p.waitForSelector(".panel h2");

  // Float a krathong with a private wish at the shore.
  check("on the pier: the camera comes in close", (await p.evaluate(() => window.__fair.renderer.view.zoom)) > 1.3);
  check("float card knows which krathong you carry", (await p.textContent(".float-krathong")).includes("กระทงดอกบัว"));
  await p.fill("#wish-input", "ขอให้ทดสอบผ่านทุกข้อ");
  await p.click(".float-form .panel-action");
  await p.waitForTimeout(400);
  let st = await state(p);
  check("floating: the visitor kneels at the end of the pier", st.act === "float" && !(await p.$(".panel")));
  await p.waitForTimeout(1700);
  st = await state(p);
  check("floating: the krathong goes on the water and leaves your hand", st.stats.krathongsFloated === 1 && st.hold === null);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(SHOTS, "desktop-floating.png") });

  // Tap another krathong on the water to read its (sample) wish.
  const floaters = await p.evaluate(() => window.__fair.scene.debug().floaters);
  const cam = await p.evaluate(() => window.__fair.renderer.cam);
  const vis = await p.evaluate(() => window.__fair.renderer.view);
  const wishy = floaters.filter((k) => k.wish && !k.mine && k.x > cam.x + 40 && k.x < cam.x + vis.visW * 0.65 && k.y > Math.max(cam.y + 60, 600) && k.y < cam.y + vis.visH - 60);
  if (wishy.length) {
    const k = wishy[0];
    const q = await toScreen(p, k.x, k.y - 12);
    await p.mouse.click(q.x, q.y);
    await p.waitForSelector(".wish-bubble.show", { timeout: 3000 }).catch(() => {});
    const bubble = (await p.$(".wish-bubble.show")) ? await p.textContent(".wish-bubble") : "";
    check("tapping another krathong shows its wish, tagged as an example", bubble.includes("ตัวอย่าง") && bubble.length > 12, bubble);
    await p.screenshot({ path: path.join(SHOTS, "desktop-wish-bubble.png") });
  } else {
    check("tapping another krathong shows its wish, tagged as an example", false, "no sample krathong near the shore to tap");
  }

  // Sky lanterns: pick a colour, write a wish, hold it up and let it go.
  await viaMap(p, "ลานปล่อยโคม");
  await p.waitForSelector(".lantern-colors", { timeout: 20000 });
  check("lantern ground offers lantern colours", (await p.locator(".lantern-color").count()) >= 3);
  check("lantern ground has special lanterns too", (await p.locator(".lantern-color .premium-tag").count()) === 3);
  await p.click('[data-lantern="lantern-pink"]');
  check("lantern button names the chosen colour", (await p.textContent(".float-form .panel-action")).includes("โคมสีชมพู"));
  await p.fill("#lantern-wish", "ขอให้โคมลอยถึงพระจันทร์");
  await p.click(".float-form .panel-action");
  await p.waitForTimeout(800);
  st = await state(p);
  check("releasing: the visitor holds the lantern up", st.act === "lantern" && st.hold === "lantern" && !(await p.$(".panel")));
  await p.waitForTimeout(2600);
  st = await state(p);
  check("releasing: the lantern leaves your hands and rises", st.stats.lanternsReleased === 1 && st.hold === null);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(SHOTS, "desktop-lantern.png") });
  const myLantern = await p.evaluate(() => window.__fair.scene.debug().lanterns.find((l) => l.mine));
  if (myLantern) {
    const q = await toScreen(p, myLantern.x, myLantern.y);
    await p.mouse.click(q.x, q.y);
    await p.waitForSelector(".wish-bubble.show", { timeout: 3000 }).catch(() => {});
    const text = (await p.$(".wish-bubble.show")) ? await p.textContent(".wish-bubble") : "";
    check("tapping your lantern shows your wish", text.includes("ขอให้โคมลอยถึงพระจันทร์"), text);
  } else check("tapping your lantern shows your wish", false, "own lantern not found");

  // Memory Corner lists tonight's wish and makes a souvenir card picture.
  await viaMap(p, "มุมความทรงจำ");
  await p.waitForSelector(".memory-list", { timeout: 15000 });
  const mine = await p.textContent(".memory-list");
  check("Memory Corner lists the private wish from this visit", mine.includes("ขอให้ทดสอบผ่านทุกข้อ"), mine);
  check("Memory Corner lists the lantern wish too", mine.includes("ขอให้โคมลอยถึงพระจันทร์"), mine);
  // The souvenir card: a 9:16 picture of the real fair with you in it; the preview is the very file that downloads.
  await p.waitForSelector(".memory-card img", { timeout: 20000 });
  await p.waitForFunction(() => { const i = document.querySelector(".memory-card img"); return i && i.complete && i.naturalWidth > 0; });
  const cardSize = await p.evaluate(() => { const i = document.querySelector(".memory-card img"); return [i.naturalWidth, i.naturalHeight]; });
  check("souvenir card preview is 1080 x 1920", cardSize[0] === 1080 && cardSize[1] === 1920, cardSize.join("x"));
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click('.memory .panel-action:has-text("บันทึกการ์ดของฉัน")')]);
  const cardPath = path.join(SHOTS, "memory-card-download.png");
  await dl.saveAs(cardPath);
  const bytes = require("node:fs").readFileSync(cardPath);
  const previewBytes = await p.evaluate(async () => { const r = await fetch(document.querySelector(".memory-card img").src); return (await r.arrayBuffer()).byteLength; });
  check("saved card is a PNG of 1080 x 1920, byte-for-byte what the preview shows", dl.suggestedFilename().endsWith(".png") && bytes.readUInt32BE(16) === 1080 && bytes.readUInt32BE(20) === 1920 && bytes.length === previewBytes, `${dl.suggestedFilename()} ${bytes.length} vs ${previewBytes}`);
  await p.screenshot({ path: path.join(SHOTS, "desktop-memory.png") });

  // Escape closes the card.
  await p.keyboard.press("Escape");
  check("Escape closes the card", !(await p.$(".panel")));

  // A small icon in the bottom-right corner opens a note to the creator: only a message, sent to the Netlify form "creator-note".
  let notePosted = null;
  await p.waitForSelector(".note-fab", { state: "visible", timeout: 5000 });
  const fab = await p.locator(".note-fab").boundingBox();
  const vp = p.viewportSize();
  check("note icon sits small in the bottom-right corner", fab.width <= 48 && fab.x + fab.width > vp.width - 80 && fab.y + fab.height > vp.height - 100, JSON.stringify(fab));
  await p.click(".note-fab");
  check("the site ships the hidden note form for Netlify to find, and no slip form", (await p.locator('form[name="creator-note"][data-netlify="true"]').count()) === 1 && (await p.locator('form[name="support-slip"]').count()) === 0);
  check("no tip corner, QR or slip form is left anywhere", (await p.locator(".support, .support-qr, .slip, input[type=file]").count()) === 0 && !(await p.content()).includes("Buy Me a Cocoa"));
  await p.route("**/", async (route) => {
    const req = route.request();
    if (req.method() === "POST") { notePosted = req.postData() ?? ""; return route.fulfill({ status: 200, body: "ok" }); }
    return route.continue();
  });
  await p.click('.note-form button[type="submit"]');
  check("note to the creator: an empty message is not sent", (await p.isVisible(".note-form .slip-problem")) && notePosted === null);
  check("note form asks only for a message", (await p.locator(".note-form input:not([name='bot-field']), .note-form [type=file]").count()) === 0 && (await p.locator('.note-form textarea[name="message"]').count()) === 1);
  await p.fill('.note-form textarea[name="message"]', "ชอบมากเลยค่ะ ขอบคุณที่ทำให้");
  await p.click('.note-form button[type="submit"]');
  await p.waitForSelector(".note-pop > .slip-thanks", { timeout: 5000 }).catch(() => {});
  check("note to the creator is posted to the Netlify form and says thanks", !!notePosted && notePosted.includes("form-name=creator-note") && notePosted.includes("message=") && (await p.isVisible(".note-pop > .slip-thanks")), String(notePosted).slice(0, 100));
  await p.screenshot({ path: path.join(SHOTS, "desktop-note.png") });
  await p.unroute("**/");
  await p.click(".note-fab");
  check("the note icon closes the note again", !(await p.$(".note-pop")));

  // an aeroplane crosses the sky now and then, and fireworks go off often
  const plane = await p.waitForFunction(() => window.__fair.scene.debug().plane, null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => null);
  check("an aeroplane flies across the sky", !!plane && plane.y < 500, JSON.stringify(plane));
  const sparkPeak = await p.evaluate(async () => {
    let peak = 0;
    for (let i = 0; i < 70; i++) { peak = Math.max(peak, window.__fair.scene.debug().sparks); await new Promise((r) => setTimeout(r, 100)); }
    return peak;
  });
  check("fireworks burst over the sea within a few seconds", sparkPeak >= 60, String(sparkPeak));

  // Clicking the stall artwork itself (not the marker) visits it.
  const boutique = (await places(p)).find((x) => x.id === "boutique");
  await p.waitForTimeout(300);
  sp = await toScreen(p, (boutique.hitArea.x0 + boutique.hitArea.x1) / 2, boutique.hitArea.y1 - 30);
  await p.mouse.click(sp.x, sp.y);
  await p.waitForSelector(".panel h2", { timeout: 15000 });
  check("clicking the boutique artwork walks there and opens it", (await panelTitle(p)) === "ร้านกระทง");

  // Clicking the glowing marker visits too.
  await p.click(".panel-close");
  // stroll over to the temple gate until the flower cart is on screen, then click its glowing marker
  await p.evaluate(() => window.__fair.visitor.walkTo({ x: 700, y: 900 }));
  await waitStopped(p);
  await p.waitForTimeout(1200);
  await p.click('.marker[aria-label="เดินไปร้านดอกไม้"]');
  await p.waitForSelector(".panel h2", { timeout: 15000 });
  check("clicking a glowing marker walks there", (await panelTitle(p)) === "ร้านดอกไม้");
  await p.click('.item-pick[data-item="garland"]');
  check("flower stall: the garland is in your hand", (await state(p)).hold === "garland");

  // Temple: kneel, light incense, offer the garland, bow; then shake the fortune sticks.
  await viaMap(p, "วัดริมทะเล");
  await p.waitForSelector('[data-act="pray"]', { timeout: 20000 });
  check("temple: the card offers to give the garland", (await p.textContent('[data-act="pray"]')).includes("พวงมาลัย"));
  await p.click('[data-act="pray"]');
  await p.waitForTimeout(1500);
  st = await state(p);
  check("temple: the visitor kneels and prays, and the garland is offered", st.act === "pray" && st.hold === null);
  await p.screenshot({ path: path.join(SHOTS, "desktop-pray.png") });
  // count the bows (krap): the body tips forward and comes back up, three times
  const bows = await p.evaluate(async () => {
    const v = window.__fair.visitor;
    let n = 0, down = false;
    while (v.act) {
      const b = v.pose.bow;
      if (!down && b > 0.6) { down = true; n++; } else if (down && b < 0.25) down = false;
      await new Promise((r) => setTimeout(r, 30));
    }
    return n;
  });
  check("temple: prayer includes exactly three bows", bows === 3, `${bows} bows`);
  await p.waitForFunction(() => window.__fair.state().act === null, null, { timeout: 12000 });
  await viaMap(p, "วัดริมทะเล");
  await p.waitForSelector('[data-act="fortune"]', { timeout: 20000 });
  await p.click('[data-act="fortune"]');
  await p.waitForSelector(".wish-bubble.show", { timeout: 8000 });
  check("temple: shaking the siamsi gives a fortune slip", (await p.textContent(".wish-bubble")).includes("ใบที่"));
  await p.screenshot({ path: path.join(SHOTS, "desktop-fortune.png") });

  // Shaved ice: pick one, it's in your hand.
  await viaMap(p, "ร้านน้ำแข็งไส");
  await p.waitForSelector('.item-pick[data-item="ice-red"]', { timeout: 20000 });
  await p.click('.item-pick[data-item="ice-red"]');
  check("shaved ice stall: the cup is in your hand", (await state(p)).hold === "shavedIce");

  // Balloon darts: three throws, then a result.
  await viaMap(p, "ซุ้มเกม");
  await p.waitForSelector(".dart-board", { timeout: 15000 });
  for (let i = 0; i < 3; i++) {
    await p.locator(".balloon:not(.popped)").first().click({ force: true });
    await p.waitForTimeout(120);
  }
  const darts = await p.textContent(".game-status");
  check("balloon darts: throw 3 darts and get a result", darts.includes("แตก") && darts.includes("เล่นอีกครั้ง"), darts);
  if (darts.includes("แตก 3")) check("balloon darts: the big prize is carried by your character", (await state(p)).hold === "plushStar");
  await p.screenshot({ path: path.join(SHOTS, "desktop-darts.png") });

  // Ring toss: three throws, then a result.
  await p.click('.tabs button:has-text("โยนห่วง")');
  for (let i = 0; i < 3; i++) { await p.click(".toss"); await p.waitForTimeout(200); }
  const rings = await p.textContent(".game-status");
  check("ring toss: throw 3 rings and get a result", rings.includes("คล้องได้") && rings.includes("เล่นอีกครั้ง"), rings);
  await p.click(".panel-close");

  // Ram wong: the visitor goes up on stage and dances in the ring.
  await viaMap(p, "เวทีรำวง");
  await p.waitForSelector(".panel-action", { timeout: 15000 });
  await p.click(".panel-action");
  await p.waitForTimeout(2500);
  check("ram wong: the visitor joins the dancers on stage", (await state(p)).stats.dancing === 1);
  await p.screenshot({ path: path.join(SHOTS, "desktop-dance.png") });
  await p.waitForFunction(() => window.__fair.state().stats.dancing === 0, null, { timeout: 20000 });

  // Ferris wheel: ride a full turn, hidden from the ground, then back down.
  await viaMap(p, "ชิงช้าสวรรค์");
  await p.waitForSelector(".panel-action", { timeout: 15000 });
  await p.click(".panel-action");
  await p.waitForTimeout(4000);
  check("Ferris wheel: the visitor is riding, seen from inside the cabin", (await state(p)).stats.riding === 1 && (await p.isVisible(".ride-view.on")));
  await p.screenshot({ path: path.join(SHOTS, "desktop-ride.png") });
  await p.waitForFunction(() => window.__fair.state().stats.riding === 0, null, { timeout: 30000 });
  check("Ferris wheel: the ride ends after one turn", true);

  // Tapping a curio reacts without walking away.
  const before = await state(p);
  const shell = await p.evaluate(() => window.__fair.curios.find((c) => c.id === "shell"));
  await p.keyboard.press("Escape");
  // walk close so it is on screen
  await p.evaluate(([x]) => window.__fair.visitor.walkTo({ x, y: 960 }), [shell.at.x - 80]);
  await waitStopped(p);
  sp = await toScreen(p, shell.at.x, shell.at.y - 12);
  await p.mouse.click(sp.x, sp.y);
  await p.waitForTimeout(500);
  const after = await state(p);
  check("tapping the shell reacts and doesn't move the visitor", after.stats.curioTaps === before.stats.curioTaps + 1 && !after.moving);
  check("the shell holds a pearl: a beach treasure is found", after.stats.treasures === 1 && (await p.textContent(".wish-bubble")).includes("ไข่มุก"));
  await p.screenshot({ path: path.join(SHOTS, "desktop-shell.png") });

  // Keyboard walking.
  const k0 = await state(p);
  await p.keyboard.down("ArrowLeft");
  await p.waitForTimeout(500);
  await p.keyboard.up("ArrowLeft");
  const k1 = await state(p);
  check("arrow keys walk the visitor", k1.x < k0.x - 50, `${k0.x} → ${k1.x}`);

  // Frame rate (headless software rendering, so only a rough indication).
  const fps = await p.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : res(Math.round(n / 2)); };
    requestAnimationFrame(f);
  }));
  check("frame rate measured (headless, rough)", fps > 0, `${fps} fps`);

  check("no console errors on desktop", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

async function phoneSuite(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto(BASE);
  await p.waitForFunction(() => !!window.__fair);
  await p.tap(".intro-enter");
  await p.tap('.start-option[data-start="stroll"]');
  await p.waitForTimeout(1600);
  await p.screenshot({ path: path.join(SHOTS, "phone-start.png") });

  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check("phone: no horizontal page overflow", !overflow);

  const v = await p.evaluate(() => window.__fair.state().view);
  check("phone: scene is recomposed, not shrunk", v.visW < 400 && v.scale > 1, `shows ${Math.round(v.visW)}×${Math.round(v.visH)} world units at ${v.scale.toFixed(2)}×`);

  const s0 = await state(p);
  const sp = await toScreen(p, s0.x - 120, 905);
  await p.touchscreen.tap(sp.x, sp.y);
  await waitStopped(p);
  const s1 = await state(p);
  check("phone: tap the sand to walk", Math.abs(s1.x - (s0.x - 120)) < 3, `${s0.x} → ${s1.x}`);

  // the on-screen stick: drag right to walk right, let go to stop
  check("phone: an on-screen stick is shown", await p.isVisible(".joystick"));
  const jb = await p.locator(".joystick").boundingBox();
  const jc = { x: jb.x + jb.width / 2, y: jb.y + jb.height / 2 };
  const fire = (type, x, y) => p.evaluate(([type, x, y]) => {
    const t = type === "pointerdown" ? document.querySelector(".joystick") : window;
    t.dispatchEvent(new PointerEvent(type, { pointerId: 7, clientX: x, clientY: y, bubbles: true, pointerType: "touch" }));
  }, [type, x, y]);
  const j0 = await state(p);
  await fire("pointerdown", jc.x, jc.y);
  await fire("pointermove", jc.x + 50, jc.y);
  await p.waitForTimeout(700);
  const j1 = await state(p);
  check("phone: dragging the stick right walks the visitor right", j1.x > j0.x + 40 && j1.moving, `${j0.x} → ${j1.x}`);
  await fire("pointerup", jc.x + 50, jc.y);
  await p.waitForTimeout(200);
  const j2 = await state(p);
  await p.waitForTimeout(300);
  check("phone: letting go of the stick stops the visitor", !j2.moving && (await state(p)).x === j2.x);

  for (const pl of await places(p)) {
    await viaMap(p, pl.name, true);
    await p.waitForSelector(".panel h2", { timeout: 20000 });
    const st = await state(p);
    const onScreen = await toScreen(p, st.x, st.y);
    const panelBox = await p.locator(".panel").boundingBox();
    const visible = onScreen.x > 0 && onScreen.x < 390 && onScreen.y < 844 && onScreen.y > panelBox.y + panelBox.height;
    check(`phone: map → ${pl.name} opens its card with the visitor still visible`, (await panelTitle(p)) === pl.name && visible, `visitor at screen ${Math.round(onScreen.x)},${Math.round(onScreen.y)}; card ends at ${Math.round(panelBox.y + panelBox.height)}`);
    await p.screenshot({ path: path.join(SHOTS, `phone-${pl.id}.png`) });
  }

  const small = await p.evaluate(() =>
    [...document.querySelectorAll(".dock button, .panel-close, .panel-action")]
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height < 40).length);
  check("phone: touch targets are at least 40px tall", small === 0, `${small} too small`);

  // phone: play darts by tapping balloons
  await viaMap(p, "ซุ้มเกม", true);
  await p.waitForSelector(".dart-board", { timeout: 20000 });
  for (let i = 0; i < 3; i++) { await p.locator(".balloon:not(.popped)").first().tap({ force: true }); await p.waitForTimeout(120); }
  check("phone: balloon darts playable by tapping", (await p.textContent(".game-status")).includes("เล่นอีกครั้ง"));
  await p.screenshot({ path: path.join(SHOTS, "phone-darts.png") });
  check("no console errors on phone", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

async function reducedMotionSuite(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(BASE);
  await p.waitForFunction(() => !!window.__fair);
  await p.click(".intro-enter");
  // "go to the temple first" walks there and opens its card
  await p.click('.start-option[data-start="merit"]');
  await p.waitForSelector(".panel h2", { timeout: 20000 });
  check("start choice: going to the temple first opens the temple", (await panelTitle(p)) === "วัดริมทะเล");
  await viaMap(p, "ร้านกระทง");
  await p.waitForSelector(".panel h2", { timeout: 15000 });
  check("reduced motion: world still works", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

(async () => {
  require("node:fs").mkdirSync(SHOTS, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    await desktopSuite(browser);
    await phoneSuite(browser);
    await reducedMotionSuite(browser);
  } catch (e) {
    check("test run finished without crashing", false, String(e));
  } finally {
    await browser.close();
    server.kill();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in ${SHOTS}`);
  process.exit(failed.length ? 1 : 0);
})();
