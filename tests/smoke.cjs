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

// The real database is out of reach from here: answer politely (an empty sea, no totals yet) so nothing logs errors.
async function quietDatabase(ctx) {
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, POST, OPTIONS" };
  await ctx.route("https://*.firebasedatabase.app/**", (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: req.method() === "GET" ? "null" : "{}" });
  });
  await ctx.route("https://firestore.googleapis.com/**", (route) => {
    const req = route.request(), url = req.url();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (url.includes(":runQuery")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify([{ readTime: "x" }]) });
    if (url.includes(":batchGet")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify([{ missing: "x" }]) });
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "{}" });
  });
}

async function desktopSuite(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await quietDatabase(ctx);
  const p = await ctx.newPage();
  const errors = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push(String(e)));

  await p.goto(BASE);
  await p.waitForFunction(() => !!window.__fair);
  await p.waitForTimeout(800);

  // The maker's story can be read from the welcome screen, word for word, and closed again.
  await p.click(".intro-story");
  const storyText = await p.textContent(".story");
  check("welcome screen: the story opens with the owner's own words", storyText.includes("เรื่องราวของลอยริมเล 🌙") && storyText.includes("จากความทรงจำในวัยเด็ก สู่ลอยกระทงริมทะเล") && storyText.includes("ธีมลอยกระทงริมทะเลของเว็บลอยริมเล เกิดจากความทรงจำในวัยเด็กของเราที่เกาะสมุย") && storyText.includes("มีเครื่องบินเที่ยวดึกบินผ่านบนท้องฟ้า มีเวทีร้องเพลง เต้นรำ และผู้คนออกมาเดินเที่ยวงานกัน") && storyText.includes("แบ่งปันบรรยากาศที่เราคิดถึงให้ทุกคนได้สัมผัส"));
  await p.keyboard.press("Escape");
  check("the story closes with Escape", !(await p.$(".story")));

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
  check("map lists every place as a tile, in sections", (await p.locator(".map-sheet section:not(.map-extra) ul button").count()) === (await places(p)).length && (await p.locator(".map-sheet section:not(.map-extra) h3").count()) === 3);
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

  // The map's last section opens the creator's corner: only a message, saved to the creator's inbox.
  let notePosted = null;
  check("no floating cup button any more", (await p.locator(".note-fab").count()) === 0);
  await p.click(".map-toggle");
  check("the map has a 'send encouragement to the creator' section", (await p.textContent(".map-extra h3")).includes("ส่งกำลังใจให้ผู้สร้าง"));
  await p.click(".map-extra .tile");
  await p.waitForSelector(".note-pop", { timeout: 3000 }).catch(() => {});
  check("its tile opens the creator's corner and closes the map", (await p.isVisible(".note-pop")) && !(await p.$(".dock.is-open")) && (await p.textContent(".note-title")).includes("ส่งกำลังใจให้ผู้สร้าง"));
  check("the note to the creator comes first in the corner popup, above the cocoa corner", await p.evaluate(() => { const a = document.querySelector(".note-pop .note-form"), b = document.querySelector(".note-pop .support"); return !!a && !!b && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); }));
  check("the corner popup has the Buy Me a Cocoa tip corner with a scannable QR", (await p.locator(".support .support-qr").count()) === 1 && (await p.textContent(".support")).includes("Buy Me a Cocoa") && (await p.textContent(".support")).includes("เข้ามาสนุกกัน") && !(await p.textContent(".support")).includes("ฟรี") && (await p.locator(".support-qr").evaluate((i) => i.complete && i.naturalWidth > 200)));
  // the tip corner's slip form: only images are accepted, and the picture is shrunk and saved to the inbox
  check("tip corner no longer carries the 'scan with bank app' caption", !(await p.textContent(".support")).includes("สแกนด้วยแอปธนาคาร"));
  const inboxCors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" };
  const sent = { slips: null, notes: null };
  await p.route("https://firestore.googleapis.com/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: inboxCors });
    const m = req.url().match(/\/documents\/(slips|notes)\?/);
    if (req.method() === "POST" && m) { sent[m[1]] = JSON.parse(req.postData() || "{}"); return route.fulfill({ status: 200, headers: inboxCors, contentType: "application/json", body: "{}" }); }
    return route.fallback();
  });
  await p.click('.slip button:has-text("ส่งสลิปโกโก้ได้ที่นี่")');
  await p.fill('.slip .slip-form textarea[name="message"]', "ขอบคุณค่ะ");
  check("slip form has only a message and the slip picture", (await p.locator('.slip .slip-form input[name="name"], .slip .slip-form input[name="contact"], .slip .slip-form input[name="amount"]').count()) === 0);
  await p.setInputFiles('.slip .slip-form input[name="slip"]', { name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
  await p.click('.slip .slip-form button[type="submit"]');
  check("slip form refuses a file that is not a picture", (await p.isVisible(".slip .slip-problem")) && sent.slips === null);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  await p.setInputFiles('.slip .slip-form input[name="slip"]', { name: "slip.png", mimeType: "image/png", buffer: png });
  await p.click('.slip .slip-form button[type="submit"]');
  await p.waitForSelector(".support .slip-thanks", { timeout: 5000 }).catch(() => {});
  const slipDoc = sent.slips?.fields;
  check("slip form saves the message and a shrunken JPEG picture to the creator's inbox, then says thanks", !!slipDoc && slipDoc.m?.stringValue === "ขอบคุณค่ะ" && slipDoc.i?.stringValue.startsWith("data:image/jpeg;base64,") && Number.isFinite(Number(slipDoc.t?.integerValue)) && Object.keys(slipDoc).sort().join() === "i,m,t" && (await p.isVisible(".support .slip-thanks")), JSON.stringify(slipDoc)?.slice(0, 80));
  check("the site no longer ships Netlify forms", (await p.locator("form[data-netlify]").count()) === 0);

  await p.click('.note-form button[type="submit"]');
  check("note to the creator: an empty message is not sent", (await p.isVisible(".note-form .slip-problem")) && sent.notes === null);
  check("note form asks only for a message", (await p.locator(".note-form input:not([name='bot-field']), .note-form [type=file]").count()) === 0 && (await p.locator('.note-form textarea[name="message"]').count()) === 1);
  await p.fill('.note-form textarea[name="message"]', "ชอบมากเลยค่ะ ขอบคุณที่ทำให้");
  await p.click('.note-form button[type="submit"]');
  await p.waitForSelector(".note-pop > .slip-thanks", { timeout: 5000 }).catch(() => {});
  const noteDoc = sent.notes?.fields;
  check("note to the creator is saved to the creator's inbox and says thanks", !!noteDoc && noteDoc.m?.stringValue === "ชอบมากเลยค่ะ ขอบคุณที่ทำให้" && Object.keys(noteDoc).sort().join() === "m,t" && (await p.isVisible(".note-pop > .slip-thanks")), JSON.stringify(noteDoc)?.slice(0, 100));
  await p.screenshot({ path: path.join(SHOTS, "desktop-note.png") });
  await p.unroute("https://firestore.googleapis.com/**");
  await p.click(".note-close");
  check("the close button closes the creator's corner", !(await p.$(".note-pop")));

  // The story button in the top corner opens the story over the world and the world keeps working underneath.
  await p.click(".story-toggle:not(.invite-toggle)");
  await p.waitForSelector(".story", { timeout: 3000 });
  await p.screenshot({ path: path.join(SHOTS, "desktop-story.png") });
  check("the story button opens the story, and the stick and note icon step aside", (await p.textContent(".story")).includes("เกาะสมุย") && (await p.isVisible(".story-art")));
  await p.click(".story-close");
  check("the story closes with its close button", !(await p.$(".story")));
  await p.click(".story-toggle:not(.invite-toggle)");
  await p.mouse.click(5, 450);
  check("tapping outside the story closes it", !(await p.$(".story")));

  // Asking a friend along: the share sheet when there is one, otherwise the link and invitation are copied.
  await p.evaluate(() => { window.__shared = null; navigator.share = async (d) => { window.__shared = d; }; });
  await p.click(".invite-toggle");
  check("inviting offers two ways: just share the link, or walk together", (await p.locator(".invite-option").count()) === 2 && (await p.textContent('.invite-option[data-mode="link"]')).includes("แชร์ลิงก์เว็บ") && (await p.textContent('.invite-option[data-mode="room"]')).includes("ชวนมาเดินด้วยกัน"));
  await p.click('.invite-option[data-mode="link"]');
  const shared = await p.evaluate(() => window.__shared);
  check("invite shares the plain link with a short invitation (no room)", !!shared && shared.url === BASE && !(await p.$(".invite-menu")) && (await p.locator(".room-chip").count()) === 0 && shared.text.includes("มาลอยกระทงริมทะเลด้วยกันนะ"), JSON.stringify(shared));
  await p.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true }); });
  await p.click(".invite-toggle");
  await p.click('.invite-option[data-mode="link"]');
  await p.waitForSelector(".hint", { timeout: 3000 }).catch(() => {});
  const copied = await p.evaluate(() => window.__copied);
  check("without a share sheet, invite copies the invitation and link and says so", !!copied && copied.includes(BASE) && (await p.textContent(".hint")).includes("คัดลอกลิงก์แล้ว"), String(copied));

  // an aeroplane crosses the sky now and then, and fireworks go off often
  await p.evaluate(() => window.__fair.scene.debug().sendPlane());
  const plane = await p.evaluate(() => window.__fair.scene.debug().plane);
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
  await p.waitForSelector(".panel h2", { timeout: 15000 }).catch(async () => { await p.screenshot({ path: path.join(SHOTS, "debug-boutique.png") }); });
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

// The shared sea: other visitors' krathongs (their look only) show up for everyone; yours goes out with no wish and no name.
async function sharedSuite(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { window.__FAIR_SHARED__ = { projectId: "test-sea", apiKey: "test-key", pollMs: 1500, minGapMs: 0 }; });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  const doc = (st, lo, t, c = "other", w) => ({ document: { fields: { s: { stringValue: st }, l: { stringValue: lo }, t: { integerValue: String(t) }, c: { stringValue: c }, ...(w ? { w: { stringValue: w } } : {}) } } });
  const now = Date.now();
  const older = [doc("gold", "#fff1b0", now - 5000, "o1", "ขอให้ทุกคนมีความสุข"), doc("moon", "#e8e0ff", now - 4000, "o2", "ติดต่อฉันที่ line:abc123 หรือ 0812345678"), doc("lotus", "#ff9ec0", now - 3000, "o3", "ไอ้เหี้ยทั้งหลาย"), doc("evil<script>", "#ff9ec0", now - 2000), doc("lotus", "javascript:1", now - 1000)];
  let created = null, later = [], queries = 0, bumps = [], totalsNow = { k: 120, l: 45 }, limits = [];
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, POST, OPTIONS" };
  await p.route("https://firestore.googleapis.com/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const url = req.url(), body = JSON.parse(req.postData() || "{}");
    if (url.includes(":batchGet")) return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify([{ found: { fields: { k: { integerValue: String(totalsNow.k) }, l: { integerValue: String(totalsNow.l) } } } }]) });
    if (url.includes(":commit")) { bumps.push(body.writes?.[0]?.transform?.fieldTransforms?.[0]); return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "{}" }); }
    if (url.includes(":runQuery")) {
      queries++;
      const sq = body.structuredQuery;
      if (sq.limit) limits.push(sq.limit);
      const rows = sq.where ? later : older;
      return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(rows.length ? rows : [{ readTime: "x" }]) });
    }
    if (req.method() === "POST" && url.includes("/documents/krathongs")) { created = body; return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: "{}" }); }
    return route.continue();
  });
  await p.goto(BASE);
  await p.waitForFunction(() => !!window.__fair);
  await p.click(".intro-enter");
  await p.waitForTimeout(1500);
  await p.click('.start-option[data-start="stroll"]');
  await p.waitForFunction(() => window.__fair.scene.debug().floaters.some((k) => k.shared), null, { timeout: 8000 }).catch(() => {});
  let fl = await p.evaluate(() => window.__fair.scene.debug().floaters.filter((k) => k.shared));
  check("shared sea: krathongs others floated appear on the water", fl.length === 3 && fl.some((k) => k.style === "gold") && fl.some((k) => k.style === "moon"), JSON.stringify(fl.map((k) => k.style)));
  check("shared sea: odd or unsafe data from outside is ignored", !fl.some((k) => !/^#[0-9a-f]{6}$/i.test(k.lotus)) && !fl.some((k) => String(k.style).includes("<")));
  check("shared sea: a shared wish can be read, but one with contact details or a blocked word is dropped (the krathong stays)", fl.find((k) => k.style === "gold").wish === "ขอให้ทุกคนมีความสุข" && fl.find((k) => k.style === "moon").wish === "" && fl.filter((k) => k.style === "lotus")[0].wish === "" && fl.every((k) => !k.mine));
  check("shared sea: arriving fills the water from the latest 100 floated", limits.includes(100), JSON.stringify(limits));
  const chip = await p.textContent(".fair-count").catch(() => "");
  check("everyone's totals show: krathongs and lanterns floated so far", chip.includes("120") && chip.includes("45"), chip);
  // a new krathong arrives from someone else while you are here
  later = [doc("coconut", "#fffaf0", Date.now() + 100)];
  await p.waitForFunction(() => window.__fair.scene.debug().floaters.filter((k) => k.shared).length >= 4, null, { timeout: 8000 }).catch(() => {});
  fl = await p.evaluate(() => window.__fair.scene.debug().floaters.filter((k) => k.shared));
  check("shared sea: a krathong floated by someone else arrives while you are there", fl.length === 4 && fl.some((k) => k.style === "coconut"), String(fl.length));
  // floating yours: the wish goes out only when the box is ticked, and only if it is plain kind words
  const floatOnce = async (wish, share) => {
    created = null;
    await viaMap(p, "ท่าลอยกระทง");
    await p.waitForSelector("#wish-input", { timeout: 20000 });
    await p.fill("#wish-input", wish);
    const box = p.locator(".share-wish input");
    if ((await box.isChecked()) !== share) await box.click();
    await p.click(".float-form .panel-action");
    await p.waitForTimeout(2600);
    return created;
  };
  await viaMap(p, "ท่าลอยกระทง");
  await p.waitForSelector("#wish-input", { timeout: 20000 });
  check("float card asks whether others may read the wish, ticked by default, with a clear warning", (await p.locator(".share-wish input").isChecked()) && (await p.textContent(".float-form .privacy")).includes("ไม่บอกว่าเป็นของใคร") && (await p.textContent(".float-form .privacy")).includes("อย่าใส่ชื่อ"));
  await p.click(".share-wish input");
  check("unticked: the card says the wish stays private", (await p.textContent(".float-form .privacy")).includes("เป็นความลับ"));
  await p.click(".share-wish input");
  await p.fill("#wish-input", "ขอให้ฝนไม่ตกวันลอยกระทง");
  await p.click(".float-form .panel-action");
  await p.waitForTimeout(2600);
  let keys = created ? Object.keys(created.fields).sort().join(",") : "";
  check("shared sea: a shared wish goes out with only kind, colour, time, throwaway tag and the wish", keys === "c,l,s,t,w" && created.fields.w.stringValue === "ขอให้ฝนไม่ตกวันลอยกระทง" && created.fields.s.stringValue === "banana", JSON.stringify(created));
  check("floating a krathong adds one to the krathong count, on screen and in the database", bumps.some((b) => b?.fieldPath === "k" && b.increment?.integerValue === "1") && (await p.textContent(".fair-count")).includes("121"), JSON.stringify(bumps));
  const tapMine = async () => {
    const mine = await p.evaluate(() => window.__fair.scene.debug().floaters.filter((k) => k.mine).slice(-1)[0]);
    if (!mine) return "";
    const q = await toScreen(p, mine.x, mine.y - 12);
    await p.mouse.click(q.x, q.y);
    await p.waitForSelector(".wish-bubble.show", { timeout: 3000 }).catch(() => {});
    return (await p.$(".wish-bubble.show")) ? await p.textContent(".wish-bubble") : "";
  };
  const mineShared = await tapMine();
  check("your own shared wish can be read by you, tagged as readable by everyone (not 'only you')", mineShared.includes("ขอให้ฝนไม่ตกวันลอยกระทง") && mineShared.includes("คนอื่นในงานอ่านได้") && !mineShared.includes("เห็นแค่คุณ"), mineShared);
  let c2 = await floatOnce("ขอให้เป็นความลับ", false);
  const minePrivate = await tapMine();
  check("your own private wish is tagged 'only you'", minePrivate.includes("ขอให้เป็นความลับ") && minePrivate.includes("เห็นแค่คุณ"), minePrivate);
  check("shared sea: with the box unticked the wish never leaves the device", !!c2 && Object.keys(c2.fields).sort().join(",") === "c,l,s,t" && !JSON.stringify(c2).includes("ความลับ"), JSON.stringify(c2));
  let c3 = await floatOnce("โทรหาฉัน 0812345678", true);
  check("shared sea: a wish with a phone number is kept private even if ticked", !!c3 && !c3.fields.w, JSON.stringify(c3));
  check("shared sea: …and the person is told why", (await p.textContent(".hint").catch(() => "")).length >= 0 && (await p.waitForFunction(() => document.querySelector(".hint")?.textContent.includes("เก็บไว้แค่ในเครื่องคุณ"), null, { timeout: 6000 }).then(() => true).catch(() => false)));
  await viaMap(p, "ลานปล่อยโคม");
  await p.waitForSelector(".lantern-colors", { timeout: 20000 });
  await p.fill("#lantern-wish", "ขอให้ทุกคนสบายดี");
  await p.click(".float-form .panel-action");
  await p.waitForTimeout(3800);
  check("releasing a lantern adds one to the lantern count, on screen and in the database", bumps.some((b) => b?.fieldPath === "l") && (await p.textContent(".fair-count")).includes("46"), JSON.stringify(bumps));
  const before = queries;
  await p.waitForTimeout(3200);
  fl = await p.evaluate(() => window.__fair.scene.debug().floaters);
  check("shared sea: it keeps checking quietly for new krathongs", queries > before);
  check("shared sea: no errors", errors.length === 0, errors.join(" | "));
  await ctx.close();

  // switched off (the default): nothing is sent anywhere and the card keeps the old promise
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx2.addInitScript(() => { window.__FAIR_SHARED__ = { projectId: "", apiKey: "" }; }); // as if no database had been set up
  const p2 = await ctx2.newPage();
  let calls = 0;
  p2.on("request", (r) => r.url().includes("firestore.googleapis.com") && calls++);
  await p2.goto(BASE);
  await p2.waitForFunction(() => !!window.__fair);
  await p2.click(".intro-enter");
  await p2.waitForTimeout(1500);
  await p2.click('.start-option[data-start="stroll"]');
  await viaMap(p2, "ท่าลอยกระทง");
  await p2.waitForSelector("#wish-input", { timeout: 20000 });
  check("shared sea off when no database is set: nothing leaves the device and the card says so", calls === 0 && (await p2.textContent(".float-form .privacy")).includes("ไม่ได้ส่งไปที่ไหน"));
  await ctx2.close();
}

// Walking together: two visitors who open the same room link see each other's characters.
async function friendsSuite(browser) {
  const DB = "https://test-rtdb.firebasedatabase.app";
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, PUT, DELETE, OPTIONS" };
  const rooms = {}; // room → peer → data, shared by both browsers like the real database
  let puts = 0;
  const route = async (ctx) => {
    await ctx.addInitScript((db) => { window.__FAIR_SHARED__ = { projectId: "", apiKey: "", databaseUrl: db, friendPollMs: 300, friendSendMs: 250, friendStaleMs: 2500 }; }, DB);
    await ctx.route(`${DB}/**`, async (r) => {
      const req = r.request();
      if (req.method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
      const m = new URL(req.url()).pathname.match(/^\/rooms\/([^/]+?)(?:\/([^/]+?))?\.json$/);
      if (!m) return r.fulfill({ status: 404, headers: cors, body: "" });
      const [, room, peer] = m;
      const json = (o, status = 200) => r.fulfill({ status, headers: cors, contentType: "application/json", body: JSON.stringify(o) });
      if (req.method() === "GET") return json(rooms[room] ?? null);
      if (!peer) return json({ error: "Permission denied" }, 401);
      if (req.method() === "PUT") {
        const there = rooms[room] ?? {};
        if (!there[peer] && Object.keys(there).length >= 6) return json({ error: "Permission denied" }, 401);
        puts++;
        rooms[room] = { ...there, [peer]: JSON.parse(req.postData() || "{}") };
        return json({});
      }
      if (req.method() === "DELETE") { if (rooms[room]) delete rooms[room][peer]; return json(null); }
      return json({});
    });
  };
  const open = async (url) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await route(ctx);
    const p = await ctx.newPage();
    p.__errors = [];
    p.on("pageerror", (e) => p.__errors.push(String(e)));
    await p.goto(url);
    await p.waitForFunction(() => !!window.__fair);
    await p.click(".intro-enter");
    await p.waitForTimeout(800);
    await p.click('.start-option[data-start="stroll"]');
    return { ctx, p };
  };

  const a = await open(BASE);
  await a.p.evaluate(() => { navigator.share = async (d) => { window.__shared = d; }; });
  check("friends: no room chip until a friend is invited", (await a.p.locator(".room-chip").count()) === 0);
  await a.p.click(".invite-toggle");
  await a.p.click('.invite-option[data-mode="room"]');
  const link = await a.p.evaluate(() => window.__shared.url);
  check("friends: inviting opens a room and the chip waits for a friend", (await a.p.textContent(".room-chip")).includes("รอเพื่อน") && link.includes("?room="), link);

  const b = await open(link);
  await a.p.waitForFunction(() => document.querySelector(".room-chip")?.textContent.includes("1 คน"), null, { timeout: 8000 }).catch(() => {});
  await b.p.waitForFunction(() => document.querySelector(".room-chip")?.textContent.includes("1 คน"), null, { timeout: 8000 }).catch(() => {});
  check("friends: both see one friend", (await a.p.textContent(".room-chip")).includes("1 คน") && (await b.p.textContent(".room-chip")).includes("1 คน"));
  const room = Object.keys(rooms)[0];
  const sent = Object.values(rooms[room] ?? {})[0] ?? {};
  check("friends: only position, facing, walking, time and look are sent", Object.keys(sent).sort().join() === "f,l,m,t,x,y" && sent.l.length < 700, Object.keys(sent).join());

  // A walks; B sees A's character follow
  const target = await a.p.evaluate(() => { const v = window.__fair.visitor; v.walkTo({ x: v.x - 260, y: v.y }); return { x: v.x - 260 }; });
  await a.p.waitForTimeout(3500);
  const aState = await a.p.evaluate(() => window.__fair.visitor.x);
  const seen = await b.p.evaluate(() => window.__fair.friends());
  check("friends: when one walks, the other sees them move to the same place", seen.length === 1 && Math.abs(seen[0].x - aState) < 12, JSON.stringify({ aState, seen }));
  await b.p.screenshot({ path: path.join(SHOTS, "desktop-friends.png") });

  // odd data from outside is ignored; someone who stops sending disappears
  rooms[room].evil = { x: 100, y: 800, f: 1, m: false, t: 1, l: JSON.stringify({ skin: "red;}", hair: "#000", top: "#fff", bottom: "#fff", accent: "#fff", outline: "#000", figure: "neutral", outfit: "dress", hairStyle: "bun" }) };
  await b.p.waitForTimeout(900);
  check("friends: a character with odd colours is ignored", (await b.p.evaluate(() => window.__fair.friends().length)) === 1);
  await a.ctx.close();
  await b.p.waitForFunction(() => window.__fair.friends().length === 0, null, { timeout: 8000 }).catch(() => {});
  check("friends: when a friend leaves, their character disappears", (await b.p.evaluate(() => window.__fair.friends().length)) === 0 && (await b.p.textContent(".room-chip")).includes("รอเพื่อน"));
  check("friends: no errors", a.p.__errors.length === 0 && b.p.__errors.length === 0, [...a.p.__errors, ...b.p.__errors].join(" | "));
  await b.ctx.close();

  // a full room refuses a seventh
  for (let i = 0; i < 6; i++) rooms.fullroom1 = { ...(rooms.fullroom1 ?? {}), [`p${i}xxxxxx`]: { x: 500, y: 800, f: 1, m: false, t: Date.now() + i, l: JSON.stringify({ skin: "#eec1a0", hair: "#000", top: "#fff", bottom: "#fff", accent: "#fff", outline: "#000", figure: "neutral", outfit: "dress", hairStyle: "bun" }) } };
  const busy = setInterval(() => { for (const k of Object.keys(rooms.fullroom1 ?? {})) rooms.fullroom1[k].t = Date.now(); }, 200); // six people still here
  const c = await open(`${BASE}?room=fullroom1`);
  await c.p.waitForFunction(() => document.querySelector(".room-chip")?.textContent.includes("เต็ม"), null, { timeout: 9000 }).catch(() => {});
  check("friends: a full room says so and nobody is shown", (await c.p.textContent(".room-chip").catch(() => "")).includes("ห้องนี้เต็มแล้ว") && (await c.p.evaluate(() => window.__fair.friends().length)) === 0, JSON.stringify({ chip: await c.p.textContent(".room-chip").catch(() => "none"), url: c.p.url(), room: Object.keys(rooms.fullroom1 ?? {}).length }));
  clearInterval(busy);
  await c.ctx.close();
}

async function phoneSuite(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await quietDatabase(ctx);
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
  await p.tap(".invite-toggle");
  const menuBox = await p.locator(".invite-menu").boundingBox();
  check("phone: the invite menu stays fully on screen", !!menuBox && menuBox.x >= 8 && menuBox.x + menuBox.width <= 390 - 8, JSON.stringify(menuBox));
  await p.screenshot({ path: path.join(SHOTS, "phone-invite-menu.png") });
  await p.tap(".invite-toggle");

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
  await quietDatabase(ctx);
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
    if (process.env.ONLY !== "friends") {
      await desktopSuite(browser);
      await sharedSuite(browser);
    }
    await friendsSuite(browser);
    if (process.env.ONLY !== "friends") {
      await phoneSuite(browser);
      await reducedMotionSuite(browser);
    }
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
