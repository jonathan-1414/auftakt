import { describe, expect, it } from 'vitest';
import { isInRange, parsePitch, pitchToMidi } from './pitch';

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
