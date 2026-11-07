import { useEffect, useRef, useState } from "react";

type Props = {
  /** Direction of the stick, each -1..1 (0, 0 when let go). */
  onSteer: (x: number, y: number) => void;
  hidden: boolean;
};

const RADIUS = 46; // how far the knob can travel from the centre, in px
const DEAD = 0.18; // ignore tiny nudges

/** An on-screen stick for phones and tablets: drag it any way to walk that way; let go to stop. */
export function Joystick({ onSteer, hidden }: Props) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, on: false });
  const active = useRef<number | null>(null);

  const move = (cx: number, cy: number) => {
    const r = base.current?.getBoundingClientRect();
    if (!r) return;
    let dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx = (dx / len) * RADIUS; dy = (dy / len) * RADIUS; }
    setKnob({ x: dx, y: dy, on: true });
    const nx = dx / RADIUS, ny = dy / RADIUS;
    if (Math.hypot(nx, ny) < DEAD) onSteer(0, 0);
    else onSteer(nx, ny);
  };
  const release = () => {
    active.current = null;
    setKnob({ x: 0, y: 0, on: false });
    onSteer(0, 0);
  };

  // follow the finger anywhere on screen once it has touched the stick, not only over it
  useEffect(() => {
    const mv = (e: PointerEvent) => { if (e.pointerId === active.current) move(e.clientX, e.clientY); };
    const up = (e: PointerEvent) => { if (e.pointerId === active.current) release(); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (hidden && active.current !== null) release(); }, [hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={base}
      className={`joystick ${hidden ? "is-hidden" : ""} ${knob.on ? "is-on" : ""}`}
      role="group"
      aria-label="จอยสติ๊กบังคับเดิน"
      data-joystick
      onPointerDown={(e) => { e.preventDefault(); active.current = e.pointerId; move(e.clientX, e.clientY); }}
      style={{ touchAction: "none" }}
    >
      <span className="joystick-arrow up" aria-hidden="true" />
      <span className="joystick-arrow down" aria-hidden="true" />
      <span className="joystick-arrow left" aria-hidden="true" />
      <span className="joystick-arrow right" aria-hidden="true" />
      <span className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
