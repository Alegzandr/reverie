import { AUDIO_EFFECTS, AUDIO_SIGNAL } from '../constants';

export interface AudioProcessingOptions {
  speedMultiplier: number;
  reverbAmount: number;
  preservePitch: boolean;
  audio8D?: boolean; // 8D spatial audio effect
  rotationSpeed?: number; // Speed of 8D rotation (0.1 - 2.0)
  bassBoost?: boolean; // Bass boost effect
  bassBoostIntensity?: number; // Bass boost intensity (0.0 - 1.0)
}

/**
 * Audio Processor
 *
 * Handles all audio processing operations including loading, effects processing,
 * and format conversion using the Web Audio API.
 */
export class AudioProcessor {
  private audioContext: AudioContext;
  private audioBuffer: AudioBuffer | null = null;

  constructor() {
    this.audioContext = new AudioContext();
  }

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
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
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

    const { speedMultiplier, reverbAmount, audio8D, rotationSpeed, bassBoost, bassBoostIntensity } = options;

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

      dry.gain.value = 1 - (reverbAmount * 0.5);
      wet.gain.value = reverbAmount * 0.5;

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
      const bassBoostNode = this.createBassBoostEffect(offlineContext, bassBoostIntensity);
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

  /**
   * Create 8D spatial audio effect
   *
   * Creates a circular panning effect that makes the sound appear to rotate
   * around the listener's head in 3D space.
   *
   * @param context - The OfflineAudioContext to create nodes in
   * @param sourceBuffer - The source AudioBuffer for duration calculation
   * @param rotationSpeed - Speed multiplier for rotation (0.1 - 2.0)
   * @returns Object with input and output GainNodes
   */
  private create8DAudioEffect(
    context: OfflineAudioContext,
    sourceBuffer: AudioBuffer,
    rotationSpeed: number
  ): { input: GainNode; output: GainNode } {
    // Create the 8D effect using automated panning and spatial audio
    const duration = sourceBuffer.duration;

    // Input/output nodes
    const inputGain = context.createGain();
    const outputGain = context.createGain();

    // Create stereo panner for left-right movement
    const panner = context.createStereoPanner();

    // Create additional depth with reverb
    const convolver = context.createConvolver();
    convolver.buffer = this.create8DReverbImpulse(context);

    // Dry/wet mix for reverb
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    dryGain.gain.value = AUDIO_SIGNAL.EIGHT_D_MIX.DRY_GAIN;
    wetGain.gain.value = AUDIO_SIGNAL.EIGHT_D_MIX.WET_GAIN;

    // Connect the nodes
    inputGain.connect(panner);
    panner.connect(dryGain);
    panner.connect(convolver);
    convolver.connect(wetGain);
    dryGain.connect(outputGain);
    wetGain.connect(outputGain);

    // Automate panning to create smooth circular motion
    // The sound will rotate around your head in a circle
    const cycleTime = 4 / rotationSpeed; // Time for one full rotation
    const pointsPerSecond = AUDIO_EFFECTS.EIGHT_D.AUTOMATION_POINTS_PER_SECOND;
    const totalPoints = Math.ceil(duration * pointsPerSecond);

    // Set initial value
    panner.pan.setValueAtTime(0, 0);

    for (let i = 1; i <= totalPoints; i++) {
      const time = (i / pointsPerSecond);
      if (time > duration) break;

      // Create smooth circular motion using sine wave
      const angle = (time / cycleTime) * Math.PI * 2;
      const panValue = Math.sin(angle);

      // Use linear ramp for smooth interpolation between points
      panner.pan.linearRampToValueAtTime(panValue, time);
    }

    return { input: inputGain, output: outputGain };
  }

  /**
   * Create reverb impulse response for 8D spatial effect
   *
   * @param context - The OfflineAudioContext to create the buffer in
   * @returns AudioBuffer containing the reverb impulse response
   */
  private create8DReverbImpulse(context: OfflineAudioContext): AudioBuffer {
    // Create a short, subtle reverb for 8D spatial effect
    const sampleRate = context.sampleRate;
    const length = sampleRate * (AUDIO_EFFECTS.REVERB.DEFAULT_DURATION_MS / 1000);
    const impulse = context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Create a short, bright reverb tail
        const decay = Math.exp(-i / (sampleRate * 0.1));
        // Add some variation between channels for stereo width
        const stereoVariation = channel === 0
          ? AUDIO_SIGNAL.EIGHT_D_MIX.STEREO_VARIATION_LEFT
          : AUDIO_SIGNAL.EIGHT_D_MIX.STEREO_VARIATION_RIGHT;
        channelData[i] = (Math.random() * 2 - 1) * decay * stereoVariation;
      }
    }

    return impulse;
  }

  /**
   * Create bass boost effect filter chain
   *
   * Applies a lowshelf filter to boost bass frequencies, a highpass to remove
   * sub-bass rumble, and a peaking filter to reduce muddiness.
   *
   * @param context - The OfflineAudioContext to create nodes in
   * @param intensity - Bass boost intensity (0.0 - 1.0)
   * @returns Object with input and output GainNodes
   */
  private createBassBoostEffect(
    context: OfflineAudioContext,
    intensity: number
  ): { input: GainNode; output: GainNode } {
    // Create input/output gain nodes
    const inputGain = context.createGain();
    const outputGain = context.createGain();

    // Create lowshelf filter for bass boost
    const lowshelf = context.createBiquadFilter();
    lowshelf.type = 'lowshelf';
    lowshelf.frequency.value = AUDIO_EFFECTS.BASS_BOOST.LOWSHELF_FREQUENCY_HZ;

    // Map intensity (0-1) to gain boost (0-18 dB)
    // Light: 0-6dB, Normal: 6-12dB, Strong: 12-18dB
    const gainBoost = intensity * 18;
    lowshelf.gain.value = gainBoost;

    // Create highpass filter to cut sub-bass rumble
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = AUDIO_EFFECTS.BASS_BOOST.HIGHPASS_FREQUENCY_HZ;
    highpass.Q.value = 0.7;

    // Create slight cut in low-mids to avoid muddiness
    const lowMidCut = context.createBiquadFilter();
    lowMidCut.type = 'peaking';
    lowMidCut.frequency.value = AUDIO_EFFECTS.BASS_BOOST.PEAKING_FREQUENCY_HZ;
    lowMidCut.Q.value = 1.0;
    // Reduce muddiness proportional to bass boost (up to -3 dB)
    lowMidCut.gain.value = Math.min(0, -intensity * 3);

    // Apply makeup gain to compensate for overall level increase and prevent clipping
    // Reduce output gain as bass boost increases to maintain headroom
    const makeupGain = 1.0 - (intensity * 0.25); // Reduce by up to 25% at max intensity
    outputGain.gain.value = makeupGain;

    // Connect the chain
    inputGain.connect(highpass);
    highpass.connect(lowshelf);
    lowshelf.connect(lowMidCut);
    lowMidCut.connect(outputGain);

    return { input: inputGain, output: outputGain };
  }

  /**
   * Create reverb impulse response for standard reverb effect
   *
   * Generates an exponentially decaying noise buffer that simulates room reverb.
   *
   * @param context - The OfflineAudioContext to create the buffer in
   * @param amount - Reverb amount (0.0 - 1.0) affecting duration and intensity
   * @returns Promise that resolves to AudioBuffer containing the impulse response
   */
  private async createReverbImpulse(
    context: OfflineAudioContext,
    amount: number
  ): Promise<AudioBuffer> {
    const sampleRate = context.sampleRate;
    const length = sampleRate * (1 + amount * AUDIO_EFFECTS.REVERB.DECAY_RATE);
    const impulse = context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Create exponentially decaying noise
        const decay = Math.exp(-i / (sampleRate * amount));
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }

    return impulse;
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
    return this.audioContext;
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }
}

export const audioProcessor = new AudioProcessor();
