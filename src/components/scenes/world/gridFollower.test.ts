import { describe, expect, it } from 'vitest';
import type { BeatGrid } from '../../../utils/beatGrid';
import { createGridFollower } from './gridFollower';

const grid: BeatGrid = {
  times: Float64Array.from({ length: 20 }, (_, i) => 1 + i * 0.5),
  strength: Float32Array.from({ length: 20 }, (_, i) => (i < 10 ? 1 : 0.25)),
  period: 0.5,
};

/** Plays from `from` to `to` at `rate` (source seconds per real second), 60 fps; returns nod times. */
function play(follower: ReturnType<typeof createGridFollower>, from: number, to: number, lead = 0, rate = 1) {
  const nods: number[] = [];
  for (let p = from; p <= to; p += rate / 60) if (follower.update(grid, p, lead).nod) nods.push(p);
  return nods;
}

describe('createGridFollower', () => {
  it('nods once per grid time, on the frame the playhead crosses it', () => {
    const f = createGridFollower();
    const nods = play(f, 0, 3.2);
    expect(nods.length).toBe(5);
    nods.forEach((p, i) => expect(p - (1 + i * 0.5)).toBeGreaterThanOrEqual(0));
    nods.forEach((p, i) => expect(p - (1 + i * 0.5)).toBeLessThan(1 / 60 + 1e-9));
  });

  it('fires `lead` seconds early', () => {
    const nods = play(createGridFollower(), 0, 1.2, 0.1);
    expect(nods[0]).toBeGreaterThanOrEqual(0.9);
    expect(nods[0]).toBeLessThan(0.9 + 1 / 60);
  });

  it("carries each nod's strength", () => {
    const f = createGridFollower();
    play(f, 0, 5.6);
    let frame = f.update(grid, 5.6, 0);
    for (let p = 5.6; !frame.nod; p += 1 / 60) frame = f.update(grid, p, 0);
    expect(frame.confidence).toBe(0.25);
  });

  it('does not fire the beats a seek jumps over, nor while paused', () => {
    const f = createGridFollower();
    play(f, 0, 1.2);
    expect(f.update(grid, 6.01, 0).nod).toBe(false);
    for (let i = 0; i < 30; i += 1) expect(f.update(grid, 6.2, 0).nod).toBe(false);
    expect(play(f, 6.2, 6.6).length).toBe(1);
    // Seeking back re-aims without firing.
    expect(f.update(grid, 2.0, 0).nod).toBe(false);
    expect(play(f, 2.0, 2.6).length).toBe(1);
  });

  it('follows the playhead through a speed change', () => {
    expect(play(createGridFollower(), 0, 3.2, 0, 0.8).length).toBe(5);
  });
});
