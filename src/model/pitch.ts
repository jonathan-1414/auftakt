import type { Pitch, Step } from './types';

const STEP_SEMITONES: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI note number, e.g. C4 = 60. Used to compare pitches. */
export function pitchToMidi(p: Pitch): number {
  return 12 * (p.octave + 1) + STEP_SEMITONES[p.step] + p.alter;
}

/** Parses strings like 'C4', 'F#5' or 'Bb3'. */
export function parsePitch(text: string): Pitch {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(text);
  if (!match) throw new Error(`Invalid pitch: ${text}`);
  const alter = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return { step: match[1] as Step, alter, octave: Number(match[3]) };
}

export function isInRange(p: Pitch, range: { low: string; high: string }): boolean {
  const midi = pitchToMidi(p);
  return midi >= pitchToMidi(parsePitch(range.low)) && midi <= pitchToMidi(parsePitch(range.high));
}

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Pitch on the top staff line for each clef. */
const TOP_LINE: Record<'treble' | 'bass', Pitch> = {
  treble: { step: 'F', alter: 0, octave: 5 },
  bass: { step: 'A', alter: 0, octave: 3 },
};

/** Counts white keys: C4 = 28, D4 = 29, … (ignores sharps and flats). */
export function diatonicIndex(p: Pitch): number {
  return p.octave * 7 + STEPS.indexOf(p.step);
}

export function pitchFromDiatonic(index: number): Pitch {
  return { step: STEPS[((index % 7) + 7) % 7], alter: 0, octave: Math.floor(index / 7) };
}

/**
 * Pitch for a position on the staff, counted in lines and spaces
 * from the top line: 0 = top line, 1 = space below it, -1 = space above it, …
 */
export function pitchAtStaffPosition(clef: 'treble' | 'bass', stepsBelowTopLine: number): Pitch {
  return pitchFromDiatonic(diatonicIndex(TOP_LINE[clef]) - stepsBelowTopLine);
}
