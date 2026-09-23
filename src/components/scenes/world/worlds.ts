import { NEBULA } from './shaders/nebula';
import { SINGULARITY } from './shaders/singularity';
import { TIDE } from './shaders/tide';
import { VALLEY } from './shaders/valley';
import { BOREALIS } from './shaders/borealis';
import { DAYBREAK } from './shaders/daybreak';

/**
 * The world registry: one fragment program per world, and how fast each one
 * travels (the engine integrates `uTravel` at this base speed, nudged by the
 * music's level and bass - kept slow on purpose: these are places to linger).
 */
export type WorldId = 'nebula' | 'singularity' | 'tide' | 'valley' | 'borealis' | 'daybreak';

export const WORLD_SHADERS: Record<WorldId, string> = {
  nebula: NEBULA,
  singularity: SINGULARITY,
  tide: TIDE,
  valley: VALLEY,
  borealis: BOREALIS,
  daybreak: DAYBREAK,
};

export const WORLD_SPEED: Record<WorldId, number> = {
  nebula: 0.7,
  singularity: 0.8,
  tide: 0.7,
  valley: 1,
  borealis: 1,
  daybreak: 0.8,
};
