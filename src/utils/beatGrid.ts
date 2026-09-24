import { BEAT_GRID } from '../constants';

/**
 * A track's beat grid, for the living worlds to nod along with.
 *
 * The live clock only ever hears the last few seconds, so it hesitates on
 * intros, loses the tempo in a busy mix and lags a drop. The decoded track is
 * already in memory, so it is analysed once, whole, off the main thread: the
 * percussive part of the spectrum (drums, not notes), an onset envelope from
 * it, the tempo the whole song agrees on, a beat grid that follows it (dynamic
 * programming, after Ellis 2007), and per nod a strength that says whether
 * there are drums around it to nod to - with the future in view, so a drop
 * lights up on its first hit. Times are in source-audio seconds: playback
 * rate and seeks follow for free.
 */

export interface BeatGrid {
  /** Nod times (seconds of source audio), ascending: the beat, or every other beat at fast tempos. */
  times: Float64Array;
  /** 0..1 per nod: whether the music around it carries drums to nod to. */
  strength: Float32Array;
  /** Seconds between nods. */
  period: number;
}

/** In-place iterative radix-2 FFT (re/im of length n, a power of two). */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k += 1) {
        const a = i + k;
        const b = a + half;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

const smoothstep = (lo: number, hi: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/** Median of the first `count` values of `scratch` (sorted in place). */
function median(scratch: Float32Array, count: number): number {
  const view = scratch.subarray(0, count);
  view.sort();
  return count % 2 ? view[count >> 1] : (view[(count >> 1) - 1] + view[count >> 1]) / 2;
}

/** Decimation factor: the track is analysed near ANALYSIS_RATE_HZ. */
const factorOf = (sampleRate: number) => Math.max(1, Math.floor(sampleRate / BEAT_GRID.ANALYSIS_RATE_HZ));

export interface OnsetEnvelope {
  /** Drum-hit envelope at ENV_RATE: squared share of the drum bands rising together. */
  env: Float32Array;
  /** Frame loudness (dB, relative to full scale). */
  loud: Float32Array;
  /** Per frame: the drum bands' percussive power (linear) - how loud the drums actually are. */
  percPower: Float32Array;
  /** Per frame: the drum bands' total power (linear); percPower / drumPower is how percussive they are. */
  drumPower: Float32Array;
}

/**
 * The drum-hit envelope. First the spectrogram is split into its harmonic and
 * percussive parts (median filtering: a held note is a horizontal line,
 * smoothed away along time; a hit is a vertical slash, smoothed away across
 * bands), so a piano's chords, a rapped line or a rolling bass don't read as a
 * groove. Then, on the percussive part only: coincidence, not loudness - a kick
 * or a snare lights up most of its bands at once.
 */
export function onsetEnvelope(mono: Float32Array, sampleRate: number): OnsetEnvelope {
  const G = BEAT_GRID;
  // Work near 22 kHz: everything the drum bands need, half the FFT work.
  const factor = factorOf(sampleRate);
  const rate = sampleRate / factor;
  const n = G.FFT_SIZE;
  const frames = Math.max(0, Math.floor(((mono.length / factor - n) / rate) * G.ENV_RATE));
  const B = G.BANDS;

  const edges = Array.from({ length: B + 1 }, (_, i) => G.MIN_HZ * Math.pow(G.MAX_HZ / G.MIN_HZ, i / B));
  const hzPerBin = rate / n;
  const lo = new Int32Array(B);
  const hi = new Int32Array(B);
  // Kick body, snare body and snare crack drive a head nod; pads and hats don't.
  const weight = new Float32Array(B);
  for (let b = 0; b < B; b += 1) {
    lo[b] = Math.max(1, Math.floor(edges[b] / hzPerBin));
    hi[b] = Math.max(lo[b] + 1, Math.ceil(edges[b + 1] / hzPerBin));
    const centre = Math.sqrt(edges[b] * edges[b + 1]);
    weight[b] = centre < 140 ? 1 : centre < 320 ? 0.5 : centre > 1800 && centre < 7000 ? 0.3 : 0;
  }
  const weightSum = weight.reduce((a, w) => a + w, 0);

  // 1. Band power spectrogram (frames x bands, row-major).
  const window = new Float32Array(n);
  for (let i = 0; i < n; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  const power = new Float32Array(frames * B);
  const loud = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    const start = Math.round((f / G.ENV_RATE) * rate);
    for (let i = 0; i < n; i += 1) {
      // Decimate by averaging (a crude low-pass is plenty for band energies).
      let s = 0;
      const at = (start + i) * factor;
      for (let k = 0; k < factor; k += 1) s += mono[at + k] ?? 0;
      re[i] = (s / factor) * window[i];
      im[i] = 0;
    }
    fft(re, im);
    let total = 0;
    for (let b = 0; b < B; b += 1) {
      let p = 0;
      for (let k = lo[b]; k < hi[b]; k += 1) p += re[k] * re[k] + im[k] * im[k];
      total += p;
      power[f * B + b] = p / (hi[b] - lo[b]) / (n * n);
    }
    loud[f] = 10 * Math.log10(total / (n * n) + 1e-12);
  }

  // 2. Harmonic/percussive split: a soft (Wiener) mask from the two medians.
  const hHalf = G.HARMONIC_MEDIAN_FRAMES >> 1;
  const pHalf = G.PERCUSSIVE_MEDIAN_BANDS >> 1;
  const scratch = new Float32Array(Math.max(G.HARMONIC_MEDIAN_FRAMES, G.PERCUSSIVE_MEDIAN_BANDS));
  const percDb = new Float32Array(frames * B);
  const percPower = new Float32Array(frames);
  const drumPower = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let percEnergy = 0;
    let drumEnergy = 0;
    for (let b = 0; b < B; b += 1) {
      let c = 0;
      for (let t = Math.max(0, f - hHalf); t <= Math.min(frames - 1, f + hHalf); t += 1) scratch[c++] = power[t * B + b];
      const harmonic = median(scratch, c);
      c = 0;
      for (let k = Math.max(0, b - pHalf); k <= Math.min(B - 1, b + pHalf); k += 1) scratch[c++] = power[f * B + k];
      const percussive = median(scratch, c);
      const v = power[f * B + b];
      const mask = (percussive * percussive) / (percussive * percussive + harmonic * harmonic + 1e-30);
      percDb[f * B + b] = 10 * Math.log10(v * mask + 1e-12);
      percEnergy += weight[b] * v * mask;
      drumEnergy += weight[b] * v;
    }
    percPower[f] = percEnergy;
    drumPower[f] = drumEnergy;
  }

  // 3. Coincidence of rises on the percussive part.
  const env = new Float32Array(frames);
  const lag = G.RISE_FRAMES;
  for (let f = lag; f < frames; f += 1) {
    let rising = 0;
    for (let b = 0; b < B; b += 1) {
      if (!weight[b]) continue;
      rising += weight[b] * Math.min(1, Math.max(0, percDb[f * B + b] - percDb[(f - lag) * B + b]) / G.RISE_DB);
    }
    const share = rising / weightSum;
    env[f] = share * share;
  }
  return { env, loud, percPower, drumPower };
}

/** Normalised autocorrelation of env at `lag` (mean removed). */
function autocorr(env: Float32Array, lag: number, mean: number, energy: number): number {
  let sum = 0;
  for (let i = lag; i < env.length; i += 1) sum += (env[i] - mean) * (env[i - lag] - mean);
  return energy > 0 ? sum / energy : 0;
}

/** The track's beat period in envelope frames: the tempo the whole song agrees on. */
export function estimatePeriod(env: Float32Array): number {
  const G = BEAT_GRID;
  let mean = 0;
  for (let i = 0; i < env.length; i += 1) mean += env[i];
  mean /= Math.max(1, env.length);
  let energy = 0;
  for (let i = 0; i < env.length; i += 1) energy += (env[i] - mean) ** 2;
  const minLag = Math.floor((60 / G.MAX_BPM) * G.ENV_RATE);
  const maxLag = Math.ceil((60 / G.MIN_BPM) * G.ENV_RATE);
  const top = maxLag * G.METER_MULTIPLES[G.METER_MULTIPLES.length - 1] + 2;
  const acf = new Float32Array(top + 1);
  for (let lag = minLag - 1; lag <= Math.min(top, env.length - 1); lag += 1) acf[lag] = autocorr(env, lag, mean, energy);
  // A real beat also lines up two and four beats on (half a bar, a bar); a
  // syncopated kick's cross-rhythm (1.5 beats in drum and bass) doesn't.
  const metrical = (lag: number) => {
    let sum = acf[lag];
    for (let m = 0; m < G.METER_MULTIPLES.length; m += 1) {
      const at = Math.round(lag * G.METER_MULTIPLES[m]);
      sum += G.METER_WEIGHTS[m] * Math.max(acf[at - 1], acf[at], acf[at + 1]);
    }
    return sum;
  };
  let best = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    const bpm = (60 * G.ENV_RATE) / lag;
    const prior = Math.exp(-0.5 * (Math.log2(bpm / G.PRIOR_BPM) / G.PRIOR_OCTAVES) ** 2);
    const score = metrical(lag) * prior;
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  // Parabolic refinement: the true period rarely sits on a whole frame.
  const a = acf[best - 1];
  const b = acf[best];
  const c = acf[best + 1];
  const d = a - 2 * b + c;
  return d < 0 ? best + (0.5 * (a - c)) / d : best;
}

/**
 * Beat frames by dynamic programming: each beat is an onset whose distance to
 * the previous one stays close to the period (a log-squared penalty), so the
 * grid rides the hits and holds its pace through gaps and fills.
 */
export function trackBeats(env: Float32Array, period: number): number[] {
  const G = BEAT_GRID;
  const n = env.length;
  if (n === 0 || period <= 0) return [];
  let mean = 0;
  for (let i = 0; i < n; i += 1) mean += env[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i += 1) variance += (env[i] - mean) ** 2;
  const std = Math.sqrt(variance / n) || 1;
  const score = new Float32Array(n);
  const back = new Int32Array(n).fill(-1);
  const near = Math.round(period / 2);
  const far = Math.round(period * 2);
  for (let t = 0; t < n; t += 1) {
    let best = -Infinity;
    let from = -1;
    for (let tau = Math.max(0, t - far); tau <= t - near; tau += 1) {
      const v = score[tau] - G.TIGHTNESS * Math.log((t - tau) / period) ** 2;
      if (v > best) {
        best = v;
        from = tau;
      }
    }
    score[t] = env[t] / std + (from >= 0 ? best : 0);
    back[t] = from;
  }
  let end = n - 1;
  for (let t = Math.max(0, n - Math.round(period)); t < n; t += 1) if (score[t] > score[end]) end = t;
  const beats: number[] = [];
  for (let t = end; t >= 0; t = back[t]) beats.push(t);
  return beats.reverse();
}

/** Full analysis: mono PCM in, nod grid out. */
export function analyzeBeatGrid(mono: Float32Array, sampleRate: number): BeatGrid {
  const G = BEAT_GRID;
  const { env, loud, percPower, drumPower } = onsetEnvelope(mono, sampleRate);
  if (env.length < G.ENV_RATE * 2) return { times: new Float64Array(0), strength: new Float32Array(0), period: 0 };
  const period = estimatePeriod(env);
  let beats = trackBeats(env, period);

  // Peak onset near each beat (the hit may land a frame or two off the grid).
  const hitAt = (frame: number) => {
    let m = 0;
    for (let i = Math.max(0, frame - 3); i <= Math.min(env.length - 1, frame + 3); i += 1) m = Math.max(m, env[i]);
    return m;
  };

  // Fast tempos nod every other beat - on whichever of the pair carries the
  // hit, decided locally so a section change can switch it.
  let nodPeriod = period;
  if (period / G.ENV_RATE < G.NOD_MIN_PERIOD && beats.length > 2) {
    nodPeriod = period * 2;
    const beatHits = beats.map(hitAt);
    const kept: number[] = [];
    let lastKept = -2;
    for (let i = 0; i < beats.length; i += 1) {
      let same = 0;
      let other = 0;
      for (let j = Math.max(0, i - G.PARITY_BEATS); j <= Math.min(beats.length - 1, i + G.PARITY_BEATS); j += 1) {
        if ((j - i) % 2 === 0) same += beatHits[j];
        else other += beatHits[j];
      }
      if (same >= other && i - lastKept >= 2) {
        kept.push(beats[i]);
        lastKept = i;
      }
    }
    beats = kept;
  }

  // Strength: how percussive the music around each nod is (drums, not a piano
  // or a pad), gated by the hits actually being there - a drop that stops dead
  // stops the nods on the spot - and by the drums being as loud as they are in
  // the rest of the song (coincidence and share are ratios: in a near-empty
  // breakdown, leftovers would read as hits).
  let loudMax = -Infinity;
  for (let i = 0; i < loud.length; i += 1) loudMax = Math.max(loudMax, loud[i]);
  // The mean, not a median: hits are brief, most frames even in a groove are between them.
  let drumSum = 0;
  let drumFrames = 0;
  for (let i = 0; i < loud.length; i += 1) {
    if (loud[i] <= loudMax - G.SILENCE_DB) continue;
    drumSum += percPower[i];
    drumFrames += 1;
  }
  const typicalDrums = drumSum / Math.max(1, drumFrames) || 1e-12;
  const hits = beats.map(hitAt);
  const sortedHits = [...hits].sort((a, b) => a - b);
  const typicalHit = sortedHits[Math.floor(sortedHits.length * 0.75)] || 1;
  const half = Math.round(G.DRUM_WINDOW_SECONDS * G.ENV_RATE);
  const raw = new Float32Array(beats.length);
  for (let i = 0; i < beats.length; i += 1) {
    const from = Math.max(0, beats[i] - half);
    const to = Math.min(percPower.length, beats[i] + half + 1);
    let drums = 0;
    let total = 0;
    for (let k = from; k < to; k += 1) {
      drums += percPower[k];
      total += drumPower[k];
    }
    // A ratio of sums: silent frames between hits weigh nothing either way.
    const share = total > 0 ? drums / total : 0;
    drums /= Math.max(1, to - from) * typicalDrums;
    const present = Math.max(hits[i - 1] ?? 0, hits[i], hits[i + 1] ?? 0) / typicalHit;
    const audible = loud[beats[i]] > loudMax - G.SILENCE_DB ? 1 : 0;
    // The amount: a light verse nods softer than the drop (drum level on a log scale).
    const weight = Math.log10(Math.max(drums, 1e-6));
    const accent = G.ACCENT_FLOOR + (1 - G.ACCENT_FLOOR) * smoothstep(Math.log10(G.ACCENT_LEVEL_LOW), Math.log10(G.ACCENT_LEVEL_HIGH), weight);
    raw[i] =
      smoothstep(G.DRUMS_LOW, G.DRUMS_HIGH, share) *
      smoothstep(G.DRUM_LEVEL_LOW, G.DRUM_LEVEL_HIGH, drums) *
      smoothstep(G.PRESENCE_LOW, G.PRESENCE_HIGH, present) *
      accent *
      audible;
  }
  // A 3-tap median: one odd beat neither flickers a section on nor off.
  const strength = new Float32Array(beats.length);
  for (let i = 0; i < beats.length; i += 1) {
    const a = raw[Math.max(0, i - 1)];
    const b = raw[i];
    const c = raw[Math.min(beats.length - 1, i + 1)];
    strength[i] = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
  }
  // Frames are stamped where their window starts and a hit registers as it
  // enters the window: measured on real tracks, that lands within a few ms of
  // the attack - no offset needed.
  return {
    times: Float64Array.from(beats, (f) => f / G.ENV_RATE),
    strength,
    period: nodPeriod / G.ENV_RATE,
  };
}
