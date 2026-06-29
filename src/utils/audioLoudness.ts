/**
 * Per-track loudness measurement for calibrating reactive visuals.
 *
 * The "breathe with the music" engine reads a live analyser, but raw analyser
 * energy depends on how a track was mastered: a quiet, dynamic recording barely
 * moves the visuals while a hot, brick-walled master pins them. Measuring each
 * track once gives the engine a per-song reference so it can scale intensity to
 * the music instead of to the mastering.
 *
 * Two figures are measured in a single pass:
 *   - peak: the loudest instant (linear, max dBFS) - the available headroom.
 *   - rms:  a gated integrated loudness (LUFS-style), i.e. how loud the track
 *           actually *feels*, ignoring silent intros/outros and gaps.
 *
 * Peak alone only fixes the quiet case (lift a low master); the gated RMS is what
 * lets a hot master be pulled back too, so intensity reads evenly across tracks.
 */

export interface LoudnessProfile {
  /** Peak sample amplitude across all channels (linear, 0..1) = max dBFS. */
  peak: number;
  /** Gated integrated loudness (linear RMS, 0..1) - perceived overall loudness. */
  rms: number;
}

// Cache per AudioBuffer so a track is scanned once, even across replays/seeks
// (every play re-attaches the same buffer object). A WeakMap lets the buffer and
// its measurement be garbage-collected together when the track is dropped.
const cache = new WeakMap<AudioBuffer, LoudnessProfile>();

// Loudness is integrated over short windows, then windows quieter than an absolute
// gate are dropped before averaging - the same idea as the LUFS silence gate, so a
// long fade-out or a quiet intro doesn't drag the measured loudness down and over-
// boost the visuals.
const WINDOW_SECONDS = 0.05; // 50 ms blocks
const SILENCE_GATE = 0.003; // ~ -50 dBFS; below this a window is "silent"
const EPSILON = 0.0001; // floor so silence never yields exactly 0

/**
 * Measure a track's peak and gated integrated loudness in one pass. Scanned in
 * full once and cached; a single sweep over the channel data is a few milliseconds
 * even for a multi-minute stereo track, and peak detection can't use a stride
 * without risking missing the transient that defines the peak.
 */
export function getBufferLoudness(buffer: AudioBuffer): LoudnessProfile {
  const cached = cache.get(buffer);
  if (cached !== undefined) return cached;

  const channelCount = buffer.numberOfChannels;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < channelCount; ch++) channels.push(buffer.getChannelData(ch));

  const length = buffer.length;
  const windowSize = Math.max(1, Math.floor((buffer.sampleRate || 44100) * WINDOW_SECONDS));

  let peak = 0;
  // Gated accumulation: sum of squares (and sample count) over windows loud enough
  // to clear the silence gate, plus an ungated fallback for fully-silent material.
  let gatedSumSq = 0;
  let gatedCount = 0;
  let totalSumSq = 0;
  let totalCount = 0;

  for (let start = 0; start < length; start += windowSize) {
    const end = Math.min(start + windowSize, length);
    let winSumSq = 0;
    let winCount = 0;
    for (let i = start; i < end; i++) {
      for (let ch = 0; ch < channelCount; ch++) {
        const v = channels[ch][i];
        const a = v < 0 ? -v : v;
        if (a > peak) peak = a;
        winSumSq += v * v;
        winCount++;
      }
    }
    if (winCount === 0) continue;
    totalSumSq += winSumSq;
    totalCount += winCount;
    // Window passes the gate only if its own RMS clears the silence threshold.
    if (Math.sqrt(winSumSq / winCount) > SILENCE_GATE) {
      gatedSumSq += winSumSq;
      gatedCount += winCount;
    }
  }

  // Prefer the gated loudness; if every window was silent, fall back to the ungated
  // average so a faint track still gets a real (small) reference rather than zero.
  const rms =
    gatedCount > 0
      ? Math.sqrt(gatedSumSq / gatedCount)
      : totalCount > 0
        ? Math.sqrt(totalSumSq / totalCount)
        : 0;

  const profile: LoudnessProfile = {
    peak: Math.min(1, Math.max(peak, EPSILON)),
    rms: Math.min(1, Math.max(rms, EPSILON)),
  };
  cache.set(buffer, profile);
  return profile;
}
