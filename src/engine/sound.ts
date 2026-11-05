// The fair's sounds, made live with the Web Audio API (no audio files to download or license):
// waves on the shore, the murmur of the crowd, a ram wong band (ching cymbals, drum, a plucked tune)
// that gets louder as you walk towards the stage, and small effects (fireworks, temple bell, a splash...).
// Browsers only allow sound after a tap, so start() is called when the visitor enters.
import { clamp } from "./math";

export type SoundName = "firework" | "bell" | "splash" | "pop" | "chime" | "pickup";
export type Sound = ReturnType<typeof createSound>;

const STORE_KEY = "fair-sound-muted";
/** Overall loudness. The fair should sit in the background, not fill the room. */
const VOLUME = 0.5;

export function createSound(stageX: number) {
  let ac: AudioContext | null = null;
  let master: GainNode;
  let musicBus: GainNode;
  let crowdBus: GainNode;
  let wavesBus: GainNode;
  let fxBus: GainNode;
  let noise: AudioBuffer;
  let nextBeat = 0;
  let step = 0;
  let timer = 0;
  let muted = false;
  try { muted = localStorage.getItem(STORE_KEY) === "1"; } catch { /* storage may be blocked */ }

  // A ram wong groove: 16 steps per bar. Pentatonic tune (Thai music uses a five-note feel).
  const BPM = 112;
  const STEP = 60 / BPM / 2; // eighth notes
  const SCALE = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];
  const TUNE = [
    4, -1, 3, 4, 5, -1, 4, 3, 2, -1, 3, -1, 4, -1, -1, -1,
    5, -1, 6, 5, 4, -1, 3, 4, 2, -1, 1, -1, 0, -1, -1, -1,
    2, -1, 3, 2, 4, -1, 3, 2, 3, -1, 4, -1, 5, -1, -1, -1,
    7, -1, 6, 5, 4, -1, 3, 2, 1, -1, 2, -1, 0, -1, -1, -1,
  ];
  const BASS = [0, 3, 4, 3];

  function start() {
    if (ac) {
      if (ac.state === "suspended") ac.resume().catch(() => {});
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ac.destination);
    const bus = (v: number) => { const g = ac!.createGain(); g.gain.value = v; g.connect(master); return g; };
    musicBus = bus(0.3);
    crowdBus = bus(0.18);
    wavesBus = bus(0.22);
    fxBus = bus(0.4);

    // two seconds of soft noise, reused by everything that hisses
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brown-ish: deeper, like surf
      d[i] = last * 3.5 + white * 0.08;
    }

    // waves: filtered noise that swells and falls
    const waves = loopNoise(0.7);
    const wf = ac.createBiquadFilter();
    wf.type = "lowpass";
    wf.frequency.value = 700;
    const swell = ac.createGain();
    swell.gain.value = 0.6;
    lfo(swell.gain, 0.09, 0.4);
    waves.connect(wf).connect(swell).connect(wavesBus);

    // crowd murmur: a few bands of noise in the voice range, each rising and falling on its own
    for (const [f, rate] of [[420, 0.31], [760, 0.47], [1150, 0.23]] as const) {
      const src = loopNoise(1 + Math.random());
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = 1.6;
      lfo(bp.frequency, rate * 1.7, f * 0.25);
      const g = ac.createGain();
      g.gain.value = 0.5;
      lfo(g.gain, rate, 0.35);
      src.connect(bp).connect(g).connect(crowdBus);
    }

    nextBeat = ac.currentTime + 0.1;
    timer = window.setInterval(schedule, 60);
    document.addEventListener("visibilitychange", onVisibility);
  }

  function onVisibility() {
    if (!ac) return;
    if (document.hidden) ac.suspend().catch(() => {});
    else ac.resume().catch(() => {});
  }

  function loopNoise(rate: number) {
    const s = ac!.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    s.playbackRate.value = rate;
    s.start();
    return s;
  }

  function lfo(param: AudioParam, freq: number, depth: number) {
    const o = ac!.createOscillator();
    o.frequency.value = freq;
    const g = ac!.createGain();
    g.gain.value = depth;
    o.connect(g).connect(param);
    o.start();
  }

  // ---------------------------------------------------------------- the band
  function schedule() {
    if (!ac) return;
    while (nextBeat < ac.currentTime + 0.25) {
      playStep(step, nextBeat);
      nextBeat += STEP;
      step = (step + 1) % TUNE.length;
    }
  }

  function playStep(i: number, t: number) {
    const s16 = i % 16;
    // ching (open ring) on the off-beats, chap (closed) on the beats: the heartbeat of ram wong
    if (s16 % 4 === 2) ching(t, 0.5);
    if (s16 % 4 === 0) chap(t);
    // thon drum: "tung ... tung-tung"
    if (s16 === 0 || s16 === 6 || s16 === 8 || s16 === 14) drum(t, s16 === 0 ? 1 : 0.7);
    if (s16 % 8 === 0) bass(t, SCALE[BASS[Math.floor(i / 16) % 4]] / 2);
    const n = TUNE[i];
    if (n >= 0) pluck(t, SCALE[n]);
  }

  function env(g: GainNode, t: number, peak: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  }

  function pluck(t: number, f: number) {
    const a = ac!;
    const g = a.createGain();
    env(g, t, 0.35, 0.5);
    for (const [mult, type, v] of [[1, "triangle", 1], [2, "sine", 0.3], [3, "sine", 0.12]] as const) {
      const o = a.createOscillator();
      o.type = type;
      o.frequency.value = f * mult;
      const og = a.createGain();
      og.gain.value = v;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 0.6);
    }
    g.connect(musicBus);
  }

  function bass(t: number, f: number) {
    const a = ac!;
    const o = a.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = a.createGain();
    env(g, t, 0.4, 0.8);
    o.connect(g).connect(musicBus);
    o.start(t);
    o.stop(t + 0.9);
  }

  function drum(t: number, v: number) {
    const a = ac!;
    const o = a.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.18);
    const g = a.createGain();
    env(g, t, 0.9 * v, 0.3);
    o.connect(g).connect(musicBus);
    o.start(t);
    o.stop(t + 0.35);
  }

  function ching(t: number, v: number) {
    const a = ac!;
    const g = a.createGain();
    env(g, t, 0.06 * v, 0.6);
    for (const f of [2480, 3710]) {
      const o = a.createOscillator();
      o.frequency.value = f;
      o.connect(g);
      o.start(t);
      o.stop(t + 0.75);
    }
    g.connect(musicBus);
  }

  function chap(t: number) {
    const a = ac!;
    const s = a.createBufferSource();
    s.buffer = noise;
    const hp = a.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 5000;
    const g = a.createGain();
    env(g, t, 0.25, 0.05);
    s.connect(hp).connect(g).connect(musicBus);
    s.start(t, Math.random());
    s.stop(t + 0.08);
  }

  // ---------------------------------------------------------------- effects
  function play(name: SoundName, volume = 1) {
    if (!ac || muted) return;
    const a = ac;
    const t = a.currentTime + 0.01;
    const out = a.createGain();
    out.gain.value = volume;
    out.connect(fxBus);
    const tone = (f: number, type: OscillatorType, peak: number, decay: number, at = t) => {
      const o = a.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const g = a.createGain();
      env(g, at, peak, decay);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + decay + 0.05);
      return o;
    };
    const hiss = (filter: BiquadFilterType, f: number, peak: number, decay: number) => {
      const s = a.createBufferSource();
      s.buffer = noise;
      const bq = a.createBiquadFilter();
      bq.type = filter;
      bq.frequency.value = f;
      const g = a.createGain();
      env(g, t, peak, decay);
      s.connect(bq).connect(g).connect(out);
      s.start(t, Math.random());
      s.stop(t + decay + 0.05);
    };
    if (name === "firework") {
      const o = tone(90, "sine", 0.7, 0.5);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
      hiss("lowpass", 1800, 0.6, 0.9);
    } else if (name === "bell") {
      // a temple bell: low hum with long-ringing overtones
      for (const [f, v, d] of [[196, 0.5, 4], [392, 0.25, 3], [523, 0.18, 2.5], [784, 0.08, 1.6]] as const) tone(f, "sine", v, d);
    } else if (name === "splash") {
      hiss("bandpass", 900, 0.5, 0.6);
      tone(520, "sine", 0.1, 0.25);
    } else if (name === "pop") {
      hiss("highpass", 1500, 0.8, 0.12);
    } else if (name === "chime") {
      [659, 784, 988, 1319].forEach((f, i) => tone(f, "sine", 0.22, 0.9, t + i * 0.09));
    } else {
      tone(880, "triangle", 0.18, 0.25);
      tone(1175, "triangle", 0.14, 0.3, t + 0.07);
    }
  }

  /** Called every frame: the band is loud near the stage, the waves louder near the water. */
  function listen(x: number, y: number, onStage: boolean, inCabin: boolean) {
    if (!ac) return;
    const t = ac.currentTime;
    const near = onStage ? 1 : clamp(1 - Math.abs(x - stageX) / 1500, 0.12, 1);
    musicBus.gain.setTargetAtTime(0.3 * near * (inCabin ? 0.4 : 1), t, 0.3);
    crowdBus.gain.setTargetAtTime(inCabin ? 0.06 : 0.18, t, 0.5);
    wavesBus.gain.setTargetAtTime(y < 800 ? 0.3 : 0.2, t, 0.6);
  }

  return {
    start,
    play,
    listen,
    get muted() { return muted; },
    get running() { return !!ac && ac.state === "running"; },
    setMuted(m: boolean) {
      muted = m;
      try { localStorage.setItem(STORE_KEY, m ? "1" : "0"); } catch { /* ignore */ }
      if (ac) master.gain.setTargetAtTime(m ? 0 : VOLUME, ac.currentTime, 0.1);
    },
    stop() {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      ac?.close().catch(() => {});
      ac = null;
    },
  };
}
