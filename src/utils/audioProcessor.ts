import { AUDIO_EFFECTS, AUDIO_SIGNAL, underwaterCutoffHz, reverbMakeupGain, bassBoostTrimGain } from '../constants';
import { createDecayingNoiseImpulse } from './impulse';

// Offline impulse-response cache. The IRs are pure noise+decay buffers that only
// depend on (sampleRate, amount), and AudioBuffers are context-agnostic, so we can
// reuse them across the per-export OfflineAudioContexts instead of regenerating
// hundreds of thousands of Math.random samples every export. This also makes
// successive exports of the same settings deterministic.
let cachedOfflineReverb: { key: string; buffer: AudioBuffer } | null = null;
let cachedOffline8DBed: { sampleRate: number; buffer: AudioBuffer } | null = null;

export interface AudioProcessingOptions {
  speedMultiplier: number;
  reverbAmount: number;
  audio8D?: boolean; // 8D spatial audio effect
  rotationSpeed?: number; // Speed of 8D rotation (0.1 - 2.0)
  bassBoost?: boolean; // Bass boost effect
  bassBoostIntensity?: number; // Bass boost intensity (0.0 - 1.0)
  bassUnderwater?: number; // Underwater muffle amount within bass boost (0.0 - 1.0)
}

/**
 * Audio Processor
 *
 * Handles all audio processing operations including loading, effects processing,
 * and format conversion using the Web Audio API.
 */
export class AudioProcessor {
  // Created lazily on first use (see getAudioContext): constructing an AudioContext
  // at module load spins up the audio hardware on every page visit - including the
  // welcome/desktop-gate screens where audio never plays - and trips a browser
  // warning about contexts created before a user gesture.
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;

  /**
   * Load an audio file and decode it into an AudioBuffer
   *
   * @param file - The audio file to load
   * @returns Promise that resolves to the decoded AudioBuffer
   * @throws Error if file cannot be decoded or is not a valid audio file
   */
  async loadAudioFile(file: File): Promise<AudioBuffer> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.audioBuffer = await this.getAudioContext().decodeAudioData(arrayBuffer);
      return this.audioBuffer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load audio file: ${message}`);
    }
  }

  /**
   * Process audio with various effects (speed, reverb, 8D spatial, bass boost)
   *
   * @param options - Processing options including speed, reverb, and effects
   * @returns Promise that resolves to the processed AudioBuffer
   * @throws Error if no audio file is loaded or processing fails
   */
  async processAudio(options: AudioProcessingOptions): Promise<AudioBuffer> {
    if (!this.audioBuffer) {
      throw new Error('No audio file loaded');
    }

    try {

    const { speedMultiplier, reverbAmount, audio8D, rotationSpeed, bassBoost, bassBoostIntensity, bassUnderwater } = options;

    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      this.audioBuffer.numberOfChannels,
      Math.floor(this.audioBuffer.length / speedMultiplier),
      this.audioBuffer.sampleRate
    );

    // Create source node
    const source = offlineContext.createBufferSource();
    source.buffer = this.audioBuffer;
    source.playbackRate.value = speedMultiplier;

    let lastNode: AudioNode = source;

    // Add reverb if needed
    if (reverbAmount > 0) {
      const convolver = offlineContext.createConvolver();
      convolver.buffer = await this.createReverbImpulse(
        offlineContext,
        reverbAmount
      );

      const dry = offlineContext.createGain();
      const wet = offlineContext.createGain();

      // Makeup gain restores the loudness the dry/wet crossfade removes (see
      // reverbMakeupGain); without it the mix drops up to ~5 dB at full reverb.
      const makeup = reverbMakeupGain(reverbAmount);
      dry.gain.value = (1 - reverbAmount * 0.5) * makeup;
      wet.gain.value = reverbAmount * 0.5 * makeup;

      source.connect(dry);
      source.connect(convolver);
      convolver.connect(wet);

      const merger = offlineContext.createGain();
      dry.connect(merger);
      wet.connect(merger);

      lastNode = merger;
    }

    // Apply bass boost if enabled
    if (bassBoost && bassBoostIntensity !== undefined) {
      const bassBoostNode = this.createBassBoostEffect(offlineContext, bassBoostIntensity, bassUnderwater ?? 0);
      lastNode.connect(bassBoostNode.input);
      lastNode = bassBoostNode.output;
    }

    // Apply 8D spatial audio effect if enabled
    if (audio8D) {
      const audio8DProcessor = this.create8DAudioEffect(offlineContext, this.audioBuffer, rotationSpeed || 0.5);
      lastNode.connect(audio8DProcessor.input);
      audio8DProcessor.output.connect(offlineContext.destination);
    } else {
      lastNode.connect(offlineContext.destination);
    }

    source.start(0);

      return await offlineContext.startRendering();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to process audio: ${message}`);
    }
  }

  /** Offline 8D: a dry signal that orbits the head over a constant reverb bed. */
  private create8DAudioEffect(
    context: OfflineAudioContext,
    sourceBuffer: AudioBuffer,
    rotationSpeed: number
  ): { input: GainNode; output: GainNode } {
    const duration = sourceBuffer.duration;
    const inputGain = context.createGain();
    const outputGain = context.createGain();
    const panner = context.createStereoPanner();

    const convolver = context.createConvolver();
    convolver.buffer = this.create8DReverbImpulse(context);
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    dryGain.gain.value = AUDIO_SIGNAL.EIGHT_D_MIX.DRY_GAIN;
    wetGain.gain.value = AUDIO_SIGNAL.EIGHT_D_MIX.WET_GAIN;

    // Only the DRY path is panned, so the music orbits the head. The reverb bed
    // taps the UN-panned input so its tail stays in both ears; feeding it from the
    // panner instead would rotate a pocket of silence opposite the music.
    inputGain.connect(panner);
    panner.connect(dryGain);
    inputGain.connect(convolver);
    convolver.connect(wetGain);
    dryGain.connect(outputGain);
    wetGain.connect(outputGain);

    const cycleTime = 4 / rotationSpeed; // seconds per full rotation
    const pointsPerSecond = AUDIO_EFFECTS.EIGHT_D.AUTOMATION_POINTS_PER_SECOND;
    const totalPoints = Math.ceil(duration * pointsPerSecond);

    panner.pan.setValueAtTime(0, 0);
    for (let i = 1; i <= totalPoints; i++) {
      const time = i / pointsPerSecond;
      if (time > duration) break;
      const angle = (time / cycleTime) * Math.PI * 2;
      panner.pan.linearRampToValueAtTime(Math.sin(angle), time);
    }

    return { input: inputGain, output: outputGain };
  }

  /** Short, stereo-widened reverb tail for the offline 8D spatial effect. */
  private create8DReverbImpulse(context: OfflineAudioContext): AudioBuffer {
    if (cachedOffline8DBed && cachedOffline8DBed.sampleRate === context.sampleRate) {
      return cachedOffline8DBed.buffer;
    }
    const buffer = createDecayingNoiseImpulse(
      context,
      AUDIO_EFFECTS.REVERB.DEFAULT_DURATION_MS / 1000,
      0.1,
      [AUDIO_SIGNAL.EIGHT_D_MIX.STEREO_VARIATION_LEFT, AUDIO_SIGNAL.EIGHT_D_MIX.STEREO_VARIATION_RIGHT],
    );
    cachedOffline8DBed = { sampleRate: context.sampleRate, buffer };
    return buffer;
  }

  /** Bass boost: highpass (cut rumble) → lowshelf (boost) → peaking (de-mud) →
   *  optional underwater lowpass, with makeup gain. */
  private createBassBoostEffect(
    context: OfflineAudioContext,
    intensity: number,
    underwater: number
  ): { input: GainNode; output: GainNode } {
    const inputGain = context.createGain();
    const outputGain = context.createGain();

    const lowshelf = context.createBiquadFilter();
    lowshelf.type = 'lowshelf';
    lowshelf.frequency.value = AUDIO_EFFECTS.BASS_BOOST.LOWSHELF_FREQUENCY_HZ;
    lowshelf.gain.value = intensity * 18; // up to +18 dB

    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = AUDIO_EFFECTS.BASS_BOOST.HIGHPASS_FREQUENCY_HZ;
    highpass.Q.value = 0.7;

    const lowMidCut = context.createBiquadFilter();
    lowMidCut.type = 'peaking';
    lowMidCut.frequency.value = AUDIO_EFFECTS.BASS_BOOST.PEAKING_FREQUENCY_HZ;
    lowMidCut.Q.value = 1.0;
    lowMidCut.gain.value = Math.min(0, -intensity * 3);

    // Trim output as the boost grows so the extra low end keeps headroom. The trim
    // is quadratic (the shelf's loudness gain accelerates with intensity); see
    // bassBoostTrimGain for how the 0.4 coefficient was measured.
    outputGain.gain.value = bassBoostTrimGain(intensity);

    inputGain.connect(highpass);
    highpass.connect(lowshelf);
    lowshelf.connect(lowMidCut);

    // Underwater muffle: a lowpass that closes as the amount grows, its cutoff
    // wobbling on a slow LFO so the sound breathes like it's submerged. Only wired
    // when the amount is non-zero, otherwise the chain stays exactly as before.
    let tail: AudioNode = lowMidCut;
    if (underwater > 0) {
      const cutoff = underwaterCutoffHz(underwater);
      const lowpass = context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = cutoff;
      lowpass.Q.value = 0.7;

      const lfo = context.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = AUDIO_EFFECTS.BASS_BOOST.UNDERWATER_LFO_FREQUENCY_HZ;
      const lfoDepth = context.createGain();
      lfoDepth.gain.value = cutoff * AUDIO_EFFECTS.BASS_BOOST.UNDERWATER_LFO_DEPTH_RATIO * underwater;
      lfo.connect(lfoDepth);
      lfoDepth.connect(lowpass.frequency);
      lfo.start(0);

      lowMidCut.connect(lowpass);
      tail = lowpass;
    }
    tail.connect(outputGain);

    return { input: inputGain, output: outputGain };
  }

  /** Room-reverb impulse whose tail length and decay both scale with `amount` (0–1).
   *  Keyed on BOTH sampleRate and amount so a re-export at a different reverb amount
   *  regenerates the correct tail instead of reusing the previous one. */
  private createReverbImpulse(context: OfflineAudioContext, amount: number): AudioBuffer {
    const key = `${context.sampleRate}:${amount}`;
    if (cachedOfflineReverb && cachedOfflineReverb.key === key) {
      return cachedOfflineReverb.buffer;
    }
    const buffer = createDecayingNoiseImpulse(context, 1 + amount * AUDIO_EFFECTS.REVERB.DECAY_RATE, amount);
    cachedOfflineReverb = { key, buffer };
    return buffer;
  }

  /**
   * Convert an AudioBuffer to WAV format
   *
   * Creates a standard WAV file with 16-bit PCM audio data.
   *
   * @param audioBuffer - The AudioBuffer to convert
   * @returns Promise that resolves to a Blob containing the WAV file
   */
  async audioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // "RIFF" chunk descriptor
    setUint32(AUDIO_SIGNAL.WAV_FORMAT.RIFF_ID);
    setUint32(36 + length);
    setUint32(AUDIO_SIGNAL.WAV_FORMAT.WAVE_ID);

    // "fmt " sub-chunk
    setUint32(AUDIO_SIGNAL.WAV_FORMAT.FMT_ID);
    setUint32(AUDIO_SIGNAL.WAV_FORMAT.FMT_CHUNK_SIZE);
    setUint16(AUDIO_SIGNAL.WAV_FORMAT.PCM_FORMAT);
    setUint16(numberOfChannels);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * numberOfChannels * 2);
    setUint16(numberOfChannels * 2);
    setUint16(AUDIO_SIGNAL.WAV_FORMAT.BITS_PER_SAMPLE);

    // "data" sub-chunk
    setUint32(AUDIO_SIGNAL.WAV_FORMAT.DATA_ID);
    setUint32(length);

    // Write interleaved data
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < buffer.byteLength) {
      for (let i = 0; i < numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0
          ? sample * AUDIO_SIGNAL.PCM.INT16_MIN
          : sample * AUDIO_SIGNAL.PCM.INT16_MAX;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }
}

export const audioProcessor = new AudioProcessor();
