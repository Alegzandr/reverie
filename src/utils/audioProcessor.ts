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
    const FREQ_BANDS = 4; // Simulate 4-channel audio
    const PULSE_WIDTH = 0.5; // 50% duty cycle for square wave

    // Frequency ranges for different "channels"
    const channelFilters = [
      { low: 100, high: 1000 },   // Bass/triangle wave
      { low: 400, high: 3000 },   // Lead/square wave
      { low: 1000, high: 5000 },  // Harmony/pulse wave
      { low: 3000, high: 8000 }   // High/noise-like
    ];

    // Phase accumulators for oscillators
    const phases = Array(FREQ_BANDS).fill(0);
    const targetFreqs = Array(FREQ_BANDS).fill(440);
    const envelopes = Array(FREQ_BANDS).fill(0);

    // Analysis window for pitch detection
    let sampleCounter = 0;
    const ANALYSIS_WINDOW = 2048;
    const analysisBuffers: Float32Array[] = Array(channelCount).fill(null).map(() => new Float32Array(ANALYSIS_WINDOW));

    scriptProcessor.onaudioprocess = (e) => {
      const inputBuffer = e.inputBuffer;
      const outputBuffer = e.outputBuffer;

      for (let channel = 0; channel < channelCount; channel++) {
        const inputData = inputBuffer.getChannelData(channel);
        const outputData = outputBuffer.getChannelData(channel);

        for (let i = 0; i < inputBuffer.length; i++) {
          // Store sample for analysis
          analysisBuffers[channel][sampleCounter % ANALYSIS_WINDOW] = inputData[i];

          // Generate chiptune sound every N samples
          if (sampleCounter % 512 === 0) {
            // Simple spectral analysis for frequency content
            const spectrum = this.analyzeSpectrum(analysisBuffers[channel]);

            // Assign frequencies to different "chip channels"
            for (let band = 0; band < FREQ_BANDS; band++) {
              const { low, high } = channelFilters[band];
              const energy = this.getEnergyInRange(spectrum, low, high, sampleRate);
              const peakFreq = this.getPeakFrequency(spectrum, low, high, sampleRate);

              if (peakFreq > 0 && energy > 0.01) {
                targetFreqs[band] = this.quantizeFrequency(peakFreq);
                envelopes[band] = Math.min(1.0, energy * 3);
              } else {
                envelopes[band] *= 0.95; // Decay
              }
            }
          }

          // Generate composite chiptune output
          let chipSample = 0;

          // Triangle wave (bass channel)
          const trianglePhase = (phases[0] * targetFreqs[0]) / sampleRate;
          const triangleVal = Math.abs((trianglePhase % 1.0) * 2 - 1) * 2 - 1;
          chipSample += triangleVal * envelopes[0] * 0.35;
          phases[0]++;

          // Square wave (lead channel - most iconic chiptune sound)
          const squarePhase = (phases[1] * targetFreqs[1]) / sampleRate;
          const squareVal = (squarePhase % 1.0) < PULSE_WIDTH ? 1 : -1;
          chipSample += squareVal * envelopes[1] * 0.3;
          phases[1]++;

          // Pulse wave (harmony)
          const pulsePhase = (phases[2] * targetFreqs[2]) / sampleRate;
          const pulseVal = (pulsePhase % 1.0) < 0.25 ? 1 : -1; // 25% duty cycle
          chipSample += pulseVal * envelopes[2] * 0.2;
          phases[2]++;

          // Noise-like high freq (using input signal filtered)
          const noisePhase = (phases[3] * targetFreqs[3]) / sampleRate;
          const noiseVal = Math.sin(noisePhase * Math.PI * 2) * (Math.random() * 0.3 + 0.7);
          chipSample += noiseVal * envelopes[3] * 0.15;
          phases[3]++;

          // Quantize amplitude (4-bit style)
          chipSample = Math.round(chipSample * QUANTIZE_STEPS) / QUANTIZE_STEPS;

          // Hard clipping
          chipSample = Math.max(-1, Math.min(1, chipSample));

          // Apply envelope and add slight original signal for musicality
          outputData[i] = chipSample * 0.85 + inputData[i] * 0.15;

          sampleCounter++;
        }
      }
    };

    return scriptProcessor;
  }

  // Simple FFT-like analysis for frequency content
  private analyzeSpectrum(buffer: Float32Array): Float32Array {
    const size = buffer.length;
    const spectrum = new Float32Array(size / 2);

    for (let k = 0; k < size / 2; k++) {
      let real = 0;
      let imag = 0;

      for (let n = 0; n < size; n++) {
        const angle = (2 * Math.PI * k * n) / size;
        real += buffer[n] * Math.cos(angle);
        imag += buffer[n] * Math.sin(angle);
      }

      spectrum[k] = Math.sqrt(real * real + imag * imag) / size;
    }

    return spectrum;
  }

  private getEnergyInRange(spectrum: Float32Array, lowFreq: number, highFreq: number, sampleRate: number): number {
    const lowBin = Math.floor((lowFreq * spectrum.length * 2) / sampleRate);
    const highBin = Math.ceil((highFreq * spectrum.length * 2) / sampleRate);

    let energy = 0;
    for (let i = lowBin; i < Math.min(highBin, spectrum.length); i++) {
      energy += spectrum[i];
    }

    return energy / (highBin - lowBin);
  }

  private getPeakFrequency(spectrum: Float32Array, lowFreq: number, highFreq: number, sampleRate: number): number {
    const lowBin = Math.floor((lowFreq * spectrum.length * 2) / sampleRate);
    const highBin = Math.ceil((highFreq * spectrum.length * 2) / sampleRate);

    let maxMagnitude = 0;
    let peakBin = lowBin;

    for (let i = lowBin; i < Math.min(highBin, spectrum.length); i++) {
      if (spectrum[i] > maxMagnitude) {
        maxMagnitude = spectrum[i];
        peakBin = i;
      }
    }

    return (peakBin * sampleRate) / (spectrum.length * 2);
  }

  // Quantize frequency to nearest note (12-tone equal temperament)
  private quantizeFrequency(freq: number): number {
    if (freq < 20) return 20;
    if (freq > 8000) return 8000;

    const A4 = 440;
    const semitonesFromA4 = 12 * Math.log2(freq / A4);
    const roundedSemitones = Math.round(semitonesFromA4);
    const quantized = A4 * Math.pow(2, roundedSemitones / 12);

    return quantized;
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
