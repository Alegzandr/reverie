import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFullscreenAutoHide } from './useFullscreenAutoHide';
import { FULLSCREEN_CHROME } from '../constants';

const setFullscreen = (el: Element | null) => {
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => el });
  document.dispatchEvent(new Event('fullscreenchange'));
};

const move = (x: number, y: number) =>
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }));

describe('useFullscreenAutoHide', () => {
  let shell: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    shell = document.createElement('div');
    document.body.appendChild(shell);
    setFullscreen(null);
  });

  afterEach(() => {
    setFullscreen(null);
    shell.remove();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  const mount = (enabled = true) => renderHook(() => useFullscreenAutoHide({ current: shell }, enabled));

  it('does nothing outside fullscreen', () => {
    mount();
    vi.advanceTimersByTime(FULLSCREEN_CHROME.IDLE_HIDE_DELAY_MS * 2);
    expect(shell.classList.contains('chrome-autohide')).toBe(false);
    expect(shell.classList.contains('chrome-idle')).toBe(false);
  });

  it('hides after the idle delay in fullscreen and reveals on movement', () => {
    mount();
    setFullscreen(document.documentElement);
    expect(shell.classList.contains('chrome-autohide')).toBe(true);

    vi.advanceTimersByTime(FULLSCREEN_CHROME.IDLE_HIDE_DELAY_MS - 1);
    expect(shell.classList.contains('chrome-idle')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(shell.classList.contains('chrome-idle')).toBe(true);

    move(10, 10);
    expect(shell.classList.contains('chrome-idle')).toBe(false);
    vi.advanceTimersByTime(FULLSCREEN_CHROME.IDLE_HIDE_DELAY_MS);
    expect(shell.classList.contains('chrome-idle')).toBe(true);
  });

  it('ignores pointermoves that do not actually move', () => {
    mount();
    setFullscreen(document.documentElement);
    move(5, 5);
    vi.advanceTimersByTime(FULLSCREEN_CHROME.IDLE_HIDE_DELAY_MS);
    expect(shell.classList.contains('chrome-idle')).toBe(true);
    move(5, 5);
    expect(shell.classList.contains('chrome-idle')).toBe(true);
  });

  it('reveals on keyboard input', () => {
    mount();
    setFullscreen(document.documentElement);
    vi.advanceTimersByTime(FULLSCREEN_CHROME.IDLE_HIDE_DELAY_MS);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(shell.classList.contains('chrome-idle')).toBe(false);
  });

  it('stays visible while a dialog or menu is open', () => {
    mount();
    setFullscreen(document.documentElement);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
    vi.advanceTimersByTime(FULLSCREEN_CHROME.IDLE_HIDE_DELAY_MS * 3);
    expect(shell.classList.contains('chrome-idle')).toBe(false);

    dialog.remove();
    vi.advanceTimersByTime(FULLSCREEN_CHROME.IDLE_HIDE_DELAY_MS);
    expect(shell.classList.contains('chrome-idle')).toBe(true);
  });

  it('restores the panels when leaving fullscreen or unmounting', () => {
    const { unmount } = mount();
    setFullscreen(document.documentElement);
    vi.advanceTimersByTime(FULLSCREEN_CHROME.IDLE_HIDE_DELAY_MS);
    setFullscreen(null);
    expect(shell.className).toBe('');

    setFullscreen(document.documentElement);
    unmount();
    expect(shell.className).toBe('');
  });

  it('stays inert when disabled', () => {
    mount(false);
    setFullscreen(document.documentElement);
    expect(shell.classList.contains('chrome-autohide')).toBe(false);
  });
});
