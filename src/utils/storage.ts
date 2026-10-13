// Guarded localStorage access. A `typeof` check alone is not enough: with site
// data blocked, merely touching `localStorage` throws a SecurityError, and a
// full quota makes setItem throw - neither may take the app down, so reads fall
// back and writes become no-ops (the preference just holds for this session).

/** The raw stored string, or null when absent or storage is unreachable. */
export function readStoredString(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readStoredNumber(key: string, fallback: number): number {
  const parsed = parseFloat(readStoredString(key) ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readStoredBool(key: string): boolean {
  return readStoredString(key) === 'true';
}

export function writeStored(key: string, value: string | number | boolean): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(value));
  } catch {
    // Quota exceeded or storage blocked - nothing to persist to.
  }
}

export function removeStored(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    // Storage blocked - nothing to remove from.
  }
}
