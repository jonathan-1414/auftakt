import type { ScoreEvent } from './types';

/**
 * The measure check. It only knows two states, "full" and "not full":
 * a measure is full when no automatic rest (gap) is left in it.
 */
export function isMeasureFull(measure: ScoreEvent[]): boolean {
  return !measure.some((event) => event.kind === 'rest' && event.auto);
}
