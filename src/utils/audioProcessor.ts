export interface AudioProcessingOptions {
  speedMultiplier: number;
  reverbAmount: number;
  preservePitch: boolean;
  bitDepth?: number;
  sampleRateReduction?: number;
  chiptune?: boolean; // New authentic chiptune mode
}

export class AudioProcessor {
  private audioContext: AudioContext;
  private audioBuffer: AudioBuffer | null = null;

  constructor() {
    this.audioContext = new AudioContext();
  }

  async loadAudioFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }

  async processAudio(options: AudioProcessingOptions): Promise<AudioBuffer> {
    if (!this.audioBuffer) {
      throw new Error('No audio file loaded');
    }

    const { speedMultiplier, reverbAmount, bitDepth, sampleRateReduction } = options;

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

    // Apply authentic chiptune effect or simple bit-crushing
    if (options.chiptune) {
      // Create authentic 8-bit console sound (square waves, etc.)
      const chiptuneProcessor = await this.createChiptuneProcessor(offlineContext, this.audioBuffer);
      lastNode.connect(chiptuneProcessor);
      chiptuneProcessor.connect(offlineContext.destination);
    } else if (bitDepth || sampleRateReduction) {
      // Original bit-crushing effect
      const channelCount = this.audioBuffer.numberOfChannels;
      const scriptProcessor = offlineContext.createScriptProcessor(4096, channelCount, channelCount);
      const steps = bitDepth ? Math.max(1, Math.pow(2, bitDepth - 1)) : Math.pow(2, 8 - 1);
      const sampleRateDiv = Math.max(1, sampleRateReduction || 2);
      const heldSamples = Array.from({ length: channelCount }, () => 0);
      const phases = Array.from({ length: channelCount }, () => 0);

      scriptProcessor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer;
        const outputBuffer = e.outputBuffer;

        for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
          const inputData = inputBuffer.getChannelData(channel);
          const outputData = outputBuffer.getChannelData(channel);

          for (let sample = 0; sample < inputBuffer.length; sample++) {
            if (phases[channel] % sampleRateDiv === 0) {
              const quantized = Math.round(inputData[sample] * steps) / steps;
              heldSamples[channel] = quantized;
            }
            outputData[sample] = heldSamples[channel];
            phases[channel]++;
          }
        }
      };

      lastNode.connect(scriptProcessor);
      scriptProcessor.connect(offlineContext.destination);
    } else {
      lastNode.connect(offlineContext.destination);
    }

    source.start(0);

    return await offlineContext.startRendering();
  }

  private async createChiptuneProcessor(
    context: OfflineAudioContext,
    sourceBuffer: AudioBuffer
  ): Promise<ScriptProcessorNode> {
    const channelCount = sourceBuffer.numberOfChannels;
    const scriptProcessor = context.createScriptProcessor(4096, channelCount, channelCount);
    const sampleRate = context.sampleRate;

    // Chiptune parameters (NES/Game Boy style)
    const QUANTIZE_STEPS = 16; // 4-bit amplitude
    const PULSE_WIDTH = 0.5; // 50% duty cycle for square wave

    // Simplified approach: Use envelope following with frequency downsampling
    // This is MUCH faster than DFT and creates an authentic chiptune sound

    // Phase accumulators for oscillators
    let squarePhase = 0;
    let trianglePhase = 0;
    let pulsePhase = 0;
    let envelope = 0;

    // Simple envelope follower
    const attackRate = 0.001;
    const releaseRate = 0.0005;

    // Downsampling for that classic lo-fi sound
    const DOWNSAMPLE_FACTOR = 6; // Simulate lower sample rate
    let downsampleCounter = 0;
    let heldSample = 0;

    scriptProcessor.onaudioprocess = (e) => {
      const inputBuffer = e.inputBuffer;
      const outputBuffer = e.outputBuffer;

      for (let channel = 0; channel < channelCount; channel++) {
        const inputData = inputBuffer.getChannelData(channel);
        const outputData = outputBuffer.getChannelData(channel);

        for (let i = 0; i < inputBuffer.length; i++) {
          const input = inputData[i];

          // Downsample the input signal (hold samples)
          if (downsampleCounter % DOWNSAMPLE_FACTOR === 0) {
            heldSample = input;

            // Simple envelope follower
            const inputAbs = Math.abs(input);
            if (inputAbs > envelope) {
              envelope += (inputAbs - envelope) * attackRate;
            } else {
              envelope += (inputAbs - envelope) * releaseRate;
            }
          }
          downsampleCounter++;

          // Estimate fundamental frequency from zero-crossing rate (super fast)
          // For chiptune, we simplify by using a fixed base frequency modulated by input
          const baseFreq = 220 + (heldSample * 1000); // A3 +/- modulation

          // Generate composite chiptune output using multiple waveforms
          let chipSample = 0;

          // Square wave (iconic chiptune sound) - 40% of mix
          squarePhase += baseFreq / sampleRate;
          const squareVal = (squarePhase % 1.0) < PULSE_WIDTH ? 1 : -1;
          chipSample += squareVal * envelope * 0.4;

          // Triangle wave (bass) - 30% of mix
          trianglePhase += (baseFreq * 0.5) / sampleRate; // Octave down
          const triangleVal = Math.abs((trianglePhase % 1.0) * 2 - 1) * 2 - 1;
          chipSample += triangleVal * envelope * 0.3;

          // Pulse wave (harmony) - 20% of mix
          pulsePhase += (baseFreq * 1.5) / sampleRate; // Fifth up
          const pulseVal = (pulsePhase % 1.0) < 0.25 ? 1 : -1; // 25% duty
          chipSample += pulseVal * envelope * 0.2;

          // Add slight noise for texture - 10% of mix
          const noise = (Math.random() * 2 - 1) * envelope * 0.1;
          chipSample += noise;

          // Quantize amplitude (4-bit style) for authentic stepped sound
          chipSample = Math.round(chipSample * QUANTIZE_STEPS) / QUANTIZE_STEPS;

          // Hard clipping (authentic console limitation)
          chipSample = Math.max(-1, Math.min(1, chipSample));

          // Mix: 75% chiptune + 25% original for musicality
          outputData[i] = chipSample * 0.75 + heldSample * 0.25;
        }
      }
    };

    return scriptProcessor;
  }

  private async createReverbImpulse(
    context: OfflineAudioContext,
    amount: number
  ): Promise<AudioBuffer> {
    const sampleRate = context.sampleRate;
    const length = sampleRate * (1 + amount * 2); // Up to 3 seconds of reverb
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
    setUint32(0x46464952);
    setUint32(36 + length);
    setUint32(0x45564157);

    // "fmt " sub-chunk
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numberOfChannels);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * numberOfChannels * 2);
    setUint16(numberOfChannels * 2);
    setUint16(16);

    // "data" sub-chunk
    setUint32(0x61746164);
    setUint32(length);

    // Write interleaved data
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < buffer.byteLength) {
      for (let i = 0; i < numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
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
