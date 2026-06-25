/**
 * Every reverb and ambience convolver in the app is fed the same shape of impulse
 * response: a 2-channel buffer of exponentially-decaying white noise. The reverb
 * length, decay rate and per-channel gain are the only things that vary, so this
 * single factory backs all of them (live graph and offline render alike).
 *
 * @param decaySeconds  time constant of the exponential tail, in seconds
 * @param channelGains  per-channel scale; asymmetric values widen the stereo image
 */
export function createDecayingNoiseImpulse(
  ctx: BaseAudioContext,
  seconds: number,
  decaySeconds: number,
  channelGains: readonly [number, number] = [1, 1],
): AudioBuffer {
  const { sampleRate } = ctx;
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const falloff = sampleRate * decaySeconds;
  const impulse = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    const gain = channelGains[channel];
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / falloff) * gain;
    }
  }

  return impulse;
}
