import { clamp, dist, lerp } from "./math";
import { drawPerson } from "./person";
import { isWalkable, planPath } from "./walk";
const WALK_SPEED = 250; // world units per second
const JOG_SPEED = 430; // used when the trip is long, so far places don't feel slow
const JOG_DISTANCE = 700;
export function createVisitor(layout, look) {
    const v = {
        look, // can be swapped when the player picks a character
        /** What's in the visitor's hand (a krathong, a prize, a garland...). */
        hold: undefined,
        holdColor: undefined,
        holdColor2: undefined,
        act: null,
        pose: { kneel: 0, wai: 0, bow: 0, raise: 0 },
        x: layout.spawn.x,
        y: layout.spawn.y,
        facing: 1,
        stride: 0, // 0 = standing, 1 = full walk cycle
        phase: 0,
        path: [],
        onArrive: null,
        steer: { x: 0, y: 0 }, // keyboard direction
        clock: 0,
        danceUntil: 0, // ram wong! set by dance()
        danceAmount: 0,
        get moving() { return v.path.length > 0 || v.steer.x !== 0 || v.steer.y !== 0; },
        /** Walk to a point. A new call simply replaces the old trip. */
        walkTo(target, onArrive) {
            v.danceUntil = 0;
            v.act = null;
            v.path = planPath(layout, v, target);
            v.onArrive = onArrive ?? null;
            return v.path[v.path.length - 1];
        },
        stop() { v.path = []; v.onArrive = null; },
        /** Dance on the spot for a few seconds (walking stops it). */
        dance(seconds) { v.stop(); v.danceUntil = v.clock + seconds; },
        get dancing() { return v.clock < v.danceUntil; },
        /** Stop and do something for a while (walking away cancels it). `done` runs when it finishes. */
        perform(kind, seconds, facing, done) {
            v.stop();
            v.danceUntil = 0;
            if (facing)
                v.facing = facing;
            v.act = { kind, start: v.clock, until: v.clock + seconds, done };
        },
        get busy() { return v.act !== null; },
        update(dt) {
            v.clock += dt;
            let moved = false;
            if (v.steer.x || v.steer.y) {
                v.stop();
                const len = Math.hypot(v.steer.x, v.steer.y);
                const step = WALK_SPEED * dt;
                const nx = v.x + (v.steer.x / len) * step;
                const ny = v.y + (v.steer.y / len) * step * 0.7;
                // slide along the edge instead of getting stuck
                if (isWalkable(layout, nx, ny)) {
                    v.x = nx;
                    v.y = ny;
                    moved = true;
                }
                else if (isWalkable(layout, nx, v.y)) {
                    v.x = nx;
                    moved = true;
                }
                else if (isWalkable(layout, v.x, ny)) {
                    v.y = ny;
                    moved = true;
                }
                if (v.steer.x)
                    v.facing = v.steer.x > 0 ? 1 : -1;
            }
            else if (v.path.length) {
                const next = v.path[0];
                let remaining = dist(v.x, v.y, next.x, next.y);
                for (let i = 1; i < v.path.length; i++)
                    remaining += dist(v.path[i - 1].x, v.path[i - 1].y, v.path[i].x, v.path[i].y);
                const step = (remaining > JOG_DISTANCE ? JOG_SPEED : WALK_SPEED) * dt;
                const d = dist(v.x, v.y, next.x, next.y);
                if (d <= step) {
                    v.x = next.x;
                    v.y = next.y;
                    v.path.shift();
                    if (!v.path.length && v.onArrive) {
                        const done = v.onArrive;
                        v.onArrive = null;
                        done();
                    }
                }
                else {
                    v.x += ((next.x - v.x) / d) * step;
                    v.y += ((next.y - v.y) / d) * step;
                    if (Math.abs(next.x - v.x) > 1)
                        v.facing = next.x > v.x ? 1 : -1;
                }
                moved = true;
            }
            v.stride = lerp(v.stride, moved ? 1 : 0, Math.min(1, dt * 10));
            if (moved)
                v.phase += dt * 12;
            if (moved)
                v.danceUntil = 0;
            v.danceAmount = lerp(v.danceAmount, v.dancing ? 1 : 0, Math.min(1, dt * 6));
            if (moved && v.act)
                v.act = null;
            // ease into the pose for the current activity
            const a = v.act;
            const el = a ? v.clock - a.start : 0;
            let kneel = 0, wai = 0, bow = 0, raise = 0;
            if (a) {
                const ending = a.until - v.clock < 0.6; // stand up again at the end
                kneel = ending || a.kind === "lantern" ? 0 : 1;
                if (a.kind === "lantern") {
                    // stand holding the lantern up in both hands while it fills with warm air, then let go
                    raise = el < a.until - a.start - 0.3 ? 1 : 0;
                }
                else if (a.kind === "pray") {
                    wai = ending ? 0 : 1;
                    // three slow bows (krap) in the middle of the prayer
                    const k = (el - 1.4) / 4.2;
                    bow = k > 0 && k < 1 ? Math.max(0, Math.sin(k * Math.PI * 3)) * 0.9 : 0;
                }
                else if (a.kind === "fortune") {
                    bow = 0.18 + (el > 0.6 && el < a.until - a.start - 1.2 ? Math.sin(v.clock * 30) * 0.05 : 0);
                }
                else {
                    bow = ending ? 0 : 0.3;
                }
                if (v.clock >= a.until) {
                    v.act = null;
                    a.done?.();
                }
            }
            const e = Math.min(1, dt * 5);
            v.pose.kneel = lerp(v.pose.kneel, kneel, e);
            v.pose.wai = lerp(v.pose.wai, wai, e);
            v.pose.raise = lerp(v.pose.raise, raise, e);
            v.pose.bow = lerp(v.pose.bow, bow, Math.min(1, dt * 4));
        },
        draw(ctx, t) {
            const d = layout.depth;
            const k = clamp((v.y - d.yBack) / (d.yFront - d.yBack), 0, 1);
            const s = lerp(d.scaleBack, d.scaleFront, k);
            // a soft moonlit ring under the visitor's feet, so you can always spot "you" in the crowd
            const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
            ctx.save();
            ctx.strokeStyle = `rgba(255,214,140,${0.55 + pulse * 0.3})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(v.x, v.y, (21 + pulse * 3) * s, (6.5 + pulse) * s, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            drawPerson(ctx, v.x, v.y, s * 1.08, v.facing, v.phase, v.stride, t, v.look, {
                dance: v.danceAmount, ...v.pose, hold: v.hold, holdColor: v.holdColor, holdColor2: v.holdColor2,
            });
        },
    };
    return v;
}
