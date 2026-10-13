import { AUDIO_EFFECTS } from '../constants';
import { computeEffectParams, HIGHPASS_BYPASS_HZ } from './dsp';
import { getReverbImpulse, getEightDBedImpulse } from './impulse';
import type { AudioProcessingOptions } from './audioProcessor';

/**
 * The effect graph, shared by both engines.
 *
 * Live playback wires the four effects (speed, slow + reverb, 8D, bass boost) as
 * persistent nodes so their parameters can be ramped smoothly while the track
 * plays; the graph is rebuilt per playback (sources and oscillators are one-shot),
 * then `applyEffectOptions` sets or ramps every parameter. The offline export
 * builds this very chain in its OfflineAudioContext (without the listening EQ)
 * and applies the same options once, so the two cannot drift apart.
 *
 * Signal path:
 *   source -> highpass -> lowshelf -> peaking -> underwater lowpass
 *          -> (dry + convolver/wet) -> mix
 *          -> eq[0..5] -> stereo panner -> pannedGain -> out -> [caller's volume gain] -> destination
 * 8D motion: oscillator -> panDepth gain -> panner.pan
 * 8D bed:    mix -> eightDConvolver -> eightDBed -> out  (un-panned, constant)
 *
 * The 8D bed taps the pre-pan mix and bypasses the panner, so a quiet reverb
 * ambience stays in both ears while the dry signal orbits. Without it, the panner
 * sweeps the whole signal and a complete silence rotates opposite the music.
 */
export interface EffectChain {
  input: AudioNode;
  output: AudioNode;
  highpass: BiquadFilterNode;
  lowshelf: BiquadFilterNode;
  peak: BiquadFilterNode;
  /** Underwater muffle lowpass (bass-boost mode) + its slow cutoff-wobble LFO. */
  underwaterLowpass: BiquadFilterNode;
  underwaterLfo: OscillatorNode;
  underwaterDepth: GainNode;
  dryGain: GainNode;
  wetGain: GainNode;
  convolver: ConvolverNode;
  mix: GainNode;
  /** 6-band listening EQ (peaking/shelf), in canonical band order. Empty offline. */
  eq: BiquadFilterNode[];
  panner: StereoPannerNode;
  /** Level of the orbiting signal (the 8D dry share). */
  pannedGain: GainNode;
  panDepth: GainNode;
  osc: OscillatorNode;
  eightDConvolver: ConvolverNode;
  eightDBed: GainNode;
  out: GainNode;
  /**
   * Live routing flags: each convolver's INPUT is attached only while its effect
   * is audible, so no convolution runs during plain playback (the 3 s reverb IR
   * is by far the graph's most expensive node). Detaching only the input is
   * click-free by construction: the convolver keeps ringing out its stored tail
   * through the (ramped-down) wet gain, and on re-attach the wet signal builds
   * back up through the IR - the output never jumps.
   */
  reverbRouted: boolean;
  bedRouted: boolean;
}

/** Smooth-transition time constant (~150 ms perceived), DAW-like, no zipper noise. */
const RAMP_TIME_CONSTANT = 0.04;
interface EffectChainConfig {
  /**
   * Include the 6-band listening EQ. Off for the export: the EQ shapes playback
   * only and must never be baked into a file.
   */
  listeningEq?: boolean;
}

export function createEffectChain(ctx: BaseAudioContext, { listeningEq = true }: EffectChainConfig = {}): EffectChain {
  // Filters start at their bypass settings; applyEffectOptions sets the real values.
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = HIGHPASS_BYPASS_HZ;
  highpass.Q.value = AUDIO_EFFECTS.BASS_BOOST.HIGHPASS_Q;

  const lowshelf = ctx.createBiquadFilter();
  lowshelf.type = 'lowshelf';
  lowshelf.frequency.value = AUDIO_EFFECTS.BASS_BOOST.LOWSHELF_FREQUENCY_HZ;

  const peak = ctx.createBiquadFilter();
  peak.type = 'peaking';
  peak.frequency.value = AUDIO_EFFECTS.BASS_BOOST.PEAKING_FREQUENCY_HZ;
  peak.Q.value = AUDIO_EFFECTS.BASS_BOOST.PEAKING_Q;

  // Underwater muffle: starts wide open (Nyquist, an exact bypass) and its cutoff is
  // ramped down live as the amount rises. The LFO adds a slow swell to the cutoff;
  // its depth is 0 until the effect is dialled in, so the filter is inaudible at rest.
  const underwaterLowpass = ctx.createBiquadFilter();
  underwaterLowpass.type = 'lowpass';
  underwaterLowpass.frequency.value = ctx.sampleRate / 2;
  underwaterLowpass.Q.value = AUDIO_EFFECTS.BASS_BOOST.UNDERWATER_Q;
  const underwaterLfo = ctx.createOscillator();
  underwaterLfo.type = 'sine';
  underwaterLfo.frequency.value = AUDIO_EFFECTS.BASS_BOOST.UNDERWATER_LFO_FREQUENCY_HZ;
  const underwaterDepth = ctx.createGain();
  underwaterDepth.gain.value = 0;

  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  // Impulses are assigned on first attach (applyEffectOptions), not here: the
  // chain is rebuilt on every play/seek/advance, and each assignment makes the
  // browser FFT-partition the IR synchronously - for effects that are mostly off.
  const convolver = ctx.createConvolver();
  const mix = ctx.createGain();

  // Listening EQ: one biquad per band, chained in series. Starts flat (0 dB) so
  // it's transparent until the user dials in a preset. Never part of the export.
  const eq = (listeningEq ? AUDIO_EFFECTS.EQUALIZER.BANDS : []).map((band) => {
    const filter = ctx.createBiquadFilter();
    filter.type = band.type;
    filter.frequency.value = band.frequencyHz;
    if (band.type === 'peaking') filter.Q.value = AUDIO_EFFECTS.EQUALIZER.PEAKING_Q;
    filter.gain.value = 0;
    return filter;
  });

  const panner = ctx.createStereoPanner();
  // A mono input would take the mono equal-power law (-3 dB per side at
  // centre); upmixing to stereo first keeps a mono track at unity.
  panner.channelCount = 2;
  panner.channelCountMode = 'explicit';
  const pannedGain = ctx.createGain();
  const panDepth = ctx.createGain();
  const osc = ctx.createOscillator();
  osc.type = 'sine';

  const eightDConvolver = ctx.createConvolver();
  const eightDBed = ctx.createGain();
  eightDBed.gain.value = 0;
  const out = ctx.createGain();

  highpass.connect(lowshelf);
  lowshelf.connect(peak);
  peak.connect(underwaterLowpass);
  underwaterLowpass.connect(dryGain);
  // The convolver's input is NOT wired here: applyEffectOptions attaches it on
  // demand (reverbRouted), so a clean playback never pays for convolution.
  convolver.connect(wetGain);
  underwaterLfo.connect(underwaterDepth);
  underwaterDepth.connect(underwaterLowpass.frequency);
  underwaterLfo.start();
  dryGain.connect(mix);
  wetGain.connect(mix);
  // mix -> eq[0] -> eq[1] -> ... -> eq[last] -> panner
  const eqTail = eq.reduce<AudioNode>((prev, filter) => {
    prev.connect(filter);
    return filter;
  }, mix);
  eqTail.connect(panner);
  panner.connect(pannedGain);
  pannedGain.connect(out);

  // 8D ambience bed: a constant, un-panned reverb tapped from the pre-pan mix so
  // both ears keep a quiet presence while the dry signal orbits via the panner.
  // Like the reverb convolver, its input (mix -> eightDConvolver) is attached on
  // demand by applyEffectOptions (bedRouted).
  eightDConvolver.connect(eightDBed);
  eightDBed.connect(out);

  osc.connect(panDepth);
  panDepth.connect(panner.pan);
  osc.start();

  return { input: highpass, output: out, highpass, lowshelf, peak, underwaterLowpass, underwaterLfo, underwaterDepth, dryGain, wetGain, convolver, mix, eq, panner, pannedGain, panDepth, osc, eightDConvolver, eightDBed, out, reverbRouted: false, bedRouted: false };
}

function setParam(param: AudioParam, value: number, ctx: BaseAudioContext, ramp: boolean) {
  if (ramp && typeof param.setTargetAtTime === 'function') {
    param.setTargetAtTime(value, ctx.currentTime, RAMP_TIME_CONSTANT);
  } else {
    param.value = value;
  }
}

/**
 * Apply effect options to a chain. With `ramp`, parameters glide to their new
 * values; without it (at playback start, or before an offline render) they are
 * set instantly. Speed lives on the source node and is handled by the caller.
 */
export function applyEffectOptions(
  chain: EffectChain,
  options: AudioProcessingOptions,
  ctx: BaseAudioContext,
  ramp: boolean,
) {
  const params = computeEffectParams(options, ctx.sampleRate);
  const { eightD } = params;

  // Attach/detach the convolver inputs so convolution only ever runs while its
  // effect is audible. Attach happens before the gain ramps up (the wet signal
  // builds through the IR); detach lets the stored tail ring out through the
  // ramped-down wet gain - both directions are click-free.
  const { reverbAudible } = params;
  if (reverbAudible !== chain.reverbRouted) {
    chain.reverbRouted = reverbAudible;
    if (reverbAudible) {
      // Kept once set, so a later detach still rings the tail out.
      if (!chain.convolver.buffer) {
        chain.convolver.buffer = getReverbImpulse(ctx);
      }
      chain.underwaterLowpass.connect(chain.convolver);
    } else {
      try {
        chain.underwaterLowpass.disconnect(chain.convolver);
      } catch {
        // already detached
      }
    }
  }
  if (eightD !== chain.bedRouted) {
    chain.bedRouted = eightD;
    if (eightD) {
      if (!chain.eightDConvolver.buffer) chain.eightDConvolver.buffer = getEightDBedImpulse(ctx);
      chain.mix.connect(chain.eightDConvolver);
    } else {
      try {
        chain.mix.disconnect(chain.eightDConvolver);
      } catch {
        // already detached
      }
    }
  }
  // Reverb makeup restores the loudness lost to the dry/wet crossfade; the bass
  // trim claws back the headroom the low shelf adds. Both fold into the dry/wet
  // gains (the bass filters sit before the split, so scaling dry and wet equally
  // is the same as trimming the bass-stage output) - this keeps live playback at
  // the same loudness as the offline export, which applies the identical factors.
  // (computeEffectParams folds both factors into dryGain/wetGain.)
  setParam(chain.dryGain.gain, params.dryGain, ctx, ramp);
  setParam(chain.wetGain.gain, params.wetGain, ctx, ramp);

  // Outside bass-boost mode the highpass sits at its bypass frequency, so the
  // 40 Hz rumble cut only colours the sound when the user picked the effect.
  setParam(chain.highpass.frequency, params.highpassHz, ctx, ramp);
  setParam(chain.lowshelf.gain, params.lowshelfGainDb, ctx, ramp);
  setParam(chain.peak.gain, params.peakGainDb, ctx, ramp);

  // Underwater muffle: only active within bass-boost mode. Cutoff closes as the
  // amount grows; the LFO depth scales with it, so both reach zero effect at 0.
  setParam(chain.underwaterLowpass.frequency, params.lowpassHz, ctx, ramp);
  setParam(chain.underwaterDepth.gain, params.lowpassLfoDepthHz, ctx, ramp);

  setParam(chain.panDepth.gain, params.panDepth, ctx, ramp);
  setParam(chain.panner.pan, 0, ctx, ramp);
  setParam(chain.pannedGain.gain, params.pannedGain, ctx, ramp);
  // Constant ambience bed keeps both ears filled while the dry signal orbits.
  setParam(chain.eightDBed.gain, params.bedGain, ctx, ramp);
  setParam(chain.osc.frequency, params.rotationHz, ctx, ramp);
}

/**
 * Apply the listening-EQ gains to the live chain. Gains are dB per band, in the
 * canonical band order; missing bands fall back to 0 dB. With `ramp`, each band
 * glides to its new gain (no zipper noise); otherwise it's set instantly.
 */
export function applyEqGains(
  chain: EffectChain,
  gains: number[],
  ctx: AudioContext,
  ramp: boolean,
) {
  chain.eq.forEach((filter, i) => {
    setParam(filter.gain, gains[i] ?? 0, ctx, ramp);
  });
}

export function disconnectEffectChain(chain: EffectChain) {
  try {
    chain.osc.stop();
  } catch {
    // already stopped
  }
  try {
    chain.underwaterLfo.stop();
  } catch {
    // already stopped
  }
  for (const node of [chain.osc, chain.panDepth, chain.panner, chain.pannedGain, ...chain.eq, chain.eightDConvolver, chain.eightDBed, chain.out, chain.mix, chain.wetGain, chain.dryGain, chain.convolver, chain.underwaterDepth, chain.underwaterLfo, chain.underwaterLowpass, chain.peak, chain.lowshelf, chain.highpass]) {
    try {
      node.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}

/** Neutral options: clean playback before any effect is chosen. */
export const NEUTRAL_OPTIONS: AudioProcessingOptions = {
  speedMultiplier: 1,
  reverbAmount: 0,
  audio8D: false,
  bassBoost: false,
};

/**
 * True when the options change nothing about the sound, i.e. a render would
 * reproduce the source. Only then may a failed export render fall back to the
 * unprocessed track without misleading the listener.
 */
export function isNeutralOptions(options: AudioProcessingOptions): boolean {
  const speed = options.speedMultiplier || 1;
  const beats = !!options.enableBeats && (options.bpm ?? 0) > 0;
  return speed === 1 && !((options.reverbAmount || 0) > 0) && !options.audio8D && !options.bassBoost && !beats;
}
