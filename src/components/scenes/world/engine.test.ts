import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCENE_WORLD } from '../../../constants';
import { createWorldEngine } from './engine';

/**
 * A WebGL2 context that accepts every call: methods return a dummy handle,
 * constants read 0. `setupFails` makes shader creation fail (the null path).
 */
function fakeGl(opts: { setupFails?: boolean } = {}) {
  let lost = false;
  const overrides: Record<string, unknown> = {
    isContextLost: () => lost,
    getExtension: () => null,
    createShader: () => (opts.setupFails ? null : {}),
    getProgramParameter: () => true,
    getUniformLocation: () => ({}),
  };
  const gl = new Proxy(
    {},
    {
      get: (_, prop: string) => {
        if (prop in overrides) return overrides[prop];
        if (/^[A-Z0-9_]+$/.test(prop)) return 0;
        return () => ({});
      },
    },
  );
  return { gl, lose: () => (lost = true), restore: () => (lost = false) };
}

let rafQueue: FrameRequestCallback[] = [];

beforeEach(() => {
  rafQueue = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => rafQueue.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {
    rafQueue = [];
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const canvasWith = (gl: unknown) => {
  const canvas = document.createElement('canvas');
  canvas.getContext = (() => gl) as unknown as typeof canvas.getContext;
  return canvas;
};

const options = (extra = {}) => ({ getAnalyser: () => null, world: 'nebula' as const, still: false, ...extra });

describe('createWorldEngine', () => {
  it('unhooks everything it attached when the setup fails', () => {
    const { gl } = fakeGl({ setupFails: true });
    const canvas = canvasWith(gl);
    const addWindow = vi.spyOn(window, 'addEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const addDoc = vi.spyOn(document, 'addEventListener');
    const removeDoc = vi.spyOn(document, 'removeEventListener');
    const addCanvas = vi.spyOn(canvas, 'addEventListener');
    const removeCanvas = vi.spyOn(canvas, 'removeEventListener');

    expect(createWorldEngine(canvas, options())).toBeNull();

    const pairs: [typeof addWindow, typeof removeWindow][] = [
      [addWindow, removeWindow],
      [addDoc, removeDoc],
      [addCanvas, removeCanvas] as never,
    ];
    for (const [add, remove] of pairs) {
      for (const [type, fn] of add.mock.calls) expect(remove).toHaveBeenCalledWith(type, fn);
    }
    expect(addCanvas.mock.calls.map(([t]) => t)).toEqual(expect.arrayContaining(['webglcontextlost', 'webglcontextrestored']));
    expect(rafQueue).toHaveLength(0);
  });

  it('reports a lost context, waits for its restore, and gives up after a while', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { gl, lose } = fakeGl();
    const canvas = canvasWith(gl);
    const onLost = vi.fn();
    const onFail = vi.fn();
    const engine = createWorldEngine(canvas, options({ onLost, onFail }));
    expect(engine).not.toBeNull();

    lose();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(onLost).toHaveBeenCalledTimes(1);
    expect(rafQueue).toHaveLength(0);

    // Coming back to the tab must not restart the loop on a dead context.
    document.dispatchEvent(new Event('visibilitychange'));
    expect(rafQueue).toHaveLength(0);

    vi.advanceTimersByTime(SCENE_WORLD.CONTEXT_RESTORE_TIMEOUT_MS);
    expect(onFail).toHaveBeenCalledTimes(1);
    engine?.dispose();
  });

  it('does not give up on a context that comes back', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { gl, lose, restore } = fakeGl();
    const canvas = canvasWith(gl);
    const onFail = vi.fn();
    const engine = createWorldEngine(canvas, options({ onFail }));
    lose();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    restore();
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(onFail).not.toHaveBeenCalled();
    expect(rafQueue.length).toBeGreaterThan(0);
    vi.advanceTimersByTime(SCENE_WORLD.CONTEXT_RESTORE_TIMEOUT_MS * 2);
    expect(onFail).not.toHaveBeenCalled();
    engine?.dispose();
  });
});
