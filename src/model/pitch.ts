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
