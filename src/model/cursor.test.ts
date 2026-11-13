import { describe, expect, it } from 'vitest';
import { modul1 } from '../modules/modul1';
import { p } from '../test/helpers';
import { advanceCursor, positionForTap } from './cursor';
import { setNote } from './edit';
import { createEmptyScore } from './score';
import type { Score } from './types';

const at = (measure: number, tick: number) => ({ staff: 0, measure, tick });

describe('advanceCursor', () => {
  function placed(notes: Array<[number, number, number]>): Score {
    return notes.reduce((score, [measure, tick, ticks]) => {
      const result = setNote(score, modul1, at(measure, tick), p('C4'), ticks);
      if (!result.ok) throw new Error(result.error);
      return result.score;
    }, createEmptyScore(modul1));
  }

  it('goes behind the last note of the measure', () => {
    expect(advanceCursor(placed([[0, 0, 48]]), at(0, 0))).toEqual(at(0, 48));
  });

  it('goes behind the last note also after replacing a note in the middle', () => {
    const score = placed([[0, 0, 48], [0, 48, 48], [0, 96, 48], [0, 48, 24]]);
    expect(advanceCursor(score, at(0, 48))).toEqual(at(0, 120));
  });

  it('jumps to the first free spot of the next measure when the measure is full', () => {
    expect(advanceCursor(placed([[1, 0, 96], [0, 0, 192]]), at(0, 0))).toEqual(at(1, 96));
  });

  it('stays at the end of the last measure', () => {
    expect(advanceCursor(placed([[3, 0, 192]]), at(3, 0))).toEqual(at(3, 192));
  });
});

describe('positionForTap', () => {
  // Measure 0: quarter C4, then (auto rests) quarter, half → note at 0, gap 48..192.
  function withQuarter(): Score {
    const result = setNote(createEmptyScore(modul1), modul1, at(0, 0), p('C4'), 48);
    if (!result.ok) throw new Error(result.error);
    return result.score;
  }

  it('goes to a note to replace it', () => {
    expect(positionForTap(withQuarter(), 0, 0, 0)).toEqual(at(0, 0));
  });

  it('goes to the start of the gap when a rest is touched', () => {
    expect(positionForTap(withQuarter(), 0, 0, 48)).toEqual(at(0, 48));
    expect(positionForTap(withQuarter(), 0, 0, 96)).toEqual(at(0, 48));
  });

  it('goes to the start of an empty measure', () => {
    expect(positionForTap(createEmptyScore(modul1), 0, 2, 0)).toEqual(at(2, 0));
  });

  it('goes behind the last note when the free space is touched', () => {
    const second = setNote(withQuarter(), modul1, at(0, 48), p('D4'), 48);
    if (!second.ok) throw new Error();
    expect(positionForTap(second.score, 0, 0, 96)).toEqual(at(0, 96));
  });

  it('goes to the end of a full measure when there is no free space', () => {
    const full = setNote(createEmptyScore(modul1), modul1, at(1, 0), p('C4'), 192);
    if (!full.ok) throw new Error();
    expect(positionForTap(full.score, 0, 1, 0)).toEqual(at(1, 0)); // the note itself
  });
});
