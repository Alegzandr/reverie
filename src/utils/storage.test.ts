import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStoredBool, readStoredNumber, readStoredString, removeStored, writeStored } from './storage';

describe('storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('round-trips values when storage works', () => {
    writeStored('k:num', 0.4);
    writeStored('k:bool', true);
    expect(readStoredNumber('k:num', 1)).toBe(0.4);
    expect(readStoredBool('k:bool')).toBe(true);
    removeStored('k:bool');
    expect(readStoredBool('k:bool')).toBe(false);
  });

  it('falls back instead of throwing when site data is blocked (SecurityError on access)', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    expect(readStoredNumber('k:num', 0.7)).toBe(0.7);
    expect(readStoredBool('k:bool')).toBe(false);
    expect(readStoredString('k:str')).toBeNull();
    expect(() => writeStored('k:num', 1)).not.toThrow();
    expect(() => removeStored('k:num')).not.toThrow();
  });

  it('turns a write over quota into a no-op', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => writeStored('k:num', 1)).not.toThrow();
  });
});
