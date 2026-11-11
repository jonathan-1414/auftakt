import { describe, expect, it } from 'vitest';
import {
  diatonicIndex,
  isInRange,
  parsePitch,
  pitchAtStaffPosition,
  pitchFromDiatonic,
  pitchToMidi,
} from './pitch';

describe('pitch', () => {
  it('parses scientific notation', () => {
    expect(parsePitch('C4')).toEqual({ step: 'C', alter: 0, octave: 4 });
    expect(parsePitch('F#5')).toEqual({ step: 'F', alter: 1, octave: 5 });
    expect(parsePitch('Bb3')).toEqual({ step: 'B', alter: -1, octave: 3 });
    expect(() => parsePitch('H4')).toThrow();
  });

  it('converts to MIDI numbers', () => {
    expect(pitchToMidi(parsePitch('C4'))).toBe(60);
    expect(pitchToMidi(parsePitch('A4'))).toBe(69);
    expect(pitchToMidi(parsePitch('F5'))).toBe(77);
  });

  it("checks the range c'–f''", () => {
    const range = { low: 'C4', high: 'F5' };
    expect(isInRange(parsePitch('C4'), range)).toBe(true);
    expect(isInRange(parsePitch('F5'), range)).toBe(true);
    expect(isInRange(parsePitch('B3'), range)).toBe(false);
    expect(isInRange(parsePitch('G5'), range)).toBe(false);
  });
});

describe('staff positions', () => {
  it('maps lines and spaces of the treble clef', () => {
    const name = (n: number) => {
      const x = pitchAtStaffPosition('treble', n);
      return `${x.step}${x.octave}`;
    };
    expect(name(0)).toBe('F5'); // top line
    expect(name(1)).toBe('E5');
    expect(name(4)).toBe('B4'); // middle line
    expect(name(8)).toBe('E4'); // bottom line
    expect(name(10)).toBe('C4'); // ledger line below
    expect(name(-1)).toBe('G5');
  });

  it('counts white keys', () => {
    expect(diatonicIndex(parsePitch('C4'))).toBe(28);
    expect(pitchFromDiatonic(28)).toEqual(parsePitch('C4'));
    expect(pitchFromDiatonic(27)).toEqual(parsePitch('B3'));
  });
});
