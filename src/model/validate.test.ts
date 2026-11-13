import { describe, expect, it } from 'vitest';
import { modul1 } from '../modules/modul1';
import { p } from '../test/helpers';
import { setNote } from './edit';
import { createEmptyScore } from './score';
import { parseScore } from './validate';

function sample() {
  const result = setNote(createEmptyScore(modul1), modul1, { staff: 0, measure: 0, tick: 0 }, p('E4'), 48);
  if (!result.ok) throw new Error();
  const score = result.score;
  score.meta = { title: 'Mein Lied', names: ['Mia', 'Ben'], className: '7a' };
  return score;
}

describe('parseScore', () => {
  it('accepts a valid score (also after JSON round trip)', () => {
    const score = sample();
    expect(parseScore(JSON.parse(JSON.stringify(score)), modul1)).toEqual(score);
  });

  it('rejects anything that is not a score', () => {
    for (const data of [null, 42, 'text', [], {}]) expect(parseScore(data, modul1)).toBeNull();
  });

  it('rejects a score of another module or version', () => {
    expect(parseScore({ ...sample(), moduleId: '2' }, modul1)).toBeNull();
    expect(parseScore({ ...sample(), version: 2 }, modul1)).toBeNull();
  });

  it('rejects broken measures', () => {
    const tooShort = sample();
    tooShort.staves[0].measures[1] = [{ kind: 'rest', ticks: 96, auto: true }];
    expect(parseScore(tooShort, modul1)).toBeNull();

    const outOfRange = sample();
    outOfRange.staves[0].measures[0][0] = { kind: 'note', pitch: p('C6'), ticks: 48 };
    expect(parseScore(outOfRange, modul1)).toBeNull();

    const missingMeasure = sample();
    missingMeasure.staves[0].measures.pop();
    expect(parseScore(missingMeasure, modul1)).toBeNull();
  });

  it('rejects broken names', () => {
    const score = sample() as unknown as { meta: { names: unknown } };
    score.meta.names = 'Mia';
    expect(parseScore(score, modul1)).toBeNull();
  });
});
