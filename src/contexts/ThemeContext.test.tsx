import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

function renderThemeHook() {
  return renderHook(() => useTheme(), {
    wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
  });
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('uses stored theme and updates document class + attribute', () => {
    localStorage.setItem('theme', 'dark');

    const { result } = renderThemeHook();

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('falls back to the default theme (immersive, dark-based) for an unknown stored value', () => {
    localStorage.setItem('theme', 'not-a-theme');

    const { result } = renderThemeHook();

    expect(result.current.theme).toBe('aurora');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles between the workspace faces and persists', () => {
    const { result } = renderThemeHook();

    // Start from a known workspace face (the default is now the immersive
    // Nebula Drift), then verify the light<->dark toggle contract.
    act(() => result.current.setTheme('light'));
    expect(result.current.theme).toBe('light');

    act(() => result.current.toggleTheme());

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('selects an immersive theme: sets data-theme, .dark and .immersive', () => {
    const { result } = renderThemeHook();

    act(() => result.current.setTheme('tidal'));

    expect(result.current.theme).toBe('tidal');
    expect(result.current.def.scene).toBe('tidal');
    expect(document.documentElement.getAttribute('data-theme')).toBe('tidal');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('immersive')).toBe(true);
  });

  it('keeps the HUD (.immersive) on for every theme, swapping only base + scene', () => {
    const { result } = renderThemeHook();

    // The HUD is the one interface — on even for the calm light palette.
    act(() => result.current.setTheme('light'));
    expect(document.documentElement.classList.contains('immersive')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(result.current.def.scene).toBe('daybreak');

    act(() => result.current.setTheme('tidal'));
    expect(document.documentElement.classList.contains('immersive')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('throws when used outside of provider', () => {
    expect(() => renderHook(() => useTheme())).toThrow('useTheme must be used within ThemeProvider');
  });
});
