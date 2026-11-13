import { firstFreeTick, isOccupant, measureLength, placeEvents } from './measure';
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
 * Where a note goes when the finger touches the column of the event that starts at `tick`.
 * On a note: at that note (it gets replaced). On an automatic rest: at the start of
 * the gap that rest belongs to, so measures fill from left to right without holes.
 */
export function positionForTap(score: Score, staff: number, measure: number, tick: number): Position {
  const placed = placeEvents(score.staves[staff].measures[measure]);
  let index = placed.findIndex((p) => p.start === tick);
  if (index < 0) return { staff, measure, tick };
  while (index > 0 && !isOccupant(placed[index].event) && !isOccupant(placed[index - 1].event)) index--;
  return { staff, measure, tick: placed[index].start };
}
