import { describe, expect, it } from 'vitest';
import { p } from '../test/helpers';
import { germanNoteName } from './noteName';

describe('germanNoteName', () => {
  it("names the Modul 1 range c'–f''", () => {
    const names = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'].map((s) =>
      germanNoteName(p(s)),
    );
    expect(names).toEqual(["c'", "d'", "e'", "f'", "g'", "a'", "h'", "c''", "d''", "e''", "f''"]);
  });

  it('uses B = H and b for B flat', () => {
    expect(germanNoteName(p('B4'))).toBe("h'");
    expect(germanNoteName(p('Bb4'))).toBe("b'");
  });

  it('names sharps and flats', () => {
    expect(germanNoteName(p('F#4'))).toBe("fis'");
    expect(germanNoteName(p('Eb4'))).toBe("es'");
    expect(germanNoteName(p('Ab4'))).toBe("as'");
    expect(germanNoteName(p('Db5'))).toBe("des''");
  });

  it('names lower octaves', () => {
    expect(germanNoteName(p('C3'))).toBe('c');
    expect(germanNoteName(p('C2'))).toBe('C');
    expect(germanNoteName(p('C1'))).toBe('C,');
  });
});
