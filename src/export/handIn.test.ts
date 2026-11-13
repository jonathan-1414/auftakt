import { strFromU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { createEmptyScore } from '../model/score';
import { parseScore } from '../model/validate';
import { modul1 } from '../modules/modul1';
import { auftaktBytes, buildHandIn, germanDate } from './handIn';

function score() {
  const s = createEmptyScore(modul1);
  s.meta = { title: 'Mein Lied', names: ['Mia', 'Anna Lena'], className: '7a' };
  return s;
}
const day = new Date(2026, 10, 11);

describe('hand-in files', () => {
  it('the Auftakt file contains the score and can be read again', () => {
    const text = strFromU8(auftaktBytes(score()));
    expect(parseScore(JSON.parse(text), modul1)).toEqual(score());
  });

  it('one format gives one file with the right name', async () => {
    const file = await buildHandIn(score(), ['auftakt'], day);
    expect(file.name).toBe('7a_Mia-AnnaLena_2026-11-11.auftakt');
  });

  it('the date is written the German way in the PDF', () => {
    expect(germanDate(day)).toBe('11.11.2026');
  });
});

