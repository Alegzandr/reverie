import { SCENE_WORLD } from '../../../constants';

/**
 * A tempo-locked pulse to nod along with. Raw onsets are too ragged for that
 * (missed kicks, piano attacks, hi-hat rolls), so the clock listens to a few
 * seconds of kick/snare onsets, finds the period and phase that line up best
 * with them (a comb search), and runs a phase-locked clock on it. The clock
 * keeps nodding through a missing kick, fires a touch early so the motion lands
 * on the hit rather than after it, and reports how sure it is: a pulse that
 * doesn't stand out of the texture (ballads, ambient, breakdowns) fades the
 * nods out instead of guessing.
 */

export interface BeatClockFrame {
  /** True on the frame a nod should start (already led so it peaks on the beat). */
  nod: boolean;
  /** 0..1: how clearly there's a pulse to follow right now. */
  confidence: number;
  /** Seconds between nods (the beat, or every other beat at fast tempos). */
  period: number;
}

export interface BeatClock {
  /** Advance by dt seconds with the feed's current bands and overall level. */
  update(dt: number, bands: Float32Array, level: number): BeatClockFrame;
  frame: BeatClockFrame;
}

const smoothstep = (lo: number, hi: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/** Onset weight per band: kick body and snare body/crack drive a head nod; pads and hats don't. */
function onsetWeights(bands: number): Float32Array {
  const { MIN_FREQUENCY_HZ: lo, MAX_FREQUENCY_HZ: hi } = SCENE_WORLD;
  const w = new Float32Array(bands);
  for (let b = 0; b < bands; b += 1) {
    const hz = lo * Math.pow(hi / lo, (b + 0.5) / bands);
    if (hz < 140) w[b] = 1;
    else if (hz < 320) w[b] = 0.5;
    else if (hz > 1800 && hz < 7000) w[b] = 0.3;
  }
  return w;
}

export function createBeatClock(): BeatClock {
  const C = SCENE_WORLD.BEAT_CLOCK;
  const size = Math.round(C.WINDOW_SECONDS * C.RATE);
  const ring = new Float32Array(size);
  const env = new Float32Array(size);
  const weights = onsetWeights(SCENE_WORLD.BANDS);
  const prev = new Float32Array(SCENE_WORLD.BANDS);
  const prev2 = new Float32Array(SCENE_WORLD.BANDS);
  const weightSum = weights.reduce((a, w) => a + w, 0);
  const minLag = (60 / C.MAX_BPM) * C.RATE;
  const maxLag = (60 / C.MIN_BPM) * C.RATE;
  const clarityMaxLag = Math.round(C.CLARITY_MAX_LAG_SECONDS * C.RATE);

  let head = 0;
  let filled = 0;
  let sampleClock = 0;
  let sinceEstimate = 0;
  let rawConfidence = 0;

  let period: number = C.NOD_MIN_PERIOD * 1.5;
  let phase = 0;
  let locked = false;
  let pendingPeriod = 0;
  let pendingCount = 0;
  let sinceNod = Infinity;

  const frame: BeatClockFrame = { nod: false, confidence: 0, period };

  /** Envelope value `ago` samples before the newest (fractional, linear). */
  const at = (ago: number) => {
    const i = filled - 1 - ago;
    if (i < 0) return 0;
    const i0 = Math.floor(i);
    const f = i - i0;
    const a = env[i0];
    const b = i0 + 1 < filled ? env[i0 + 1] : a;
    return a + (b - a) * f;
  };

  /** Mean envelope on a comb of `lag` spacing whose newest tooth is `offset` samples back. */
  const comb = (lag: number, offset: number) => {
    let sum = 0;
    let n = 0;
    for (let ago = offset; ago < filled - 1; ago += lag) {
      sum += at(ago);
      n += 1;
    }
    return n ? sum / n : 0;
  };

  /** Best phase (samples since the newest tooth) for a lag, with its peak-over-mean contrast. */
  const bestPhase = (lag: number) => {
    let best = -1;
    let bestAt = 0;
    let total = 0;
    const steps = Math.ceil(lag);
    for (let o = 0; o < steps; o += 1) {
      const s = comb(lag, o);
      total += s;
      if (s > best) {
        best = s;
        bestAt = o;
      }
    }
    const mean = total / steps;
    return { offset: bestAt, score: best - mean };
  };

  /** Linearise the ring (oldest first), keep only what rises above its local average. */
  const prepareEnvelope = () => {
    const start = filled < size ? 0 : head;
    for (let i = 0; i < filled; i += 1) env[i] = ring[(start + i) % size];
    const half = Math.round((C.DETREND_SECONDS * C.RATE) / 2);
    // Prefix sums would allocate; the window is small, a running sum is enough.
    let sum = 0;
    let lo = 0;
    let hi = -1;
    const detrended = scratch;
    for (let i = 0; i < filled; i += 1) {
      while (hi < Math.min(filled - 1, i + half)) sum += env[++hi];
      while (lo < i - half) sum -= env[lo++];
      detrended[i] = Math.max(0, env[i] - sum / (hi - lo + 1));
    }
    env.set(detrended.subarray(0, filled));
  };
  const scratch = new Float32Array(size);

  /**
   * Pulse clarity: the envelope's normalised autocorrelation at its best beat
   * lag. The comb always finds *some* phase that lines up with sparse attacks
   * (a piano's chords, a pad's swells); only a repeating hit correlates with
   * itself a beat later. Lags run up to half a bar or so: a hip-hop groove
   * repeats per two beats more clearly than per beat.
   */
  const pulseClarity = () => {
    const start = filled < size ? 0 : head;
    let mean = 0;
    for (let i = 0; i < filled; i += 1) mean += ring[(start + i) % size];
    mean /= filled;
    let energy = 0;
    for (let i = 0; i < filled; i += 1) {
      const v = ring[(start + i) % size] - mean;
      scratch[i] = v;
      energy += v * v;
    }
    if (energy <= 0) return 0;
    let best = 0;
    for (let lag = Math.floor(minLag); lag <= clarityMaxLag; lag += 1) {
      let sum = 0;
      for (let i = lag; i < filled; i += 1) sum += scratch[i] * scratch[i - lag];
      if (sum > best) best = sum;
    }
    return best / energy;
  };

  const estimate = (level: number) => {
    prepareEnvelope();
    let bestLag = 0;
    let bestRank = -1;
    for (let lag = minLag; lag <= maxLag; lag += C.LAG_STEP) {
      const bpm = (60 * C.RATE) / lag;
      const prior = Math.exp(-0.5 * (Math.log2(bpm / C.PRIOR_BPM) / C.PRIOR_OCTAVES) ** 2);
      const { score } = bestPhase(lag);
      if (score * prior > bestRank) {
        bestRank = score * prior;
        bestLag = lag;
      }
    }
    if (!bestLag) return;
    // Refine the winner on a finer lag grid.
    let lag = bestLag;
    let fine = bestPhase(lag);
    for (let l = bestLag - C.LAG_STEP; l <= bestLag + C.LAG_STEP; l += C.LAG_STEP / 5) {
      const r = bestPhase(l);
      if (r.score > fine.score) {
        fine = r;
        lag = l;
      }
    }
    // Fast tempos nod every other beat - on whichever of the two carries the hit.
    while (lag / C.RATE < C.NOD_MIN_PERIOD) {
      lag *= 2;
      fine = bestPhase(lag);
    }
    rawConfidence = level < C.MIN_LEVEL ? 0 : smoothstep(C.CLARITY_LOW, C.CLARITY_HIGH, pulseClarity());

    const estPeriod = lag / C.RATE;
    const estPhase = fine.offset / lag;
    if (!locked || frame.confidence < C.RELOCK_CONFIDENCE) {
      period = estPeriod;
      phase = estPhase;
      locked = true;
      pendingCount = 0;
      return;
    }
    if (Math.abs(Math.log2(estPeriod / period)) < C.SAME_TEMPO_OCTAVES) {
      pendingCount = 0;
      period += (estPeriod - period) * C.PERIOD_GAIN;
      let err = estPhase - phase;
      err -= Math.round(err);
      phase += err * C.PHASE_GAIN;
      return;
    }
    // A different tempo must hold for a while before the clock jumps to it.
    if (pendingCount > 0 && Math.abs(Math.log2(estPeriod / pendingPeriod)) < C.SAME_TEMPO_OCTAVES) pendingCount += 1;
    else {
      pendingPeriod = estPeriod;
      pendingCount = 1;
    }
    if (pendingCount >= C.TEMPO_SWITCH_ESTIMATES) {
      period = estPeriod;
      phase = estPhase;
      pendingCount = 0;
    }
  };

  return {
    frame,
    update(dt, bands, level) {
      sampleClock += dt * C.RATE;
      while (sampleClock >= 1) {
        sampleClock -= 1;
        // Coincidence, not loudness: a drum hit lights up most bands at once
        // (a vertical slash on a spectrogram), a note only its own few.
        let rising = 0;
        for (let b = 0; b < bands.length; b += 1) {
          const w = weights[b];
          if (w) rising += w * Math.min(1, Math.max(0, bands[b] - prev2[b]) / C.RISE);
        }
        prev2.set(prev);
        prev.set(bands);
        const share = rising / weightSum;
        ring[head] = share * share;
        head = (head + 1) % size;
        filled = Math.min(size, filled + 1);
      }

      sinceEstimate += dt;
      if (sinceEstimate >= C.ESTIMATE_INTERVAL_SECONDS && filled >= C.MIN_HISTORY_SECONDS * C.RATE) {
        sinceEstimate = 0;
        estimate(level);
      }
      if (level < C.MIN_LEVEL) rawConfidence = 0;
      const tau = rawConfidence > frame.confidence ? C.CONFIDENCE_RISE_SECONDS : C.CONFIDENCE_FALL_SECONDS;
      frame.confidence += (rawConfidence - frame.confidence) * Math.min(1, dt / tau);

      const lead = C.NOD_LEAD_SECONDS / period;
      const before = phase + lead;
      phase += dt / period;
      sinceNod += dt;
      frame.nod = locked && Math.floor(phase + lead) > Math.floor(before) && sinceNod > period * 0.6;
      if (frame.nod) sinceNod = 0;
      phase -= Math.floor(phase);
      frame.period = period;
      return frame;
    },
  };
}
