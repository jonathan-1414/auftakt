import type { ModuleConfig } from '../modules/types';
import { buildMeasure, isOccupant, measureLength, placeEvents } from './measure';
import { isInRange } from './pitch';
import type { Pitch, Position, Score, ScoreEvent } from './types';

/**
 * All edit functions are pure: they never change the given score,
 * they return a new one (or the reason why the edit is not allowed).
 */
export type EditError =
  | 'invalid-position' // staff or measure does not exist
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

/** Can a note of this value be placed here? (Used to grey out values in the toolbar.) */
export function canPlace(score: Score, module: ModuleConfig, at: Position, ticks: number): boolean {
  if (!module.durations.includes(ticks) || !getMeasure(score, at)) return false;
  return at.tick >= 0 && at.tick + ticks <= measureLength(score.timeSignature);
}

/**
 * Places a note. It replaces whatever is in its way; the leftover parts
 * of replaced notes become automatic rests.
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
  if (!canPlace(score, module, at, ticks)) return fail('does-not-fit');

  const end = at.tick + ticks;
  const kept = placeEvents(measure).filter(
    (p) => isOccupant(p.event) && (p.start + p.event.ticks <= at.tick || p.start >= end),
  );
  kept.push({ start: at.tick, event: { kind: 'note', pitch: { ...pitch }, ticks } });
  kept.sort((a, b) => a.start - b.start);
  return { ok: true, score: withMeasure(score, at, buildMeasure(kept, measureLength(score.timeSignature))) };
}

/** Deletes the note that starts at this position; it becomes an automatic rest. */
export function deleteNote(score: Score, at: Position): EditResult {
  const measure = getMeasure(score, at);
  if (!measure) return fail('invalid-position');
  const placed = placeEvents(measure);
  if (!placed.some((p) => p.start === at.tick && p.event.kind === 'note')) return fail('no-note');

  const kept = placed.filter((p) => isOccupant(p.event) && p.start !== at.tick);
  return { ok: true, score: withMeasure(score, at, buildMeasure(kept, measureLength(score.timeSignature))) };
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
 * Shorter: the rest of the old note becomes a gap. Longer: it replaces what follows
 * (like placing a note). It fails if the longer note would not fit into the measure.
 */
export function changeDuration(score: Score, module: ModuleConfig, at: Position, ticks: number): EditResult {
  const measure = getMeasure(score, at);
  if (!measure) return fail('invalid-position');
  const note = placeEvents(measure).find((p) => p.start === at.tick && p.event.kind === 'note')?.event;
  if (!note || note.kind !== 'note') return fail('no-note');
  return setNote(score, module, at, note.pitch, ticks);
}
