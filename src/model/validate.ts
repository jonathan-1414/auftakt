import type { ModuleConfig } from '../modules/types';
import { measureLength } from './measure';
import { isInRange } from './pitch';
import type { Pitch, Score, ScoreEvent } from './types';

/**
 * Checks data read from outside (browser storage, later files) before the app uses it.
 * Returns the score if it is a complete, valid score for this module, otherwise null.
 * The app never trusts stored data blindly: a broken score must not break the app.
 */
export function parseScore(data: unknown, module: ModuleConfig): Score | null {
  if (!isObject(data)) return null;
  if (data.format !== 'auftakt' || data.version !== 1 || data.moduleId !== module.id) return null;

  const meta = data.meta;
  if (!isObject(meta) || typeof meta.title !== 'string' || typeof meta.className !== 'string') return null;
  if (!Array.isArray(meta.names) || !meta.names.every((n) => typeof n === 'string')) return null;

  const ts = data.timeSignature;
  if (!isObject(ts) || !module.timeSignatures.includes(`${ts.beats}/${ts.beatValue}`)) return null;
  if (typeof data.keySignature !== 'number' || !module.keySignatures.includes(data.keySignature)) return null;
  if (typeof data.tempo !== 'number' || typeof data.swing !== 'boolean') return null;

  const length = measureLength({ beats: Number(ts.beats), beatValue: Number(ts.beatValue) });
  const staves = data.staves;
  if (!Array.isArray(staves) || staves.length < 1 || staves.length > module.maxStaves) return null;
  for (const staff of staves) {
    if (!isObject(staff) || typeof staff.id !== 'string' || typeof staff.instrument !== 'string') return null;
    if (staff.clef !== 'treble' && staff.clef !== 'bass') return null;
    if (typeof staff.volume !== 'number') return null;
    const measures = staff.measures;
    if (!Array.isArray(measures) || measures.length !== module.measures) return null;
    for (const measure of measures) {
      if (!Array.isArray(measure) || !measure.every((e) => isValidEvent(e, module))) return null;
      if ((measure as ScoreEvent[]).reduce((sum, e) => sum + e.ticks, 0) !== length) return null;
    }
  }
  return structuredClone(data) as unknown as Score;
}

function isValidEvent(e: unknown, module: ModuleConfig): boolean {
  if (!isObject(e) || typeof e.ticks !== 'number' || e.ticks <= 0) return false;
  if (e.kind === 'rest') return typeof e.auto === 'boolean';
  if (e.kind !== 'note' || !module.durations.includes(e.ticks)) return false;
  const p = e.pitch;
  if (!isObject(p) || !['C', 'D', 'E', 'F', 'G', 'A', 'B'].includes(p.step as string)) return false;
  if (![-1, 0, 1].includes(p.alter as number) || typeof p.octave !== 'number') return false;
  return isInRange(p as unknown as Pitch, module.range);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
