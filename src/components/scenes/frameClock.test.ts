import { describe, expect, it } from 'vitest';
import { LIVE_FRAME_MS, createFrameGate } from './frameClock';

/** Feeds `seconds` of rAF ticks at `hz` through a fresh gate; returns draws per second. */
function drawRate(hz: number, seconds = 2): number {
  const gate = createFrameGate();
  const period = 1000 / hz;
  let draws = 0;
  for (let i = 0; i < hz * seconds; i++) if (gate(i * period)) draws++;
  return draws / seconds;
}

describe('createFrameGate', () => {
  it('never drops a frame on a 60Hz display', () => {
    expect(drawRate(60)).toBe(60);
  });

  it('caps high-refresh displays on a whole divisor of the rate', () => {
    expect(drawRate(480)).toBeCloseTo(120, 0);
    expect(drawRate(240)).toBeCloseTo(120, 0);
    expect(drawRate(144)).toBe(144);
  });

  it('keeps even pacing (no alternating gaps) at 480Hz', () => {
    const gate = createFrameGate();
    const period = 1000 / 480;
    const drawn: number[] = [];
    for (let i = 0; i < 960; i++) if (gate(i * period)) drawn.push(i);
    const gaps = new Set(drawn.slice(20).map((f, k, a) => (k ? f - a[k - 1] : 4)));
    expect([...gaps]).toEqual([4]);
  });

  it('draws when the timestamp is missing (mocked rAF)', () => {
    const gate = createFrameGate(LIVE_FRAME_MS);
    expect(gate(undefined as unknown as number)).toBe(true);
    expect(gate(undefined as unknown as number)).toBe(true);
  });
});
