import { SCENE_WORLD } from '../../../constants';

/**
 * Turns the live playback into what the worlds feed on: 64 log-spaced,
 * auto-gained spectrum bands (a history ring the shaders sample by "seconds
 * ago"), smoothed level/bass/mid/treble energies, and kick onsets.
 *
 * The playback analyser is tuned for the UI meters (256-point FFT - ~170 Hz per
 * bin, so the whole low end is one bin). The worlds tee a finer 2048-point
 * analyser off it: an AnalyserNode passes its input through, so chaining one
 * more costs nothing and leaves every existing meter exactly as it was. The
 * playback graph is rebuilt on every play/seek, so the tee re-attaches whenever
 * the upstream node changes.
 */

export interface AudioFrame {
  level: number;
  bass: number;
  mid: number;
  treble: number;
  /** 0..1, eases in while music is actually flowing (analyser live). */
  playing: number;
  /** Seconds since each of the last four kicks (large when none). */
  kicks: [number, number, number, number];
}

const NO_KICK = 1e3;

export interface AudioFeed {
  /** Advance by dt seconds; returns true when the history texture has new rows. */
  update(dt: number): boolean;
  frame: AudioFrame;
  /** R8 history (BANDS × HISTORY_ROWS), row-major; rows written ring-style. */
  history: Uint8Array;
  /** Index of the newest written row. */
  head: number;
  /** 0..1 progress toward the next row - lets shaders scroll smoothly between rows. */
  headFraction: number;
  /** Rows written since the last `consumeDirty` (to upload only what changed). */
  consumeDirty(): number[];
  dispose(): void;
}

const bandEdges = (() => {
  const { BANDS, MIN_FREQUENCY_HZ: lo, MAX_FREQUENCY_HZ: hi } = SCENE_WORLD;
  return Array.from({ length: BANDS + 1 }, (_, i) => lo * Math.pow(hi / lo, i / BANDS));
})();

export function createAudioFeed(getAnalyser: () => AnalyserNode | null): AudioFeed {
  const { BANDS, HISTORY_ROWS, HISTORY_RATE } = SCENE_WORLD;
  const history = new Uint8Array(BANDS * HISTORY_ROWS);
  const bands = new Float32Array(BANDS);
  let bins: Uint8Array<ArrayBuffer> | null = null;

  let upstream: AnalyserNode | null = null;
  let tee: AnalyserNode | null = null;
  let peak: number = SCENE_WORLD.PEAK_FLOOR;
  let bassBaseline = 0;
  let sinceKick = NO_KICK;
  let rowClock = 0;
  const dirty: number[] = [];

  const frame: AudioFrame = { level: 0, bass: 0, mid: 0, treble: 0, playing: 0, kicks: [NO_KICK, NO_KICK, NO_KICK, NO_KICK] };
  const feed = { head: 0, headFraction: 0 };

  const attach = (node: AnalyserNode | null) => {
    if (node === upstream) return;
    if (upstream && tee) {
      try {
        upstream.disconnect(tee);
      } catch {
        // Already torn down with its graph.
      }
    }
    upstream = node;
    if (!node) return;
    try {
      if (!tee || tee.context !== node.context) {
        tee = node.context.createAnalyser();
        tee.fftSize = SCENE_WORLD.FFT_SIZE;
        tee.smoothingTimeConstant = SCENE_WORLD.ANALYSER_SMOOTHING;
        tee.minDecibels = SCENE_WORLD.ANALYSER_MIN_DB;
        tee.maxDecibels = SCENE_WORLD.ANALYSER_MAX_DB;
      }
      node.connect(tee);
    } catch {
      tee = null;
    }
  };

  const readBands = (): boolean => {
    const analyser = tee;
    if (!analyser || !upstream) return false;
    const n = analyser.frequencyBinCount;
    if (!bins || bins.length !== n) bins = new Uint8Array(new ArrayBuffer(n));
    analyser.getByteFrequencyData(bins);
    const hzPerBin = analyser.context.sampleRate / analyser.fftSize;
    const floor = SCENE_WORLD.BAND_FLOOR;
    let frameMax = 0;
    for (let b = 0; b < BANDS; b += 1) {
      const lo = bandEdges[b] / hzPerBin;
      const hi = bandEdges[b + 1] / hzPerBin;
      let v: number;
      if (hi - lo < 1.5) {
        // Narrower than a bin (the low end): interpolate at the band centre.
        const c = Math.min(n - 1.001, (lo + hi) * 0.5);
        const i = Math.floor(c);
        v = bins[i] + (bins[i + 1] - bins[i]) * (c - i);
      } else {
        let sum = 0;
        let max = 0;
        const from = Math.floor(lo);
        const to = Math.min(n, Math.ceil(hi));
        for (let i = from; i < to; i += 1) {
          sum += bins[i];
          if (bins[i] > max) max = bins[i];
        }
        v = max * 0.6 + (sum / Math.max(1, to - from)) * 0.4;
      }
      const shaped = Math.max(0, (v / 255 - floor) / (1 - floor)) * (1 + (SCENE_WORLD.BAND_TILT * b) / (BANDS - 1));
      bands[b] = shaped;
      if (shaped > frameMax) frameMax = shaped;
    }
    peak = Math.max(SCENE_WORLD.PEAK_FLOOR, frameMax, peak * SCENE_WORLD.PEAK_DECAY);
    for (let b = 0; b < BANDS; b += 1) bands[b] = Math.min(1, Math.pow(bands[b] / peak, 1.35));
    return true;
  };

  const avg = (from: number, to: number) => {
    let s = 0;
    for (let i = from; i < to; i += 1) s += bands[i];
    return s / (to - from);
  };

  const ease = (current: number, target: number, attack: number, release: number) =>
    current + (target - current) * (target > current ? attack : release);

  return {
    frame,
    history,
    get head() {
      return feed.head;
    },
    get headFraction() {
      return feed.headFraction;
    },
    update(dt: number) {
      attach(getAnalyser());
      const live = readBands();
      if (!live) for (let b = 0; b < BANDS; b += 1) bands[b] *= 0.9;

      const k = Math.min(1, dt * 60);
      frame.playing = ease(frame.playing, live ? 1 : 0, 0.05 * k, 0.03 * k);
      frame.level = ease(frame.level, avg(0, BANDS), 0.5 * k, 0.12 * k);
      const bassNow = avg(0, 10);
      frame.bass = ease(frame.bass, bassNow, 0.55 * k, 0.16 * k);
      frame.mid = ease(frame.mid, avg(10, 38), 0.45 * k, 0.16 * k);
      frame.treble = ease(frame.treble, avg(38, BANDS), 0.5 * k, 0.2 * k);

      // Kicks: bass jumping above its own slow baseline.
      bassBaseline += (bassNow - bassBaseline) * 0.06 * k;
      sinceKick += dt;
      for (let i = 0; i < 4; i += 1) frame.kicks[i] = Math.min(NO_KICK, frame.kicks[i] + dt);
      if (live && sinceKick > SCENE_WORLD.KICK_MIN_GAP_SECONDS && bassNow > bassBaseline * SCENE_WORLD.KICK_RATIO + SCENE_WORLD.KICK_OFFSET) {
        sinceKick = 0;
        frame.kicks.pop();
        frame.kicks.unshift(0);
      }

      // History rows at a fixed rate, whatever the display refresh.
      rowClock += dt * HISTORY_RATE;
      let wrote = false;
      while (rowClock >= 1) {
        rowClock -= 1;
        feed.head = (feed.head + 1) % HISTORY_ROWS;
        const base = feed.head * BANDS;
        for (let b = 0; b < BANDS; b += 1) history[base + b] = Math.round(bands[b] * 255);
        dirty.push(feed.head);
        wrote = true;
      }
      feed.headFraction = rowClock;
      return wrote;
    },
    consumeDirty() {
      return dirty.splice(0, dirty.length);
    },
    dispose() {
      attach(null);
      tee = null;
    },
  };
}
