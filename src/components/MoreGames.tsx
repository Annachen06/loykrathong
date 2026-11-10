import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { prizeText, usePrize, type OnPrize } from "./gamePrizes";

// More booth games for the same stall: shooting dolls, knocking down cans, scooping goldfish, duck fishing and the strongman hammer.
// They all end the same way: a result line, a prize (maybe), and a button to play again.

type Props = { onPrize: OnPrize; onHit?: () => void };

/** Result line + "play again" shown when a round is over. */
function Result({ done, tier, game, summary, onAgain, children }: { done: boolean; tier: number; game: Parameters<typeof prizeText>[1]; summary: string; onAgain: () => void; children: React.ReactNode }) {
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

/** A steady 0..1 sweep (back and forth) that the throwing games aim with. */
function useSweep(running: boolean, period: number) {
  const value = useRef(0.5);
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      value.current = 0.5 + 0.5 * Math.sin((now - t0) / period);
      if (el) el.style.left = `${value.current * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, period, el]);
  return { value, ref: setEl };
}

// ------------------------------------------------------------------------------------------------ shooting dolls
const DOLLS = ["🧸", "🐰", "🐻", "🐱", "🐶", "🐼", "🦊", "🐥"];
const tierShoot = (n: number) => (n >= 5 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);

/** Cork-gun shooting: dolls sit on two shelves sliding gently; tap one to shoot it. Five corks. */
export function ShootDolls({ onPrize, onHit }: Props) {
  const [shots, setShots] = useState(5);
  const [down, setDown] = useState<number[]>([]);
  const [misses, setMisses] = useState<{ x: number; y: number }[]>([]);
  const [round, setRound] = useState(0);
  const done = shots === 0;
  usePrize(done, tierShoot(down.length), "shoot", onPrize);

  const shoot = (i: number | null, miss?: { x: number; y: number }) => {
    if (done) return;
    setShots((n) => n - 1);
    if (i !== null && !down.includes(i)) { setDown((d) => [...d, i]); onHit?.(); }
    else if (miss) setMisses((m) => [...m, miss]);
  };
  const fire = (e: React.PointerEvent<HTMLDivElement>) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-doll]");
    const box = e.currentTarget.getBoundingClientRect();
    shoot(t ? Number(t.dataset.doll) : null, { x: e.clientX - box.left, y: e.clientY - box.top });
  };
  const again = () => { setShots(5); setDown([]); setMisses([]); setRound((r) => r + 1); };

  return (
    <div className="game">
      <p className="game-help">แตะตุ๊กตาบนชั้นเพื่อยิงจุกก๊อก มี 5 นัด</p>
      <div className="doll-board" onPointerDown={fire} role="group" aria-label="ชั้นวางตุ๊กตา">
        {[0, 1].map((shelf) => (
          <div key={`${round}-${shelf}`} className={`doll-shelf shelf-${shelf}`}>
            {DOLLS.slice(shelf * 4, shelf * 4 + 4).map((d, k) => {
              const i = shelf * 4 + k;
              return (
                <button
                  key={i}
                  type="button"
                  data-doll={i}
                  className={`doll ${down.includes(i) ? "down" : ""}`}
                  aria-label={`ตุ๊กตาตัวที่ ${i + 1}`}
                  aria-disabled={done || down.includes(i)}
                  onClick={(e) => { if (e.detail === 0) shoot(i); }}
                >{d}</button>
              );
            })}
          </div>
        ))}
        {misses.map((m, i) => <span key={i} className="dart-miss" style={{ left: m.x, top: m.y }} />)}
      </div>
      <Result done={done} tier={tierShoot(down.length)} game="shoot" summary={`ยิงล้ม ${down.length} ตัว`} onAgain={again}>
        <span>จุกก๊อกเหลือ {shots} · ล้มแล้ว {down.length}</span>
      </Result>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ knock down the cans
const CANS = [
  { x: 0.25, row: 0 }, { x: 0.5, row: 0 }, { x: 0.75, row: 0 },
  { x: 0.375, row: 1 }, { x: 0.625, row: 1 },
  { x: 0.5, row: 2 },
];
const CAN_COLOURS = ["#ef5a5a", "#ffd84a", "#5aa0ef", "#ff8fc0", "#4fc08a", "#c9b6ff"];
const tierCans = (n: number) => (n >= 5 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);

/** Throw a ball at a pyramid of cans: the aim sweeps across, press "ปา" when it is near the cans. Three balls. */
export function KnockCans({ onPrize, onHit }: Props) {
  const [balls, setBalls] = useState(3);
  const [down, setDown] = useState<number[]>([]);
  const [last, setLast] = useState("");
  const done = balls === 0;
  const sweep = useSweep(!done, 800);
  const table = useRef<HTMLDivElement>(null);
  usePrize(done, tierCans(down.length), "cans", onPrize);

  // the cans the ball would knock glow, so it is easy to see when to throw
  useEffect(() => {
    if (done) return;
    let raf = 0;
    const tick = () => {
      table.current?.querySelectorAll<HTMLElement>(".can").forEach((el, i) => el.classList.toggle("near", Math.abs(CANS[i].x - sweep.value.current) < 0.16));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done, sweep.value]);

  const throwBall = () => {
    if (done) return;
    const a = sweep.value.current;
    const hit = CANS.map((_, i) => i).filter((i) => !down.includes(i) && Math.abs(CANS[i].x - a) < 0.16);
    setBalls((b) => b - 1);
    if (hit.length) { setDown((d) => [...d, ...hit]); setLast(hit.length > 1 ? `ล้ม ${hit.length} ใบ!` : "ล้มไปใบนึง!"); onHit?.(); }
    else setLast("ลูกบอลลอดไปเฉยๆ");
  };
  const again = () => { setBalls(3); setDown([]); setLast(""); };

  return (
    <div className="game">
      <p className="game-help">กด "ปา" ตอนเป้าใกล้กระป๋อง (เรืองแสง) มีบอล 3 ลูก</p>
      <div className="can-table" ref={table}>
        {CANS.map((c, i) => (
          <span key={i} className={`can ${down.includes(i) ? "down" : ""}`} style={{ left: `${c.x * 100}%`, bottom: `${22 + c.row * 26}%`, background: CAN_COLOURS[i % CAN_COLOURS.length] }} />
        ))}
        {!done && <div ref={sweep.ref} className="ball-aim" aria-hidden="true" />}
      </div>
      <Result done={done} tier={tierCans(down.length)} game="cans" summary={`ล้ม ${down.length} ใบ`} onAgain={again}>
        <>
          <span>ลูกบอลเหลือ {balls}{last && ` · ${last}`}</span>
          <button type="button" className="panel-action toss" onClick={throwBall}>ปา!</button>
        </>
      </Result>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ scooping goldfish
const FISH = [
  { top: 8, dur: 5.2, delay: -0.5 }, { top: 26, dur: 6.6, delay: -3.1 }, { top: 44, dur: 4.6, delay: -1.8 }, { top: 62, dur: 7.2, delay: -5 },
  { top: 14, dur: 6, delay: -4.2 }, { top: 52, dur: 5.6, delay: -2.6 }, { top: 34, dur: 4.9, delay: -0.2 },
];
const tierFish = (n: number) => (n >= 5 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);

/** Goldfish scooping: the paper scoop gets soggy as time passes and with every scoop. Tap the fish before it tears. */
export function ScoopFish({ onPrize, onHit }: Props) {
  const [paper, setPaper] = useState(100);
  const [caught, setCaught] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const done = paper <= 0;
  usePrize(done, tierFish(caught.length), "fish", onPrize);

  useEffect(() => {
    if (done) return;
    const t = window.setInterval(() => setPaper((p) => Math.max(0, p - 1.3)), 100);
    return () => window.clearInterval(t);
  }, [done, round]);

  const scoop = (e: React.PointerEvent<HTMLDivElement>) => {
    if (done) return;
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-fish]");
    const i = t ? Number(t.dataset.fish) : null;
    if (i !== null && !caught.includes(i)) { setCaught((c) => [...c, i]); setPaper((p) => Math.max(0, p - 12)); onHit?.(); }
    else if (i === null) setPaper((p) => Math.max(0, p - 4)); // dabbing at empty water
  };
  const again = () => { setPaper(100); setCaught([]); setRound((r) => r + 1); };

  return (
    <div className="game">
      <p className="game-help">แตะปลาทองเพื่อตัก กระดาษเปื่อยเร็ว ตักให้ได้มาก!</p>
      <div className="fish-tank" onPointerDown={scoop} role="group" aria-label="ตู้ปลาทอง">
        {FISH.map((f, i) => (
          <button
            key={`${round}-${i}`}
            type="button"
            data-fish={i}
            className={`fish ${caught.includes(i) ? "caught" : ""}`}
            style={{ top: `${f.top}%`, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
            aria-label={`ปลาทองตัวที่ ${i + 1}`}
            aria-disabled={done || caught.includes(i)}
            onClick={(e) => { if (e.detail === 0 && !done && !caught.includes(i)) { setCaught((c) => [...c, i]); setPaper((p) => Math.max(0, p - 12)); onHit?.(); } }}
          >🐠</button>
        ))}
      </div>
      <div className="paper-bar" aria-hidden="true"><span style={{ width: `${paper}%` }} /></div>
      <Result done={done} tier={tierFish(caught.length)} game="fish" summary={`ตักได้ ${caught.length} ตัว`} onAgain={again}>
        <span>กระดาษเหลือ {Math.ceil(paper)}% · ตักได้ {caught.length} ตัว</span>
      </Result>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ duck fishing
const STARS = ["ไม่มีรางวัล", "★ รางวัลเล็ก", "★★ รางวัลกลาง", "★★★ รางวัลใหญ่"];

/** Duck fishing: hook a duck, look at the mark underneath. Three hooks; the best mark wins. */
export function DuckPond({ onPrize, onHit }: Props) {
  const [hooks, setHooks] = useState(3);
  const [caught, setCaught] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  // what is written under each duck is decided when the round starts (and not changed by anything you do)
  const marks = useMemo(() => {
    const m = [0, 1, 1, 2, 2, 3];
    for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);
  const done = hooks === 0;
  const best = caught.reduce((b, i) => Math.max(b, marks[i]), 0);
  usePrize(done, best, "ducks", onPrize);

  const hook = useCallback((i: number) => {
    if (hooks === 0 || caught.includes(i)) return;
    setHooks((h) => h - 1);
    setCaught((c) => [...c, i]);
    onHit?.();
  }, [hooks, caught, onHit]);
  const again = () => { setHooks(3); setCaught([]); setRound((r) => r + 1); };

  return (
    <div className="game">
      <p className="game-help">แตะเป็ดเพื่อตก ดูดาวใต้ตัวเป็ด มีเบ็ด 3 อัน</p>
      <div className="duck-pond" role="group" aria-label="บ่อเป็ด">
        {marks.map((m, i) => (
          <button
            key={`${round}-${i}`}
            type="button"
            data-duck={i}
            className={`duck ${caught.includes(i) ? "caught" : ""}`}
            style={{ left: `${6 + (i % 3) * 31}%`, top: `${10 + Math.floor(i / 3) * 44}%`, animationDelay: `${-i * 0.7}s` }}
            aria-label={`เป็ดตัวที่ ${i + 1}`}
            aria-disabled={done || caught.includes(i)}
            onClick={() => hook(i)}
          >
            <span className="duck-body">🦆</span>
            {caught.includes(i) && <span className="duck-mark">{"★".repeat(m) || "–"}</span>}
          </button>
        ))}
      </div>
      <Result done={done} tier={best} game="ducks" summary={STARS[best]} onAgain={again}>
        <span>เบ็ดเหลือ {hooks}{caught.length > 0 && ` · ตอนนี้ดีที่สุด: ${STARS[best]}`}</span>
      </Result>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ strongman hammer
const tierHammer = (h: number) => (h >= 0.9 ? 3 : h >= 0.7 ? 2 : h >= 0.4 ? 1 : 0);
const HAMMER_WORDS = ["เบาไปหน่อย", "พอใช้ได้", "แรงดีมาก!", "กระดิ่งดังเลย!"];

/** Strongman: hold to build up strength (it rises, then falls again), let go to swing the hammer. Three swings; the best counts. */
export function Hammer({ onPrize, onHit }: Props) {
  const [swings, setSwings] = useState(3);
  const [best, setBest] = useState(0);
  const [last, setLast] = useState<number | null>(null);
  const power = useRef(0);
  const started = useRef(0);
  const [charging, setCharging] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const done = swings === 0;
  usePrize(done, tierHammer(best), "hammer", onPrize);

  useEffect(() => {
    if (!charging) return;
    let raf = 0;
    const tick = (now: number) => {
      const t = ((now - started.current) / 1500) % 2; // up for 1.5 s, down for 1.5 s
      power.current = t < 1 ? t : 2 - t;
      if (bar.current) bar.current.style.height = `${power.current * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [charging]);

  const start = () => { if (done || charging) return; started.current = performance.now(); power.current = 0; setCharging(true); };
  const strike = () => {
    if (!charging) return;
    setCharging(false);
    const h = power.current;
    setLast(h);
    setBest((b) => Math.max(b, h));
    setSwings((s) => s - 1);
    if (h >= 0.4) onHit?.();
    if (bar.current) bar.current.style.height = `${h * 100}%`;
  };
  const again = () => { setSwings(3); setBest(0); setLast(null); power.current = 0; if (bar.current) bar.current.style.height = "0%"; };

  return (
    <div className="game">
      <p className="game-help">กดค้างให้พลังขึ้น แล้วปล่อยตอนพลังสูง (ขึ้นแล้วก็ลงนะ) มี 3 ครั้ง</p>
      <div className="hammer-game">
        <div className="hammer-tower" aria-hidden="true">
          <span className="hammer-bell">🔔</span>
          <div ref={bar} className="hammer-bar" />
          <span className="hammer-line l9" /><span className="hammer-line l7" /><span className="hammer-line l4" />
        </div>
        <div className="hammer-side">
          <p>{last === null ? "ยังไม่ได้ตี" : `ครั้งล่าสุด ${Math.round(last * 100)}% · ${HAMMER_WORDS[tierHammer(last)]}`}</p>
          {!done && (
            <button
              type="button"
              className="panel-action hammer-hold"
              onPointerDown={(e) => { e.preventDefault(); start(); }}
              onPointerUp={strike}
              onPointerCancel={strike}
              onPointerLeave={strike}
              onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); start(); } }}
              onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") strike(); }}
              onContextMenu={(e) => e.preventDefault()}
            >{charging ? "ปล่อยเลย!" : "กดค้างเพื่อออกแรง"}</button>
          )}
        </div>
      </div>
      <Result done={done} tier={tierHammer(best)} game="hammer" summary={`แรงสุด ${Math.round(best * 100)}%`} onAgain={again}>
        <span>ค้อนเหลือ {swings} ครั้ง · แรงสุด {Math.round(best * 100)}%</span>
      </Result>
    </div>
  );
}
