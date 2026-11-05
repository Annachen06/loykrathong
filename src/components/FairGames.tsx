import { useEffect, useRef, useState } from "react";

// Two small temple-fair games. Prizes are just for fun: nothing is collected or stored.

const BALLOON_COLOURS = ["#ef5a5a", "#ffd84a", "#4fc08a", "#5aa0ef", "#ff8fc0", "#c9b6ff"];

function prizeFor(score: number, game: "darts" | "rings") {
  if (game === "darts") return ["เกือบได้แล้ว ลองอีกทีนะ", "ได้ลูกอมรสมะม่วง", "ได้พวงกุญแจเปลือกหอย", "ได้ตุ๊กตาปลาดาวตัวใหญ่!"][score];
  return ["ห่วงไม่ลงเลย ลองอีกทีนะ", "ได้ขนมสายไหมหนึ่งไม้", "ได้ตุ๊กตาแมงกะพรุน", "ได้ตุ๊กตากระต่ายส่องจันทร์!"][score];
}

/** Balloon darts: balloons drift on the board; tap one to throw a dart at it. Three darts. */
function BalloonDarts() {
  const [darts, setDarts] = useState(3);
  const [popped, setPopped] = useState<number[]>([]);
  const [misses, setMisses] = useState<{ x: number; y: number }[]>([]);
  const [round, setRound] = useState(0);
  const done = darts === 0;

  const hit = (i: number | null, miss?: { x: number; y: number }) => {
    if (done) return;
    setDarts((d) => d - 1);
    if (i !== null && !popped.includes(i)) setPopped((p) => [...p, i]);
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
            <strong>แตก {popped.length} ลูก · {prizeFor(popped.length, "darts")}</strong>
            <button type="button" className="game-again" onClick={again}>เล่นอีกครั้ง</button>
          </>
        ) : (
          <span>ลูกดอกเหลือ {darts} · แตกแล้ว {popped.length}</span>
        )}
      </div>
    </div>
  );
}

/** Ring toss: the ring's aim sweeps across the bottles; press "โยน" to throw. Three rings. */
function RingToss() {
  const [rings, setRings] = useState(3);
  const [hits, setHits] = useState<number[]>([]);
  const [last, setLast] = useState<string>("");
  const aim = useRef(0); // 0..1 across the table
  const marker = useRef<HTMLDivElement>(null);
  const done = rings === 0;
  const BOTTLES = [0.1, 0.3, 0.5, 0.7, 0.9];

  useEffect(() => {
    if (done) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      aim.current = 0.5 + 0.5 * Math.sin((now - t0) / 380);
      if (marker.current) marker.current.style.left = `${aim.current * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  const toss = () => {
    if (done) return;
    const a = aim.current;
    const i = BOTTLES.findIndex((b) => Math.abs(b - a) < 0.045);
    setRings((r) => r - 1);
    if (i >= 0 && !hits.includes(i)) { setHits((h) => [...h, i]); setLast("คล้องได้!"); }
    else setLast("พลาดไปนิดเดียว");
  };

  const again = () => { setRings(3); setHits([]); setLast(""); };

  return (
    <div className="game">
      <p className="game-help">กด "โยน" ตอนที่ห่วงอยู่ตรงคอขวดพอดี มีห่วง 3 วง</p>
      <div className="ring-table">
        {BOTTLES.map((b, i) => (
          <span key={i} className={`bottle ${hits.includes(i) ? "ringed" : ""}`} style={{ left: `${b * 100}%` }} />
        ))}
        {!done && <div ref={marker} className="ring-aim" aria-hidden="true" />}
      </div>
      <div className="game-status" aria-live="polite">
        {done ? (
          <>
            <strong>คล้องได้ {hits.length} วง · {prizeFor(hits.length, "rings")}</strong>
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

export function FairGames() {
  const [tab, setTab] = useState<"darts" | "rings">("darts");
  return (
    <div className="fair-games">
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "darts"} className={tab === "darts" ? "on" : ""} onClick={() => setTab("darts")}>ปาเป้าลูกโป่ง</button>
        <button type="button" role="tab" aria-selected={tab === "rings"} className={tab === "rings" ? "on" : ""} onClick={() => setTab("rings")}>โยนห่วง</button>
      </div>
      {tab === "darts" ? <BalloonDarts /> : <RingToss />}
      <p className="game-fine">ของรางวัลเป็นของเล่นในเกม ไม่ได้เก็บไว้และไม่มีค่าใช้จ่าย</p>
    </div>
  );
}
