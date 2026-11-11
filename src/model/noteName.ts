import type { Pitch } from './types';

/** Special German names where the general rule ("-is", "-es") does not apply. */
const SPECIAL: Record<string, string> = { 'E-1': 'es', 'A-1': 'as', 'B-1': 'b', 'B0': 'h' };

/**
 * German note name with octave marks: C4 → c', F5 → f'', B4 → h', Bb4 → b'.
 * Octave 3 = small octave (c), octave 2 = great octave (C).
 */
export function germanNoteName(p: Pitch): string {
  const base = p.step.toLowerCase();
  const name =
    SPECIAL[`${p.step}${p.alter}`] ?? base + (p.alter === 1 ? 'is' : p.alter === -1 ? 'es' : '');
  if (p.octave >= 3) return name + "'".repeat(p.octave - 3);
  return name[0].toUpperCase() + name.slice(1) + ','.repeat(2 - p.octave);
}
