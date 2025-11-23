import { describe, it, expect } from 'vitest';
import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import de from './locales/de.json';
import pt from './locales/pt.json';

const dictionaries = { en, fr, es, de, pt } as const;

function flattenKeys(obj: Record<string, any>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return flattenKeys(value, path);
    }
    return [path];
  });
}

function flattenLeafValues(obj: Record<string, any>, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(acc, flattenLeafValues(value, path));
    } else {
      acc[path] = String(value);
    }
    return acc;
  }, {});
}

describe('translation consistency', () => {
  const baseline = flattenKeys(en).sort();

  Object.entries(dictionaries).forEach(([lang, dict]) => {
    it(`${lang} matches english key map`, () => {
      const keys = flattenKeys(dict).sort();
      expect(keys).toEqual(baseline);
    });

    it(`${lang} has no empty translations`, () => {
      const values = Object.values(flattenLeafValues(dict));
      expect(values.every((value) => value.trim().length > 0)).toBe(true);
    });
  });
});
