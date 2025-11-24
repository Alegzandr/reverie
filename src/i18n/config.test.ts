import { describe, it, expect } from 'vitest';
import i18n from './config';

describe('i18n configuration', () => {
  it('initializes with resources and detection', () => {
    const resources = i18n.options.resources as Record<string, unknown>;
    expect(Object.keys(resources)).toEqual(['en', 'fr', 'es', 'de', 'pt', 'ru', 'zh', 'ja', 'ko', 'hi']);
    expect(i18n.options.fallbackLng).toContain('en');
    expect(i18n.options.interpolation?.escapeValue).toBe(false);
    expect((i18n.options.detection as any).order).toEqual(['path', 'localStorage', 'navigator']);
    expect(i18n.language).toBeDefined();
  });
});
