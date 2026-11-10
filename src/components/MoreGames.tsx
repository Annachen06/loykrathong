import { useRef, useState } from "react";
import { GameStatus, type GameProps } from "./FairGames";
import { usePrize } from "./gamePrizes";
import { boardPoint, burst, centreOf, fly, hitAt, shout, tumble, wobble, type Pt } from "./throwKit";

// The shooting gallery, the can pyramid and the lucky eggs. Same stall, same prizes (gamePrizes.ts).

// ------------------------------------------------------------------------------------------------ shooting gallery
const GUNS = [
  { id: "long", label: "ปืนยาว", shots: 6, ms: 110, sway: 3, reach: 0.62, ammo: "pellet" },
  { id: "short", label: "ปืนสั้น", shots: 8, ms: 150, sway: 9, reach: 0.62, ammo: "pellet" },
  { id: "cork", label: "จุกน้ำปลา", shots: 5, ms: 240, sway: 5, reach: 0.9, ammo: "cork" },
  { id: "air", label: "อัดลม", shots: 7, ms: 90, sway: 6, reach: 0.56, ammo: "pellet" },
] as const;
type Gun = (typeof GUNS)[number];
const ROWS = [
  { id: "a", items: ["🦆", "🎯", "🦆", "🎯", "🦆", "🎯"], dur: 9 },
  { id: "b", items: ["🧸", "🥫", "🐰", "🥫", "🐻", "🥫"], dur: 12 },
];
const tierShoot = (hit: number, shots: number) => { const r = hit / shots; return r >= 0.8 ? 3 : r >= 0.5 ? 2 : r >= 0.2 ? 1 : 0; };

/** Shooting gallery: ducks, targets, dolls and cans glide past on two rails. Pick a gun, tap to shoot; a hit flips the target down. */
export function ShootingGallery({ onPrize, sfx }: GameProps) {
  const [gun, setGun] = useState<Gun>(GUNS[0]);
  const [shots, setShots] = useState<number>(GUNS[0].shots);
  const [down, setDown] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [flying, setFlying] = useState(false);
  const board = useRef<HTMLDivElement>(null);
  const sight = useRef<HTMLSpanElement>(null);
  const done = shots === 0 && !flying;
  const started = shots < gun.shots;
  usePrize(done, tierShoot(down.length, gun.shots), "shoot", onPrize);

  const aimAt = (p: Pt) => { if (sight.current) sight.current.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`; };

  const shoot = async (to: Pt) => {
    const b = board.current;
    if (!b || shots === 0 || flying) return;
    aimAt(to);
    setFlying(true);
    setShots((s) => s - 1);
    b.classList.remove("kick"); void b.offsetWidth; b.classList.add("kick"); // the muzzle flash at the bottom of the board
    const land = wobble(to, gun.sway);
    await fly(b, { x: b.clientWidth / 2, y: b.clientHeight + 10 }, land, { ms: gun.ms, arc: 6, className: gun.ammo, startScale: 1.6, endScale: 0.6 });
    const hit = hitAt(b, "[data-target]", land, gun.reach);
    if (hit) {
      const key = hit.dataset.target!;
      setDown((d) => (d.includes(key) ? d : [...d, key]));
      burst(b, land, ["#ffd84a", "#fff4e2", "#ef7a5a"], 10);
      shout(b, land, "ปัง!");
      sfx?.("pop");
    } else {
      burst(b, land, ["#c9b6a0", "#8a7a6a"], 5);
    }
    setFlying(false);
  };

  const again = (g: Gun = gun) => { setGun(g); setShots(g.shots); setDown([]); setRound((r) => r + 1); };

  return (
    <div className="game">
      <div className="gun-pick" role="radiogroup" aria-label="เลือกปืน">
        {GUNS.map((g) => (
          <button key={g.id} type="button" role="radio" aria-checked={gun.id === g.id} className={gun.id === g.id ? "on" : ""} disabled={started && !done} onClick={() => again(g)}>
            {g.label} <small>{g.shots} นัด</small>
          </button>
        ))}
      </div>
      <div
        ref={board}
        className="gallery"
        onPointerMove={(e) => e.pointerType === "mouse" && aimAt(boardPoint(e.currentTarget, e))}
        onPointerDown={(e) => shoot(boardPoint(e.currentTarget, e))}
        role="group"
        aria-label="ซุ้มยิงปืน"
      >
        {ROWS.map((row, r) => (
          <div key={`${round}-${row.id}`} className={`rail rail-${row.id}`} style={{ animationDuration: `${row.dur}s` }}>
            {[0, 1].map((copy) => row.items.map((it, i) => {
              const key = `${row.id}-${i}`;
              return (
                <button
                  key={`${copy}-${i}`}
                  type="button"
                  data-target={key}
                  className={`target ${down.includes(key) ? "down" : ""}`}
                  tabIndex={copy ? -1 : 0}
                  aria-hidden={copy ? true : undefined}
                  aria-label={`เป้าแถว ${r + 1} ตัวที่ ${i + 1}`}
                  onClick={(e) => { if (e.detail === 0 && board.current) shoot(centreOf(board.current, e.currentTarget)); }}
                >{it}</button>
              );
            }))}
          </div>
        ))}
        <span ref={sight} className="sight" aria-hidden="true" />
      </div>
      <GameStatus done={done} tier={tierShoot(down.length, gun.shots)} game="shoot" summary={`ยิงโดน ${down.length} จาก ${gun.shots} นัด`} onAgain={() => again()}>
        <span>{gun.label} · กระสุนเหลือ {shots} · โดนแล้ว {down.length}</span>
      </GameStatus>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ the can pyramid
// three on the bottom, two in the middle, one on top; a can falls when anything under it falls
const CANS = [
  { x: 0.35, row: 0, on: [] as number[] }, { x: 0.5, row: 0, on: [] }, { x: 0.65, row: 0, on: [] },
  { x: 0.425, row: 1, on: [0, 1] }, { x: 0.575, row: 1, on: [1, 2] },
  { x: 0.5, row: 2, on: [3, 4] },
];
const CAN_COLOURS = ["#ef5a5a", "#ffd84a", "#5aa0ef", "#ff8fc0", "#4fc08a", "#c9b6ff"];
const BALLS = 3;
const tierCans = (n: number) => (n >= 6 ? 3 : n >= 4 ? 2 : n >= 1 ? 1 : 0);

/** Can pyramid: tap where to throw; the ball sails over and knocks down what it hits, and whatever stood on those cans comes down too. */
export function KnockCans({ onPrize, sfx }: GameProps) {
  const [balls, setBalls] = useState(BALLS);
  const [down, setDown] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [flying, setFlying] = useState(false);
  const board = useRef<HTMLDivElement>(null);
  const cans = useRef<(HTMLSpanElement | null)[]>([]);
  const done = (balls === 0 || down.length === CANS.length) && !flying;
  usePrize(done, tierCans(down.length), "cans", onPrize);

  const throwAt = async (to: Pt) => {
    const b = board.current;
    if (!b || balls === 0 || flying || down.length === CANS.length) return;
    setFlying(true);
    setBalls((n) => n - 1);
    const land = wobble(to, 9);
    await fly(b, { x: b.clientWidth / 2, y: b.clientHeight + 30 }, land, { ms: 430, arc: 60, className: "ball", startScale: 1.8, endScale: 0.75, spin: 540 });
    const fallen = new Set(down);
    const floor = b.clientHeight;
    const knock = (i: number, push: number) => {
      const el = cans.current[i];
      if (!el || fallen.has(i)) return;
      fallen.add(i);
      const r = el.getBoundingClientRect(), br = b.getBoundingClientRect();
      tumble(el, push, floor - (r.bottom - br.top) + 6);
    };
    // the ball knocks whatever it touches, pushing it away from where it landed
    let direct = 0;
    CANS.forEach((_, i) => {
      const el = cans.current[i];
      if (!el || fallen.has(i)) return;
      const c = centreOf(b, el), w = el.offsetWidth;
      if (Math.abs(c.x - land.x) < w * 0.95 && Math.abs(c.y - land.y) < w * 1.2) { knock(i, (c.x >= land.x ? 1 : -1) * (40 + Math.random() * 30)); direct++; }
    });
    if (direct) {
      sfx?.("pop");
      burst(b, land, ["#fff4e2", "#ffd84a"], 8);
      shout(b, land, direct > 1 ? `ล้ม ${direct}!` : "โป๊ก!");
      // then the pyramid settles: anything standing on a fallen can comes down, level by level
      for (let level = 1; level <= 2; level++) {
        await new Promise((r) => window.setTimeout(r, 140));
        CANS.forEach((c, i) => { if (c.row === level && c.on.some((j) => fallen.has(j))) knock(i, (Math.random() * 2 - 1) * 50); });
      }
    } else {
      shout(b, land, "เฉียด!");
    }
    setDown([...fallen]);
    if (fallen.size === CANS.length) shout(b, { x: b.clientWidth / 2, y: b.clientHeight * 0.4 }, "พังหมดเลย!");
    setFlying(false);
  };

  const again = () => { setBalls(BALLS); setDown([]); setRound((r) => r + 1); };
  const aimMiddle = () => {
    const b = board.current;
    const standing = CANS.map((_, i) => i).filter((i) => !down.includes(i));
    if (!b || !standing.length) return;
    const el = cans.current[standing[0]];
    if (el) throwAt(centreOf(b, el));
  };

  return (
    <div className="game">
      <p className="game-help">แตะกระป๋องเพื่อปาบอล มี {BALLS} ลูก ล้มหมดได้รางวัลใหญ่</p>
      <div ref={board} className="can-table" onPointerDown={(e) => throwAt(boardPoint(e.currentTarget, e))} role="group" aria-label="กองกระป๋อง">
        {CANS.map((c, i) => (
          <span
            key={`${round}-${i}`}
            ref={(el) => { cans.current[i] = el; }}
            className={`can ${down.includes(i) ? "down" : ""}`}
            style={{ left: `${c.x * 100}%`, bottom: `calc(var(--shelf) + ${c.row} * var(--can-h))`, background: CAN_COLOURS[i % CAN_COLOURS.length] }}
          />
        ))}
        <span className="can-shelf" aria-hidden="true" />
      </div>
      <GameStatus done={done} tier={tierCans(down.length)} game="cans" summary={`ล้ม ${down.length} จาก ${CANS.length} กระป๋อง`} onAgain={again}>
        <>
          <span>ลูกบอลเหลือ {balls} · ล้มแล้ว {down.length}</span>
          <button type="button" className="panel-action toss" onClick={aimMiddle} disabled={flying}>ปา!</button>
        </>
      </GameStatus>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ lucky eggs
const EGG_COLOURS = ["#ff8fc0", "#ffd84a", "#5aa0ef", "#4fc08a", "#c9b6ff", "#ef7a5a"];
// a pile of eggs in the jar: four across, three deep, each a little off so it looks heaped
const EGGS = Array.from({ length: 12 }, (_, i) => ({ x: 16 + (i % 4) * 22 + ((i * 7) % 9) - 4, y: 44 + Math.floor(i / 4) * 19 + ((i * 5) % 7) - 3, c: EGG_COLOURS[(i * 5) % EGG_COLOURS.length], r: ((i * 53) % 50) - 25 }));
const PRIZE_ICON = ["", "🍬", "🗝️", "🎁"];
const STARS = ["", "★ รางวัลเล็ก", "★★ รางวัลกลาง", "★★★ รางวัลใหญ่"];
/** Every egg holds something: mostly small treats, sometimes a keyring, now and then the big prize. */
const drawTier = () => { const r = Math.random(); return r < 0.15 ? 3 : r < 0.5 ? 2 : 1; };

type EggStep = "ready" | "scooping" | "picked" | "open";

/** Lucky eggs: scoop an egg out of the big jar, tap it to crack it open and see what is inside. One egg a turn. */
export function LuckyEggs({ onPrize, sfx }: GameProps) {
  const [step, setStep] = useState<EggStep>("ready");
  const [tier, setTier] = useState(0);
  const [taken, setTaken] = useState<number | null>(null);
  const [colour, setColour] = useState(EGG_COLOURS[0]);
  const [round, setRound] = useState(0);
  const board = useRef<HTMLDivElement>(null);
  const done = step === "open";
  usePrize(done, tier, "eggs", onPrize);

  const scoop = async () => {
    const b = board.current;
    if (!b || step !== "ready") return;
    const i = Math.floor(Math.random() * EGGS.length);
    const el = b.querySelector<HTMLElement>(`[data-egg="${i}"]`);
    setStep("scooping");
    setTaken(i);
    setColour(EGGS[i].c);
    const from = el ? centreOf(b, el) : { x: b.clientWidth * 0.3, y: b.clientHeight * 0.6 };
    const egg = await fly(b, from, { x: b.clientWidth * 0.76, y: b.clientHeight * 0.52 }, { ms: 650, arc: 70, className: "egg-flying", startScale: 1, endScale: 1.9, spin: 360 });
    egg.remove();
    setStep("picked");
  };

  const crack = () => {
    const b = board.current;
    if (!b || step !== "picked") return;
    const t = drawTier();
    setTier(t);
    setStep("open");
    const at = { x: b.clientWidth * 0.76, y: b.clientHeight * 0.52 };
    burst(b, at, [colour, "#fff4e2", "#ffd84a"], 16);
    shout(b, { x: at.x, y: at.y - 30 }, t === 3 ? "รางวัลใหญ่!" : "เปิดแล้ว!");
    sfx?.(t === 3 ? "bell" : "pop");
  };

  const again = () => { setStep("ready"); setTier(0); setTaken(null); setRound((r) => r + 1); };

  return (
    <div className="game">
      <p className="game-help">กด "ตักไข่" แล้วแตะไข่เพื่อเปิด ทุกใบมีของ!</p>
      <div ref={board} className="egg-stall" role="group" aria-label="โหลไข่พาโชค">
        <div className="jar" onPointerDown={() => scoop()} aria-hidden="true">
          {EGGS.map((e, i) => (
            <span key={`${round}-${i}`} data-egg={i} className={`egg ${taken === i ? "gone" : ""}`} style={{ left: `${e.x}%`, top: `${e.y}%`, background: e.c, rotate: `${e.r}deg`, animationDelay: `${-i * 0.3}s` }} />
          ))}
        </div>
        {step === "picked" && (
          <button type="button" className="egg-out" style={{ background: colour }} onClick={crack} aria-label="แตะเพื่อเปิดไข่">
            <span className="egg-tap">แตะ!</span>
          </button>
        )}
        {step === "open" && (
          <div className="egg-prize" role="status">
            <span className="egg-shell left" style={{ background: colour }} aria-hidden="true" />
            <span className="egg-shell right" style={{ background: colour }} aria-hidden="true" />
            <span className="egg-icon" aria-hidden="true">{PRIZE_ICON[tier]}</span>
            <span className="egg-stars">{STARS[tier]}</span>
          </div>
        )}
      </div>
      <GameStatus done={done} tier={tier} game="eggs" summary={STARS[tier]} onAgain={again}>
        <>
          <span>{step === "picked" ? "แตะไข่เพื่อเปิดเลย" : step === "scooping" ? "กำลังตัก…" : "ลุ้นของในไข่กัน"}</span>
          <button type="button" className="panel-action toss" onClick={scoop} disabled={step !== "ready"}>ตักไข่!</button>
        </>
      </GameStatus>
    </div>
  );
}
