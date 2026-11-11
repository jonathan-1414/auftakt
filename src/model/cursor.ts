import { firstFreeTick, measureLength } from './measure';
import type { Position, Score } from './types';

/** Where the cursor goes after a note of `ticks` length was placed at `at`. */
export function advanceCursor(score: Score, at: Position, ticks: number): Position {
  const length = measureLength(score.timeSignature);
  const tick = at.tick + ticks;
  const measureCount = score.staves[at.staff].measures.length;
  if (tick < length || at.measure === measureCount - 1) return { ...at, tick };
  const next = at.measure + 1;
  return { staff: at.staff, measure: next, tick: firstFreeTick(score.staves[at.staff].measures[next]) ?? 0 };
}

/**
 * Tapping into a measure. In the cursor's measure the note goes to the cursor.
 * In another measure the cursor first jumps to the first free spot there;
 * if that measure is full, the cursor goes to its end and no note is placed.
 */
export function cursorForTap(
  score: Score,
  cursor: Position,
  measure: number,
): { cursor: Position; place: boolean } {
  if (measure === cursor.measure) return { cursor, place: true };
  const free = firstFreeTick(score.staves[cursor.staff].measures[measure]);
  if (free === null) {
    return { cursor: { staff: cursor.staff, measure, tick: measureLength(score.timeSignature) }, place: false };
  }
  return { cursor: { staff: cursor.staff, measure, tick: free }, place: true };
}
