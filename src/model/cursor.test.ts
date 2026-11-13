import { describe, expect, it } from 'vitest';
import { modul1 } from '../modules/modul1';
import { p } from '../test/helpers';
import { advanceCursor, positionForTap } from './cursor';
import { setNote } from './edit';
import { createEmptyScore } from './score';
import type { Score } from './types';

const at = (measure: number, tick: number) => ({ staff: 0, measure, tick });

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

  it('does not go back past a note', () => {
    const second = setNote(withQuarter(), modul1, at(0, 96), p('D4'), 48);
    if (!second.ok) throw new Error();
    // 0 note, 48 rest, 96 note, 144 rest
    expect(positionForTap(second.score, 0, 0, 144)).toEqual(at(0, 144));
  });
});
