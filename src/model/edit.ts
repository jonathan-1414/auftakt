import type { ModuleConfig } from '../modules/types';
import { buildMeasure, isOccupant, measureLength, placeEvents } from './measure';
import { isInRange } from './pitch';
import type { Pitch, Position, Score, ScoreEvent } from './types';

/**
 * All edit functions are pure: they never change the given score,
 * they return a new one (or the reason why the edit is not allowed).
 */
export type EditError =
  | 'invalid-position' // staff or measure does not exist, or the tick lies inside a note
  | 'duration-not-allowed' // note value not in this module
  | 'out-of-range' // pitch outside the module's range
  | 'does-not-fit' // note would go past the end of the measure
  | 'no-note'; // there is no note at this position

export type EditResult = { ok: true; score: Score } | { ok: false; error: EditError };

function fail(error: EditError): EditResult {
  return { ok: false, error };
}

function getMeasure(score: Score, at: Position): ScoreEvent[] | undefined {
  return score.staves[at.staff]?.measures[at.measure];
}

function withMeasure(score: Score, at: Position, measure: ScoreEvent[]): Score {
  const copy = structuredClone(score);
  copy.staves[at.staff].measures[at.measure] = measure;
  return copy;
}

/** The user's events of a measure (notes, later also manual rests), in order, without gaps. */
function occupantsOf(measure: ScoreEvent[]): ScoreEvent[] {
  return measure.filter(isOccupant);
}

/** Packs events from the start of the measure; the free space at the end becomes a gap. */
function packed(events: ScoreEvent[], length: number): ScoreEvent[] {
  let start = 0;
  const placed = events.map((event) => {
    const p = { start, event };
    start += event.ticks;
    return p;
  });
  return buildMeasure(placed, length);
}

/**
 * Where a new event goes in the row of events: replacing the one that starts at
 * `tick`, or appended after the last one (any tick in the free space at the end).
 * Null if the tick lies inside an event.
 */
function slotAt(events: ScoreEvent[], tick: number): { index: number; replace: boolean } | null {
  let start = 0;
  for (let index = 0; index < events.length; index++) {
    if (start === tick) return { index, replace: true };
    start += events[index].ticks;
    if (tick < start) return null;
  }
  return tick >= start ? { index: events.length, replace: false } : null;
}

/** The row of events after putting `event` at `tick`, or null if that is not a slot. */
function withEventAt(events: ScoreEvent[], tick: number, event: ScoreEvent): ScoreEvent[] | null {
  const slot = slotAt(events, tick);
  if (!slot) return null;
  const result = [...events];
  result.splice(slot.index, slot.replace ? 1 : 0, event);
  return result;
}

const totalTicks = (events: ScoreEvent[]) => events.reduce((sum, e) => sum + e.ticks, 0);

/** Can a note of this value be placed here (does everything still fit into the measure)? */
export function canPlace(score: Score, module: ModuleConfig, at: Position, ticks: number): boolean {
  const measure = getMeasure(score, at);
  if (!module.durations.includes(ticks) || !measure) return false;
  const placeholder: ScoreEvent = { kind: 'rest', ticks, auto: false };
  const result = withEventAt(occupantsOf(measure), at.tick, placeholder);
  return result !== null && totalTicks(result) <= measureLength(score.timeSignature);
}

/**
 * Places a note. Notes in a measure always stand together from the start, like letters
 * in a word; free space is only at the end. On a note, the new note replaces it and
 * the following notes move along (left if shorter, right if longer). In the free space,
 * the note is appended. If the notes would no longer fit into the measure, nothing changes.
 */
export function setNote(
  score: Score,
  module: ModuleConfig,
  at: Position,
  pitch: Pitch,
  ticks: number,
): EditResult {
  const measure = getMeasure(score, at);
  if (!measure) return fail('invalid-position');
  if (!module.durations.includes(ticks)) return fail('duration-not-allowed');
  if (!isInRange(pitch, module.range)) return fail('out-of-range');
  const events = withEventAt(occupantsOf(measure), at.tick, { kind: 'note', pitch: { ...pitch }, ticks });
  if (!events) return fail('invalid-position');
  const length = measureLength(score.timeSignature);
  if (totalTicks(events) > length) return fail('does-not-fit');
  return { ok: true, score: withMeasure(score, at, packed(events, length)) };
}

/** Deletes the note that starts at this position; the following notes move left. */
export function deleteNote(score: Score, at: Position): EditResult {
  const measure = getMeasure(score, at);
  if (!measure) return fail('invalid-position');
  const events = occupantsOf(measure);
  const slot = slotAt(events, at.tick);
  if (!slot?.replace || events[slot.index].kind !== 'note') return fail('no-note');
  events.splice(slot.index, 1);
  return { ok: true, score: withMeasure(score, at, packed(events, measureLength(score.timeSignature))) };
}

/** Changes the pitch of the note that starts at this position. */
export function changePitch(score: Score, module: ModuleConfig, at: Position, pitch: Pitch): EditResult {
  const measure = getMeasure(score, at);
  if (!measure) return fail('invalid-position');
  if (!isInRange(pitch, module.range)) return fail('out-of-range');
  const index = placeEvents(measure).findIndex((p) => p.start === at.tick && p.event.kind === 'note');
  if (index < 0) return fail('no-note');

  const updated = measure.map((event, i) => (i === index ? { ...event, pitch: { ...pitch } } : event));
  return { ok: true, score: withMeasure(score, at, updated) };
}

/**
 * Changes the note value of the note that starts at this position; the pitch stays.
 * The following notes move along (left if shorter, right if longer).
 * It fails if the notes would no longer fit into the measure.
 */
export function changeDuration(score: Score, module: ModuleConfig, at: Position, ticks: number): EditResult {
  const measure = getMeasure(score, at);
  if (!measure) return fail('invalid-position');
  const note = placeEvents(measure).find((p) => p.start === at.tick && p.event.kind === 'note')?.event;
  if (!note || note.kind !== 'note') return fail('no-note');
  return setNote(score, module, at, note.pitch, ticks);
}
