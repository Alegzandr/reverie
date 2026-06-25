import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  private channels: Float32Array[];

  constructor(
    numberOfChannelsOrOptions: number | { numberOfChannels: number; length: number; sampleRate: number },
    length?: number,
    sampleRate?: number
  ) {
    if (typeof numberOfChannelsOrOptions === 'object') {
      this.numberOfChannels = numberOfChannelsOrOptions.numberOfChannels;
      this.length = numberOfChannelsOrOptions.length;
      this.sampleRate = numberOfChannelsOrOptions.sampleRate;
    } else {
      this.numberOfChannels = numberOfChannelsOrOptions;
      this.length = length ?? 1;
      this.sampleRate = sampleRate ?? 44100;
    }
    this.channels = Array.from({ length: this.numberOfChannels }, () => new Float32Array(this.length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel];
  }

  get duration() {
    return this.length / this.sampleRate;
  }
}

const mockParam = (value = 0) => ({
  value,
  setValueAtTime: vi.fn(),
  setTargetAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
});

class MockGainNode {
  gain = mockParam(1);
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockBufferSource {
  buffer: MockAudioBuffer | null = null;
  loop = false;
  playbackRate = mockParam(1);
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
}

class MockBiquadFilter {
  type = '';
  frequency = mockParam(350);
  Q = mockParam(1);
  gain = mockParam(0);
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockStereoPanner {
  pan = mockParam(0);
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillator {
  type = '';
  frequency = mockParam(440);
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockScriptProcessor {
  onaudioprocess: ((this: ScriptProcessorNode, ev: AudioProcessingEvent) => any) | null = null;
  connect = vi.fn();
}

class MockConvolverNode {
  buffer: MockAudioBuffer | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOfflineAudioContext {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  destination = {} as AudioDestinationNode;

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
  }

  createBufferSource() {
    return new MockBufferSource();
  }

  createConvolver() {
    return new MockConvolverNode();
  }

  createGain() {
    return new MockGainNode();
  }

  createScriptProcessor() {
    return new MockScriptProcessor();
  }

  startRendering(): Promise<MockAudioBuffer> {
    return Promise.resolve(new MockAudioBuffer(this.numberOfChannels, this.length, this.sampleRate));
  }
}

class MockAudioContext {
  destination = {} as AudioDestinationNode;
  sampleRate = 44100;
  currentTime = 0;

  createGain() {
    return new MockGainNode();
  }

  createBufferSource() {
    return new MockBufferSource();
  }

  createBiquadFilter() {
    return new MockBiquadFilter();
  }

  createConvolver() {
    return new MockConvolverNode();
  }

  createStereoPanner() {
    return new MockStereoPanner();
  }

  createOscillator() {
    return new MockOscillator();
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }

  decodeAudioData(data: ArrayBuffer): Promise<MockAudioBuffer> {
    const length = data.byteLength / 4 || 1;
    return Promise.resolve(new MockAudioBuffer(2, length, this.sampleRate));
  }
}

Object.defineProperty(globalThis, 'AudioBuffer', {
  writable: true,
  value: MockAudioBuffer,
});

Object.defineProperty(globalThis, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

Object.defineProperty(globalThis, 'OfflineAudioContext', {
  writable: true,
  value: MockOfflineAudioContext,
});

// URL helpers used by downloadBlob
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}

if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}
