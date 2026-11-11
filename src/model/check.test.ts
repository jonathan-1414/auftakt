import { describe, expect, it } from 'vitest';
import { modul1 } from '../modules/modul1';
import { p } from '../test/helpers';
import { describeStatus, measureStatus } from './check';
import { setNote } from './edit';
import { createEmptyScore } from './score';

function statusText(notes: Array<[number, number]>): string {
  let score = createEmptyScore(modul1);
  for (const [tick, ticks] of notes) {
    const result = setNote(score, modul1, { staff: 0, measure: 0, tick }, p('C4'), ticks);
    if (!result.ok) throw new Error(result.error);
    score = result.score;
  }
  return describeStatus(measureStatus(score.staves[0].measures[0]));
}

describe('measure check', () => {
  it('empty measure', () => {
    expect(statusText([])).toBe('fehlt noch: 1 Ganze');
  });

  it('one quarter', () => {
    expect(statusText([[0, 48]])).toBe('fehlt noch: 1 Halbe und 1 Viertel');
  });

  it('three quarters', () => {
    expect(
      statusText([
        [0, 48],
        [48, 48],
        [96, 48],
      ]),
    ).toBe('fehlt noch: 1 Viertel');
  });

  it('counts gaps that are apart', () => {
    expect(
      statusText([
        [0, 48],
        [96, 48],
      ]),
    ).toBe('fehlt noch: 2 Viertel');
  });

  it('lists several values', () => {
    expect(statusText([[0, 24]])).toBe('fehlt noch: 1 Halbe, 1 Viertel und 1 Achtel');
  });

  it('full measure', () => {
    expect(statusText([[0, 192]])).toBe('voll');
    expect(
      statusText([
        [0, 96],
        [96, 24],
        [120, 24],
        [144, 48],
      ]),
    ).toBe('voll');
  });

  it('reports the missing ticks', () => {
    const status = measureStatus(createEmptyScore(modul1).staves[0].measures[0]);
    expect(status).toMatchObject({ full: false, missingTicks: 192 });
  });
});
