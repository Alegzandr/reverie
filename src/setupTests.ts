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

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel];
  }
}

class MockGainNode {
  gain = { value: 1 };
  connect = vi.fn();
}

class MockBufferSource {
  buffer: MockAudioBuffer | null = null;
  playbackRate = { value: 1 };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
}

class MockScriptProcessor {
  onaudioprocess: ((this: ScriptProcessorNode, ev: AudioProcessingEvent) => any) | null = null;
  connect = vi.fn();
}

class MockConvolverNode {
  buffer: MockAudioBuffer | null = null;
  connect = vi.fn();
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

  createGain() {
    return new MockGainNode();
  }

  createBufferSource() {
    return new MockBufferSource();
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
