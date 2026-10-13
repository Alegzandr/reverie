import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AudioProcessor, renderChannelCount, type AudioProcessingOptions } from './audioProcessor';
import { createEffectChain, applyEffectOptions } from './effectGraph';
import { getReverbImpulse } from './impulse';
import { AUDIO_EFFECTS } from '../constants';

const BaseOffline = globalThis.OfflineAudioContext as unknown as new (
  channels: number,
  length: number,
  sampleRate: number,
) => any;
const BaseRealtime = globalThis.AudioContext as unknown as new () => any;

interface Recorded {
  biquads: any[];
  gains: any[];
  convolvers: any[];
  oscillators: any[];
  panners: any[];
  sources: any[];
}

// Records every node a context hands out, in creation order, so the offline
// render's graph can be compared node-for-node against the live chain.
function recording<T extends new (...args: any[]) => any>(Base: T) {
  return class extends Base {
    nodes: Recorded = { biquads: [], gains: [], convolvers: [], oscillators: [], panners: [], sources: [] };
    track<N>(bucket: keyof Recorded, node: N): N {
      this.nodes[bucket].push(node);
      return node;
    }
    createBiquadFilter() {
      return this.track('biquads', super.createBiquadFilter());
    }
    createGain() {
      return this.track('gains', super.createGain());
    }
    createConvolver() {
      return this.track('convolvers', super.createConvolver());
    }
    createOscillator() {
      return this.track('oscillators', super.createOscillator());
    }
    createStereoPanner() {
      return this.track('panners', super.createStereoPanner());
    }
    createBufferSource() {
      return this.track('sources', super.createBufferSource());
    }
  };
}

const RecordingOffline = recording(BaseOffline);
let lastOffline: InstanceType<typeof RecordingOffline> | null = null;
// A constructor that returns an object hands that object to `new`, so the
// processor gets a recording context and the test keeps a handle on it.
function SpyOffline(channels: number, length: number, sampleRate: number) {
  lastOffline = new RecordingOffline(channels, length, sampleRate);
  return lastOffline;
}
const RecordingRealtime = recording(BaseRealtime);

const SAMPLE_RATE = 44100;
const makeBuffer = (channels: number, length = 8) =>
  new AudioBuffer({ numberOfChannels: channels, length, sampleRate: SAMPLE_RATE });

const snapshot = (nodes: Recorded, biquadCount: number) => ({
  biquads: nodes.biquads.slice(0, biquadCount).map((f) => ({
    type: f.type,
    frequency: f.frequency.value,
    Q: f.Q.value,
    gain: f.gain.value,
  })),
  gains: nodes.gains.map((g) => g.gain.value),
  convolvers: nodes.convolvers.map((c) => c.buffer),
  oscillators: nodes.oscillators.map((o) => o.frequency.value),
});

/** The bass/underwater stage: highpass, lowshelf, peaking, underwater lowpass. */
const EFFECT_BIQUADS = 4;

describe('AudioProcessor', () => {
  beforeAll(() => {
    globalThis.OfflineAudioContext = SpyOffline as any;
  });

  afterAll(() => {
    globalThis.OfflineAudioContext = BaseOffline as any;
  });

  it('loads and retrieves audio buffer', async () => {
    const processor = new AudioProcessor();
    const file: any = new File(['1234'], 'sample.wav', { type: 'audio/wav' });
    file.arrayBuffer = async () => new TextEncoder().encode('1234').buffer;

    const buffer = await processor.loadAudioFile(file);

    expect(buffer).toBeDefined();
    expect(processor.getAudioBuffer()).toBe(buffer);
  });

  it('clear() drops the buffer and invalidates a decode still in flight', async () => {
    const processor = new AudioProcessor();
    let release!: (value: ArrayBuffer) => void;
    const file: any = new File(['x'], 'slow.wav');
    file.arrayBuffer = () => new Promise<ArrayBuffer>((resolve) => { release = resolve; });

    const pending = processor.loadAudioFile(file);
    processor.clear();
    release(new ArrayBuffer(16));
    await pending;

    expect(processor.getAudioBuffer()).toBeNull();
  });

  it('throws when processing without buffer', async () => {
    const processor = new AudioProcessor();
    await expect(processor.processAudio({ speedMultiplier: 1, reverbAmount: 0 })).rejects.toThrow('No audio file loaded');
  });

  it('renders the explicitly passed source, not its own latest decode', async () => {
    const processor: any = new AudioProcessor();
    processor.audioBuffer = makeBuffer(2, 100);
    const committed = makeBuffer(2, 40);

    await processor.processAudio({ speedMultiplier: 1, reverbAmount: 0 }, committed);

    expect(lastOffline!.nodes.sources[0].buffer).toBe(committed);
    expect(lastOffline!.length).toBe(40);
  });

  it('applies speed through the render length and playback rate', async () => {
    const processor: any = new AudioProcessor();
    processor.audioBuffer = makeBuffer(2);

    await processor.processAudio({ speedMultiplier: 1.5, reverbAmount: 0.4, audio8D: true, rotationSpeed: 1 });

    expect(lastOffline!.length).toBe(Math.floor(8 / 1.5));
    expect(lastOffline!.nodes.sources[0].playbackRate.value).toBeCloseTo(1.5);
  });

  it('renders mono sources in stereo when an effect creates stereo content', async () => {
    const processor: any = new AudioProcessor();
    processor.audioBuffer = makeBuffer(1);

    await processor.processAudio({ speedMultiplier: 1, reverbAmount: 0, audio8D: true });
    expect(lastOffline!.numberOfChannels).toBe(2);

    await processor.processAudio({ speedMultiplier: 1, reverbAmount: 0.3 });
    expect(lastOffline!.numberOfChannels).toBe(2);

    await processor.processAudio({ speedMultiplier: 1, reverbAmount: 0, bassBoost: true, bassBoostIntensity: 1 });
    expect(lastOffline!.numberOfChannels).toBe(1);
  });

  it('never narrows a multichannel source', () => {
    expect(renderChannelCount(makeBuffer(6), { speedMultiplier: 1, reverbAmount: 0, audio8D: true })).toBe(6);
  });

  it('uses the live reverb impulse whatever the amount', async () => {
    const processor: any = new AudioProcessor();
    processor.audioBuffer = makeBuffer(2);

    for (const reverbAmount of [0.2, 0.7, 1]) {
      await processor.processAudio({ speedMultiplier: 1, reverbAmount });
      const impulse = lastOffline!.nodes.convolvers[0].buffer;
      expect(impulse).toBe(getReverbImpulse(lastOffline as any));
      expect(impulse.length).toBe(Math.floor(SAMPLE_RATE * AUDIO_EFFECTS.REVERB.TAIL_SECONDS));
    }
  });

  // The export must sound exactly like what was auditioned: for each state, the
  // offline graph's every effect parameter must equal the live chain's.
  const parityCases: [string, AudioProcessingOptions][] = [
    ['neutral', { speedMultiplier: 1, reverbAmount: 0 }],
    ['slow + reverb', { speedMultiplier: 0.85, reverbAmount: 0.6 }],
    ['8D', { speedMultiplier: 1, reverbAmount: 0, audio8D: true, rotationSpeed: 0.7 }],
    ['bass boost', { speedMultiplier: 1, reverbAmount: 0, bassBoost: true, bassBoostIntensity: 0.8 }],
    ['bass boost underwater', { speedMultiplier: 1, reverbAmount: 0, bassBoost: true, bassBoostIntensity: 0.5, bassUnderwater: 0.6 }],
    ['everything', { speedMultiplier: 1.2, reverbAmount: 0.3, audio8D: true, bassBoost: true, bassBoostIntensity: 1, bassUnderwater: 1 }],
  ];

  it.each(parityCases)('matches the live chain parameters: %s', async (_name, options) => {
    const processor: any = new AudioProcessor();
    processor.audioBuffer = makeBuffer(2);
    await processor.processAudio(options);

    const live = new RecordingRealtime();
    const chain = createEffectChain(live as any);
    applyEffectOptions(chain, options, live as any, false);

    expect(snapshot(lastOffline!.nodes, EFFECT_BIQUADS)).toEqual(snapshot(live.nodes, EFFECT_BIQUADS));
    // The listening EQ is playback-only: the offline graph has no other filters.
    expect(lastOffline!.nodes.biquads).toHaveLength(EFFECT_BIQUADS);
    expect(live.nodes.biquads.length).toBeGreaterThan(EFFECT_BIQUADS);
  });

  it('converts audio buffer to WAV blob', async () => {
    const processor: any = new AudioProcessor();
    const buffer = new AudioBuffer({ numberOfChannels: 1, length: 2, sampleRate: 44100 });
    buffer.getChannelData(0).set([-0.5, 0.5]);
    const wav = await processor.audioBufferToWav(buffer as any);

    expect(wav.type).toBe('audio/wav');
    expect(wav.size).toBe(48);
  });
});
