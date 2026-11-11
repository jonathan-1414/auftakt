import { TICKS_PER_WHOLE } from './constants';
import type { ScoreEvent, TimeSignature } from './types';

/** Rest values used to fill gaps, largest first. */
const REST_VALUES = [192, 96, 48, 24, 12];

export interface PlacedEvent {
  start: number;
  event: ScoreEvent;
}

export function measureLength(ts: TimeSignature): number {
  return ts.beats * (TICKS_PER_WHOLE / ts.beatValue);
}

/** Adds the start tick to every event of a measure. */
export function placeEvents(measure: ScoreEvent[]): PlacedEvent[] {
  let start = 0;
  return measure.map((event) => {
    const placed = { start, event };
    start += event.ticks;
    return placed;
  });
}

/**
 * Automatic rests for a gap, split into readable values that sit on the beat:
 * a rest may only be as long as the position allows (a half rest only on beat 1 or 3, …).
 */
export function autoRests(start: number, length: number): ScoreEvent[] {
  const rests: ScoreEvent[] = [];
  let pos = start;
  let remaining = length;
  while (remaining > 0) {
    const ticks =
      REST_VALUES.find((v) => v <= remaining && pos % v === 0) ??
      REST_VALUES.find((v) => v <= remaining) ??
      remaining;
    rests.push({ kind: 'rest', ticks, auto: true });
    pos += ticks;
    remaining -= ticks;
  }
  return rests;
}

export function emptyMeasure(length: number): ScoreEvent[] {
  return autoRests(0, length);
}

/** Events that the user placed (notes, later also manual rests). */
export function isOccupant(event: ScoreEvent): boolean {
  return event.kind === 'note' || !event.auto;
}

/**
 * Builds a complete measure from the user's events (sorted, not overlapping).
 * Every gap becomes automatic rests, so the measure is always full.
 */
export function buildMeasure(occupants: PlacedEvent[], length: number): ScoreEvent[] {
  const result: ScoreEvent[] = [];
  let pos = 0;
  for (const { start, event } of occupants) {
    if (start > pos) result.push(...autoRests(pos, start - pos));
    result.push(event);
    pos = start + event.ticks;
  }
  if (pos < length) result.push(...autoRests(pos, length - pos));
  return result;
}

/** Start of the first free spot (first automatic rest), or null if the measure is full. */
export function firstFreeTick(measure: ScoreEvent[]): number | null {
  const free = placeEvents(measure).find((p) => !isOccupant(p.event));
  return free ? free.start : null;
}
