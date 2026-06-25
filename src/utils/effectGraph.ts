import { AUDIO_EFFECTS } from '../constants';
import type { AudioProcessingOptions } from './audioProcessor';

/**
 * Live effect graph for real-time, DAW-style tweaking.
 *
 * The same four effects the offline renderer bakes (speed, slow + reverb, 8D, bass
 * boost) are wired as persistent nodes so their parameters can be ramped smoothly
 * while the track plays. The graph is rebuilt per playback (sources and oscillators
 * are one-shot), then `applyEffectOptions` is called to set or ramp every parameter.
 *
 * Signal path:
 *   source -> highpass -> lowshelf -> peaking -> (dry + convolver/wet) -> mix
 *          -> stereo panner -> [caller's volume gain] -> destination
 * 8D motion: oscillator -> panDepth gain -> panner.pan
 */
export interface EffectChain {
  input: AudioNode;
  output: AudioNode;
  highpass: BiquadFilterNode;
  lowshelf: BiquadFilterNode;
  peak: BiquadFilterNode;
  dryGain: GainNode;
  wetGain: GainNode;
  convolver: ConvolverNode;
  mix: GainNode;
  panner: StereoPannerNode;
  panDepth: GainNode;
  osc: OscillatorNode;
}

/** Smooth-transition time constant (~150 ms perceived), DAW-like, no zipper noise. */
const RAMP_TIME_CONSTANT = 0.04;
/** Fixed reverb tail length in seconds; wetness is controlled by the wet gain. */
const REVERB_SECONDS = 3;

let cachedImpulse: { sampleRate: number; buffer: AudioBuffer } | null = null;

function getReverbImpulse(ctx: BaseAudioContext): AudioBuffer {
  if (cachedImpulse && cachedImpulse.sampleRate === ctx.sampleRate) {
    return cachedImpulse.buffer;
  }
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * REVERB_SECONDS));
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (sampleRate * 0.9));
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  cachedImpulse = { sampleRate, buffer: impulse };
  return impulse;
}

export function createEffectChain(ctx: AudioContext): EffectChain {
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = AUDIO_EFFECTS.BASS_BOOST.HIGHPASS_FREQUENCY_HZ;
  highpass.Q.value = 0.7;

  const lowshelf = ctx.createBiquadFilter();
  lowshelf.type = 'lowshelf';
  lowshelf.frequency.value = AUDIO_EFFECTS.BASS_BOOST.LOWSHELF_FREQUENCY_HZ;

  const peak = ctx.createBiquadFilter();
  peak.type = 'peaking';
  peak.frequency.value = AUDIO_EFFECTS.BASS_BOOST.PEAKING_FREQUENCY_HZ;
  peak.Q.value = 1;

  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const convolver = ctx.createConvolver();
  convolver.buffer = getReverbImpulse(ctx);
  const mix = ctx.createGain();
  const panner = ctx.createStereoPanner();
  const panDepth = ctx.createGain();
  const osc = ctx.createOscillator();
  osc.type = 'sine';

  highpass.connect(lowshelf);
  lowshelf.connect(peak);
  peak.connect(dryGain);
  peak.connect(convolver);
  convolver.connect(wetGain);
  dryGain.connect(mix);
  wetGain.connect(mix);
  mix.connect(panner);

  osc.connect(panDepth);
  panDepth.connect(panner.pan);
  osc.start();

  return { input: highpass, output: panner, highpass, lowshelf, peak, dryGain, wetGain, convolver, mix, panner, panDepth, osc };
}

function setParam(param: AudioParam, value: number, ctx: AudioContext, ramp: boolean) {
  if (ramp && typeof param.setTargetAtTime === 'function') {
    param.setTargetAtTime(value, ctx.currentTime, RAMP_TIME_CONSTANT);
  } else {
    param.value = value;
  }
}

/**
 * Apply effect options to a live chain. With `ramp`, parameters glide to their new
 * values; without it (at playback start) they are set instantly.
 * Speed lives on the source node and is handled by the playback hook.
 */
export function applyEffectOptions(
  chain: EffectChain,
  options: AudioProcessingOptions,
  ctx: AudioContext,
  ramp: boolean,
) {
  const reverb = Math.max(0, Math.min(1, options.reverbAmount || 0));
  setParam(chain.dryGain.gain, 1 - reverb * 0.5, ctx, ramp);
  setParam(chain.wetGain.gain, reverb * 0.5, ctx, ramp);

  const bass = options.bassBoost ? Math.max(0, Math.min(1, options.bassBoostIntensity ?? 0)) : 0;
  setParam(chain.lowshelf.gain, bass * 18, ctx, ramp);
  setParam(chain.peak.gain, -bass * 3, ctx, ramp);

  const eightD = !!options.audio8D;
  setParam(chain.panDepth.gain, eightD ? 1 : 0, ctx, ramp);
  setParam(chain.panner.pan, 0, ctx, ramp);
  // Offline maps one full rotation to 4 / rotationSpeed seconds → frequency = rotationSpeed / 4.
  setParam(chain.osc.frequency, eightD ? Math.max(0.01, (options.rotationSpeed || 0.4) / 4) : 0.01, ctx, ramp);
}

export function disconnectEffectChain(chain: EffectChain) {
  try {
    chain.osc.stop();
  } catch {
    // already stopped
  }
  for (const node of [chain.osc, chain.panDepth, chain.panner, chain.mix, chain.wetGain, chain.dryGain, chain.convolver, chain.peak, chain.lowshelf, chain.highpass]) {
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
  preservePitch: false,
  audio8D: false,
  bassBoost: false,
};
