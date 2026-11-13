import { describe, expect, it } from 'vitest';
import { modul1 } from '../modules/modul1';
import { p } from '../test/helpers';
import { isMeasureFull } from './check';
import { setNote } from './edit';
import { createEmptyScore } from './score';

function full(notes: Array<[number, number]>): boolean {
  let score = createEmptyScore(modul1);
  for (const [tick, ticks] of notes) {
    const result = setNote(score, modul1, { staff: 0, measure: 0, tick }, p('C4'), ticks);
    if (!result.ok) throw new Error(result.error);
    score = result.score;
  }
  return isMeasureFull(score.staves[0].measures[0]);
}

describe('measure check', () => {
  it('an empty measure is not full', () => {
    expect(full([])).toBe(false);
  });

  it('a started measure is not full', () => {
    expect(full([[0, 48]])).toBe(false);
    expect(full([[0, 96], [96, 48]])).toBe(false);
  });

  it('a gap in the middle means not full', () => {
    expect(full([[0, 96], [144, 48]])).toBe(false);
  });

  it('a filled measure is full', () => {
    expect(full([[0, 192]])).toBe(true);
    expect(full([[0, 96], [96, 48], [144, 24], [168, 24]])).toBe(true);
  });
});
