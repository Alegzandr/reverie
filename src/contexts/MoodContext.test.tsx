import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { MoodProvider, useMood } from './MoodContext';

function renderMoodHook() {
  return renderHook(() => useMood(), {
    wrapper: ({ children }) => <MoodProvider>{children}</MoodProvider>,
  });
}

describe('MoodContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-mood');
  });

  it('uses stored mood and updates document class + attribute', () => {
    localStorage.setItem('mood', 'dark');

    const { result } = renderMoodHook();

    expect(result.current.mood).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-mood')).toBe('dark');
  });

  it('falls back to the default mood (immersive, dark-based) for an unknown stored value', () => {
    localStorage.setItem('mood', 'not-a-mood');

    const { result } = renderMoodHook();

    expect(result.current.mood).toBe('aurora');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('selects an immersive mood: sets data-mood, .dark and .immersive', () => {
    const { result } = renderMoodHook();

    act(() => result.current.setMood('tidal'));

    expect(result.current.mood).toBe('tidal');
    expect(result.current.def.scene).toBe('tidal');
    expect(document.documentElement.getAttribute('data-mood')).toBe('tidal');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('immersive')).toBe(true);
  });

  it('keeps the HUD (.immersive) on for every mood, swapping only base + scene', () => {
    const { result } = renderMoodHook();

    // The HUD is the one interface — on even for the calm light palette.
    act(() => result.current.setMood('light'));
    expect(document.documentElement.classList.contains('immersive')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(result.current.def.scene).toBe('daybreak');

    act(() => result.current.setMood('tidal'));
    expect(document.documentElement.classList.contains('immersive')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('throws when used outside of provider', () => {
    expect(() => renderHook(() => useMood())).toThrow('useMood must be used within MoodProvider');
  });
});
