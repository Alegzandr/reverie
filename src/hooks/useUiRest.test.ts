import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetUiRestStore, toggleUiRest, useUiRestPreference } from './useUiRest';
import { resetDurationDisplayStores, toggleDurationDisplay, useDurationDisplayMode } from './useDurationDisplayMode';

const blockStorage = () =>
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  });

describe('preference stores with storage blocked', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetUiRestStore();
    resetDurationDisplayStores();
  });

  it('the resting-interface preference defaults on and still toggles for the session', () => {
    blockStorage();
    const { result, rerender } = renderHook(() => useUiRestPreference());
    expect(result.current).toBe(true);
    toggleUiRest();
    rerender();
    expect(result.current).toBe(false);
  });

  it('the duration display preference defaults to total and still toggles for the session', () => {
    blockStorage();
    const { result, rerender } = renderHook(() => useDurationDisplayMode('k:display'));
    expect(result.current).toBe(false);
    toggleDurationDisplay('k:display');
    rerender();
    expect(result.current).toBe(true);
  });
});
