import { describe, expect, it } from 'vitest';
import { modul1 } from '../modules/modul1';
import { p } from '../test/helpers';
import { advanceCursor, cursorForTap } from './cursor';
import { setNote } from './edit';
import { createEmptyScore } from './score';
import type { Score } from './types';

const at = (measure: number, tick: number) => ({ staff: 0, measure, tick });

function fill(score: Score, measure: number): Score {
  const result = setNote(score, modul1, at(measure, 0), p('C4'), 192);
  if (!result.ok) throw new Error(result.error);
  return result.score;
}

describe('advanceCursor', () => {
  it('moves on by the length of the note', () => {
    expect(advanceCursor(createEmptyScore(modul1), at(0, 0), 48)).toEqual(at(0, 48));
  });

  it('jumps to the next measure when the measure is complete', () => {
    expect(advanceCursor(createEmptyScore(modul1), at(0, 144), 48)).toEqual(at(1, 0));
  });

  it('jumps to the first free spot of the next measure', () => {
    const score = setNote(createEmptyScore(modul1), modul1, at(1, 0), p('C4'), 96);
    if (!score.ok) throw new Error();
    expect(advanceCursor(score.score, at(0, 96), 96)).toEqual(at(1, 96));
  });

  it('stays at the end of the last measure', () => {
    expect(advanceCursor(createEmptyScore(modul1), at(3, 96), 96)).toEqual(at(3, 192));
  });
});

describe('cursorForTap', () => {
  it("places at the cursor in the cursor's measure", () => {
    expect(cursorForTap(createEmptyScore(modul1), at(0, 48), 0)).toEqual({ cursor: at(0, 48), place: true });
  });

  it('jumps to the first free spot of another measure', () => {
    expect(cursorForTap(createEmptyScore(modul1), at(0, 48), 2)).toEqual({ cursor: at(2, 0), place: true });
  });

  it('places nothing in a full measure and puts the cursor at its end', () => {
    const score = fill(createEmptyScore(modul1), 2);
    expect(cursorForTap(score, at(0, 0), 2)).toEqual({ cursor: at(2, 192), place: false });
  });
});
