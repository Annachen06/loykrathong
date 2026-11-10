import { useEffect, useRef, useState } from "react";
import type { HeldThing } from "../festivals/types";

// Two small temple-fair games. Winning hands you a prize: soft toys are carried by your character,
// and every prize is listed on your souvenir card at the Memory Corner. Nothing costs money.

export type Prize = { name: string; hold?: HeldThing };
type OnPrize = (p: Prize) => void;

const BALLOON_COLOURS = ["#ef5a5a", "#ffd84a", "#4fc08a", "#5aa0ef", "#ff8fc0", "#c9b6ff"];

const PRIZES: Record<"darts" | "rings", (Prize | null)[]> = {
  darts: [null, { name: "ลูกอมรสมะม่วง" }, { name: "พวงกุญแจเปลือกหอย" }, { name: "ตุ๊กตาปลาดาวตัวใหญ่", hold: "plushStar" }],
  rings: [null, { name: "สายไหมหนึ่งไม้", hold: "cottonCandy" }, { name: "ตุ๊กตาแมงกะพรุน", hold: "plushJelly" }, { name: "ตุ๊กตากระต่ายส่องจันทร์", hold: "plushRabbit" }],
};

const prizeFor = (game: "darts" | "rings", score: number) => PRIZES[game][Math.min(score, PRIZES[game].length - 1)];

function prizeText(score: number, game: "darts" | "rings") {
  const p = prizeFor(game, score);
  if (!p) return game === "darts" ? "เกือบได้แล้ว ลองอีกทีนะ" : "ห่วงไม่ลงเลย ลองอีกทีนะ";
  return p.hold ? `ได้${p.name}! ถืออยู่ในมือตัวละครแล้ว` : `ได้${p.name}! เก็บไว้ในการ์ดที่ระลึกแล้ว`;
}

/** Hand over the prize once, when a round ends. */
function usePrize(done: boolean, score: number, game: "darts" | "rings", onPrize: OnPrize) {
  useEffect(() => {
    const p = prizeFor(game, score);
    if (done && p) onPrize(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
}

/** Balloon darts: balloons drift on the board; tap one to throw a dart at it. Three darts. */
function BalloonDarts({ onPrize, onPop }: { onPrize: OnPrize; onPop?: () => void }) {
  const [darts, setDarts] = useState(3);
  const [popped, setPopped] = useState<number[]>([]);
  const [misses, setMisses] = useState<{ x: number; y: number }[]>([]);
  const [round, setRound] = useState(0);
  const done = darts === 0;
  usePrize(done, popped.length, "darts", onPrize);

  const hit = (i: number | null, miss?: { x: number; y: number }) => {
    if (done) return;
    setDarts((d) => d - 1);
    if (i !== null && !popped.includes(i)) { setPopped((p) => [...p, i]); onPop?.(); }
    else if (miss) setMisses((m) => [...m, miss]);
  };
  const throwAt = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-balloon]");
    const box = e.currentTarget.getBoundingClientRect();
    hit(target ? Number(target.dataset.balloon) : null, { x: e.clientX - box.left, y: e.clientY - box.top });
  };

  const again = () => { setDarts(3); setPopped([]); setMisses([]); setRound((r) => r + 1); };

  return (
    <div className="game">
      <p className="game-help">แตะลูกโป่งที่ลอยไปมาเพื่อปาเป้า มีลูกดอก 3 ดอก</p>
      <div className="dart-board" onPointerDown={throwAt} role="group" aria-label="กระดานลูกโป่ง">
        {Array.from({ length: 12 }, (_, i) => (
          <button
            key={`${round}-${i}`}
            type="button"
            data-balloon={i}
            className={`balloon ${popped.includes(i) ? "popped" : ""}`}
            style={{
              left: `${8 + (i % 6) * 15}%`,
              top: `${12 + Math.floor(i / 6) * 42}%`,
              background: BALLOON_COLOURS[i % BALLOON_COLOURS.length],
              animationDuration: `${2.2 + ((i * 7) % 5) * 0.45}s`,
              animationDelay: `${-i * 0.37}s`,
            }}
            aria-label={`ลูกโป่งลูกที่ ${i + 1}`}
            aria-disabled={done || popped.includes(i)}
            onClick={(e) => { if (e.detail === 0) hit(i); /* keyboard: Enter/Space throws at this balloon */ }}
          />
        ))}
        {misses.map((m, i) => <span key={i} className="dart-miss" style={{ left: m.x, top: m.y }} />)}
      </div>
      <div className="game-status" aria-live="polite">
        {done ? (
          <>
            <strong>แตก {popped.length} ลูก · {prizeText(popped.length, "darts")}</strong>
            <button type="button" className="game-again" onClick={again}>เล่นอีกครั้ง</button>
          </>
        ) : (
          <span>ลูกดอกเหลือ {darts} · แตกแล้ว {popped.length}</span>
        )}
      </div>
    </div>
  );
}

const RINGS = 4, REACH = 0.1; // how many rings you get, and how close the aim must be (0..1 across the table) to catch a bottle
const BOTTLES = [0.1, 0.3, 0.5, 0.7, 0.9];

/** Ring toss: the ring's aim sweeps slowly across the bottles; press "โยน" to throw. Four rings, and a bottle glows when the aim is close enough. */
function RingToss({ onPrize }: { onPrize: OnPrize }) {
  const [rings, setRings] = useState(RINGS);
  const [hits, setHits] = useState<number[]>([]);
  const [last, setLast] = useState<string>("");
  const aim = useRef(0); // 0..1 across the table
  const marker = useRef<HTMLDivElement>(null);
  const table = useRef<HTMLDivElement>(null);
  const done = rings === 0;
  usePrize(done, hits.length, "rings", onPrize);

  useEffect(() => {
    if (done) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      aim.current = 0.5 + 0.5 * Math.sin((now - t0) / 650);
      if (marker.current) marker.current.style.left = `${aim.current * 100}%`;
      table.current?.querySelectorAll<HTMLElement>(".bottle").forEach((el, i) => el.classList.toggle("near", Math.abs(BOTTLES[i] - aim.current) < REACH));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  const toss = () => {
    if (done) return;
    const a = aim.current;
    // the closest bottle that does not have a ring yet, if the aim is near enough
    let i = -1, best = REACH;
    BOTTLES.forEach((b, j) => { const d = Math.abs(b - a); if (d < best && !hits.includes(j)) { best = d; i = j; } });
    setRings((r) => r - 1);
    if (i >= 0) { setHits((h) => [...h, i]); setLast("คล้องได้!"); }
    else setLast("พลาดไปนิดเดียว");
  };

  const again = () => { setRings(RINGS); setHits([]); setLast(""); };

  return (
    <div className="game">
      <p className="game-help">กด "โยน" ตอนที่ห่วงลอยมาใกล้ขวด (ขวดจะเรืองแสง) มีห่วง {RINGS} วง</p>
      <div className="ring-table" ref={table}>
        {BOTTLES.map((b, i) => (
          <span key={i} className={`bottle ${hits.includes(i) ? "ringed" : ""}`} style={{ left: `${b * 100}%` }} />
        ))}
        {!done && <div ref={marker} className="ring-aim" aria-hidden="true" />}
      </div>
      <div className="game-status" aria-live="polite">
        {done ? (
          <>
            <strong>คล้องได้ {hits.length} วง · {prizeText(hits.length, "rings")}</strong>
            <button type="button" className="game-again" onClick={again}>เล่นอีกครั้ง</button>
          </>
        ) : (
          <>
            <span>ห่วงเหลือ {rings}{last && ` · ${last}`}</span>
            <button type="button" className="panel-action toss" onClick={toss}>โยน!</button>
          </>
        )}
      </div>
    </div>
  );
}

export function FairGames({ onPrize, onPop }: { onPrize: OnPrize; onPop?: () => void }) {
  const [tab, setTab] = useState<"darts" | "rings">("darts");
  return (
    <div className="fair-games">
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "darts"} className={tab === "darts" ? "on" : ""} onClick={() => setTab("darts")}>ปาเป้าลูกโป่ง</button>
        <button type="button" role="tab" aria-selected={tab === "rings"} className={tab === "rings" ? "on" : ""} onClick={() => setTab("rings")}>โยนห่วง</button>
      </div>
      {tab === "darts" ? <BalloonDarts onPrize={onPrize} onPop={onPop} /> : <RingToss onPrize={onPrize} />}
      <p className="game-fine">ตุ๊กตาจะอยู่ในมือตัวละคร ของรางวัลทั้งหมดดูได้ที่มุมความทรงจำ เล่นฟรี</p>
    </div>
  );
}
