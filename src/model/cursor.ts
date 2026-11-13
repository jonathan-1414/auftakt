import { firstFreeTick, measureLength, placeEvents } from './measure';
import type { Position, Score } from './types';

/**
 * Where the cursor goes after a note was placed in this measure: behind the last note,
 * where the next one would be appended. If the measure is now full, on to the
 * first free spot of the next measure (the last measure keeps the cursor at its end).
 */
export function advanceCursor(score: Score, at: Position): Position {
  const measures = score.staves[at.staff].measures;
  const free = firstFreeTick(measures[at.measure]);
  if (free !== null) return { ...at, tick: free };
  if (at.measure === measures.length - 1) return { ...at, tick: measureLength(score.timeSignature) };
  const next = at.measure + 1;
  return { staff: at.staff, measure: next, tick: firstFreeTick(measures[next]) ?? 0 };
}

/**
 * Where a note goes when the finger touches the column of the event that starts at `tick`.
 * On a note: at that note (it gets replaced). Anywhere else: behind the last note,
 * because the notes of a measure always stand together from the start.
 */
export function positionForTap(score: Score, staff: number, measure: number, tick: number): Position {
  const events = score.staves[staff].measures[measure];
  const onNote = placeEvents(events).some((p) => p.start === tick && p.event.kind === 'note');
  if (onNote) return { staff, measure, tick };
  return { staff, measure, tick: firstFreeTick(events) ?? measureLength(score.timeSignature) };
}
