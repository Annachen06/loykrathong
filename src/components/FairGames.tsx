import { useEffect, useRef, useState } from "react";
import type { SoundName } from "../engine/sound";
import { prizeText, usePrize, type OnPrize, type Prize } from "./gamePrizes";
import { KnockCans, LuckyEggs, ShootingGallery } from "./MoreGames";
import { boardPoint, burst, centreOf, fly, hitAt, shout, wobble, type Pt } from "./throwKit";

export type { Prize };
export type GameProps = { onPrize: OnPrize; sfx?: (name: SoundName) => void };

// The booth games: balloon darts and the ring toss live here; the shooting gallery, the cans and the lucky eggs in MoreGames.tsx.
// Winning hands you a prize (see gamePrizes.ts). Nothing costs money.

/** Result line + "play again", or the live status while a round is on. */
export function GameStatus({ done, summary, tier, game, onAgain, children }: { done: boolean; summary: string; tier: number; game: Parameters<typeof prizeText>[1]; onAgain: () => void; children: React.ReactNode }) {
  return (
    <div className="game-status" aria-live="polite">
      {done ? (
        <>
          <strong>{summary} · {prizeText(tier, game)}</strong>
          <button type="button" className="game-again" onClick={onAgain}>เล่นอีกครั้ง</button>
        </>
      ) : children}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ balloon darts
const BALLOON_COLOURS = ["#ef5a5a", "#ffd84a", "#4fc08a", "#5aa0ef", "#ff8fc0", "#c9b6ff"];
const DARTS = 5;
const tierDarts = (n: number) => (n >= 5 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0);

/** Balloon darts: balloons are pinned to a cork board; tap where to throw and the dart flies there. Five darts. */
function BalloonDarts({ onPrize, sfx }: GameProps) {
  const [darts, setDarts] = useState(DARTS);
  const [popped, setPopped] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [flying, setFlying] = useState(false);
  const board = useRef<HTMLDivElement>(null);
  const done = darts === 0 && !flying;
  usePrize(done, tierDarts(popped.length), "darts", onPrize);

  const throwAt = async (to: Pt) => {
    const b = board.current;
    if (!b || darts === 0 || flying) return;
    setFlying(true);
    setDarts((d) => d - 1);
    const land = wobble(to, 6);
    const dart = await fly(b, { x: b.clientWidth / 2, y: b.clientHeight + 30 }, land, { ms: 280, arc: 26, className: "dart", startScale: 1.6, endScale: 0.8, keep: true });
    const hit = hitAt(b, "[data-balloon]", land, 0.62);
    if (hit) {
      const i = Number(hit.dataset.balloon);
      hit.classList.add("popped");
      burst(b, centreOf(b, hit), [BALLOON_COLOURS[i % BALLOON_COLOURS.length], "#fff4e2"], 12);
      shout(b, land, "แตก!");
      sfx?.("pop");
      setPopped((p) => [...p, i]);
      dart.classList.add("dart-fall");
      window.setTimeout(() => dart.remove(), 500);
    } else {
      shout(b, land, "พลาด");
    }
    setFlying(false);
  };

  const again = () => {
    board.current?.querySelectorAll(".projectile").forEach((el) => el.remove());
    setDarts(DARTS); setPopped([]); setRound((r) => r + 1);
  };

  return (
    <div className="game">
      <p className="game-help">แตะลูกโป่งเพื่อปาลูกดอก มี {DARTS} ดอก</p>
      <div ref={board} className="dart-board" onPointerDown={(e) => throwAt(boardPoint(e.currentTarget, e))} role="group" aria-label="กระดานลูกโป่ง">
        {Array.from({ length: 15 }, (_, i) => (
          <button
            key={`${round}-${i}`}
            type="button"
            data-balloon={i}
            className={`balloon ${popped.includes(i) ? "popped" : ""}`}
            style={{
              left: `${6 + (i % 5) * 19}%`,
              top: `${8 + Math.floor(i / 5) * 31}%`,
              background: BALLOON_COLOURS[i % BALLOON_COLOURS.length],
              animationDuration: `${2.4 + ((i * 7) % 5) * 0.4}s`,
              animationDelay: `${-i * 0.37}s`,
            }}
            aria-label={`ลูกโป่งลูกที่ ${i + 1}`}
            aria-disabled={done || popped.includes(i)}
            onClick={(e) => { if (e.detail === 0 && board.current) throwAt(centreOf(board.current, e.currentTarget)); /* keyboard */ }}
          />
        ))}
      </div>
      <GameStatus done={done} tier={tierDarts(popped.length)} game="darts" summary={`แตก ${popped.length} ลูก`} onAgain={again}>
        <span>ลูกดอกเหลือ {darts} · แตกแล้ว {popped.length}</span>
      </GameStatus>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ ring toss
const RINGS = 4, REACH = 0.1; // how many rings you get, and how close the aim must be (0..1 across the table) to catch a bottle
const BOTTLES = [0.1, 0.3, 0.5, 0.7, 0.9];
const tierRings = (n: number) => Math.min(n, 3);

/** Ring toss: the aim sweeps slowly across the bottles; throw and the ring sails over and drops on a neck (or bounces off). */
function RingToss({ onPrize, sfx }: GameProps) {
  const [rings, setRings] = useState(RINGS);
  const [hits, setHits] = useState<number[]>([]);
  const [last, setLast] = useState("");
  const [flying, setFlying] = useState(false);
  const aim = useRef(0.5); // 0..1 across the table
  const marker = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLDivElement>(null);
  const done = rings === 0 && !flying;
  usePrize(done, tierRings(hits.length), "rings", onPrize);

  useEffect(() => {
    if (rings === 0) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      if (!flying) aim.current = 0.5 + 0.5 * Math.sin((now - t0) / 650);
      if (marker.current) marker.current.style.left = `${aim.current * 100}%`;
      table.current?.querySelectorAll<HTMLElement>(".bottle").forEach((el, i) => el.classList.toggle("near", !flying && Math.abs(BOTTLES[i] - aim.current) < REACH));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rings, flying]);

  const toss = async () => {
    const t = table.current;
    if (!t || rings === 0 || flying) return;
    const a = aim.current;
    // the closest bottle that does not have a ring yet, if the aim is near enough
    let i = -1, best = REACH;
    BOTTLES.forEach((b, j) => { const d = Math.abs(b - a); if (d < best && !hits.includes(j)) { best = d; i = j; } });
    setFlying(true);
    setRings((r) => r - 1);
    const w = t.clientWidth, h = t.clientHeight;
    const target = { x: (i >= 0 ? BOTTLES[i] : a) * w, y: h * 0.28 };
    await fly(t, { x: w / 2, y: h + 24 }, target, { ms: 520, arc: 46, className: "ring-fly", startScale: 1.5, endScale: 1 });
    if (i >= 0) {
      setHits((hs) => [...hs, i]);
      setLast("คล้องได้!");
      shout(t, { x: target.x, y: target.y - 6 }, "คล้องได้!");
      burst(t, { x: target.x, y: target.y + 6 }, ["#ffcf6e", "#fff4e2"], 8);
      sfx?.("bell");
    } else {
      setLast("ห่วงกระเด้งออก");
      // the ring clinks off the bottles and rolls away
      await fly(t, target, { x: target.x + (a < 0.5 ? -60 : 60), y: h + 20 }, { ms: 420, arc: 18, className: "ring-fly", startScale: 1, endScale: 0.9 });
    }
    setFlying(false);
  };

  const again = () => { setRings(RINGS); setHits([]); setLast(""); };

  return (
    <div className="game">
      <p className="game-help">กด "โยน" ตอนห่วงใกล้ขวด (เรืองแสง) มีห่วง {RINGS} วง</p>
      <div className="ring-table" ref={table} onPointerDown={() => toss()}>
        {BOTTLES.map((b, i) => (
          <span key={i} className={`bottle ${hits.includes(i) ? "ringed" : ""}`} style={{ left: `${b * 100}%` }} />
        ))}
        {rings > 0 && !flying && <div ref={marker} className="ring-aim" aria-hidden="true" />}
      </div>
      <GameStatus done={done} tier={tierRings(hits.length)} game="rings" summary={`คล้องได้ ${hits.length} วง`} onAgain={again}>
        <>
          <span>ห่วงเหลือ {rings}{last && ` · ${last}`}</span>
          <button type="button" className="panel-action toss" onClick={toss} disabled={flying || rings === 0}>โยน!</button>
        </>
      </GameStatus>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ the stall
type Tab = "darts" | "shoot" | "rings" | "cans" | "eggs";
const TABS: { id: Tab; label: string }[] = [
  { id: "darts", label: "ปาลูกโป่ง" },
  { id: "shoot", label: "ยิงปืน" },
  { id: "rings", label: "โยนห่วง" },
  { id: "cans", label: "ปากระป๋อง" },
  { id: "eggs", label: "ตักไข่พาโชค" },
];

export function FairGames({ onPrize, sfx }: GameProps) {
  const [tab, setTab] = useState<Tab>("darts");
  return (
    <div className="fair-games">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === "darts" && <BalloonDarts onPrize={onPrize} sfx={sfx} />}
      {tab === "shoot" && <ShootingGallery onPrize={onPrize} sfx={sfx} />}
      {tab === "rings" && <RingToss onPrize={onPrize} sfx={sfx} />}
      {tab === "cans" && <KnockCans onPrize={onPrize} sfx={sfx} />}
      {tab === "eggs" && <LuckyEggs onPrize={onPrize} sfx={sfx} />}
      <p className="game-fine">ตุ๊กตาจะอยู่ในมือตัวละคร ของรางวัลทั้งหมดดูได้ที่มุมความทรงจำ เล่นฟรี</p>
    </div>
  );
}
