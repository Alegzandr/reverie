import type { WorldId } from '../components/scenes/world/worlds';
import { SunIcon, MountainsIcon, MoonIcon, PlanetIcon, SparkleIcon, SunHorizonIcon, FlowerIcon, CityIcon } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

/**
 * Mood registry. A mood is a palette (the colour tokens in index.css) plus a
 * living world: a real-time scene painted behind the whole interface that
 * listens to the music (see components/scenes/world). `light` keeps the one
 * bright palette; every other mood is dark-based.
 *
 * Each mood drives three things on <html>: `data-mood="<id>"` (selects the
 * colour-token block in index.css), the `.dark` class (kept so every existing
 * `dark:` utility and `.dark` rule still applies), and `.immersive` (always on:
 * the glass chrome that floats over the world).
 */
export type MoodId = 'light' | 'dark' | 'tidal' | 'nocturne' | 'aurora' | 'horizon' | 'sakura' | 'citypop';

export interface MoodDef {
  id: MoodId;
  /** i18n key under `settings.mood.<key>` for the label. */
  labelKey: string;
  icon: Icon;
  /** Which base the mood sits on - toggles the `.dark` root class. */
  base: 'light' | 'dark';
  /** The living world painted behind the interface. */
  world: WorldId;
}

export const MOODS: Record<MoodId, MoodDef> = {
  aurora: { id: 'aurora', labelKey: 'aurora', icon: SparkleIcon, base: 'dark', world: 'nebula' },
  dark: { id: 'dark', labelKey: 'dark', icon: MountainsIcon, base: 'dark', world: 'borealis' },
  tidal: { id: 'tidal', labelKey: 'tidal', icon: MoonIcon, base: 'dark', world: 'tide' },
  horizon: { id: 'horizon', labelKey: 'horizon', icon: SunHorizonIcon, base: 'dark', world: 'valley' },
  nocturne: { id: 'nocturne', labelKey: 'nocturne', icon: PlanetIcon, base: 'dark', world: 'singularity' },
  sakura: { id: 'sakura', labelKey: 'sakura', icon: FlowerIcon, base: 'dark', world: 'blossom' },
  citypop: { id: 'citypop', labelKey: 'citypop', icon: CityIcon, base: 'dark', world: 'skyline' },
  light: { id: 'light', labelKey: 'light', icon: SunIcon, base: 'light', world: 'daybreak' },
};

/** Switcher order: the default first, then from the calmest night to daylight. */
export const MOOD_ORDER: MoodId[] = ['aurora', 'dark', 'tidal', 'horizon', 'sakura', 'citypop', 'nocturne', 'light'];

/**
 * A still of each world (rendered from the engine itself), shown while the live
 * world compiles, and as the whole backdrop wherever the live one can't run
 * (no WebGL2, software rendering, or the living world switched off). Built from
 * BASE_URL so it resolves under the production base path.
 */
export function worldPoster(world: WorldId): string {
  return `${import.meta.env.BASE_URL}worlds/${world}.webp`;
}

export function worldThumb(world: WorldId): string {
  return `${import.meta.env.BASE_URL}worlds/${world}-thumb.webp`;
}

export const DEFAULT_MOOD: MoodId = 'aurora';

export function isMoodId(value: unknown): value is MoodId {
  return typeof value === 'string' && value in MOODS;
}
