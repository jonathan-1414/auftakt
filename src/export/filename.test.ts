import { describe, expect, it } from 'vitest';
import { baseFileName, cleanPart, isoDate } from './filename';

const day = new Date(2026, 10, 11); // 11 November 2026 (months count from 0)
const meta = (names: string[], className: string) => ({ title: '', names, className });

describe('file names for handing in', () => {
  it('follows the scheme klasse_namen_datum', () => {
    expect(baseFileName(meta(['Mia', 'Ben'], '7a'), day)).toBe('7a_Mia-Ben_2026-11-11');
  });

  it('drops spaces inside a name', () => {
    expect(baseFileName(meta(['Anna Lena'], '7a'), day)).toBe('7a_AnnaLena_2026-11-11');
  });

  it('writes out umlauts and ß, also capitals', () => {
    expect(cleanPart('Jörg Müßig')).toBe('JoergMuessig');
    expect(cleanPart('Özlem Ähren Übel')).toBe('OezlemAehrenUebel');
  });

  it('removes accents and all other special characters', () => {
    expect(cleanPart('Zoé')).toBe('Zoe');
    expect(cleanPart('Anna-Lena')).toBe('AnnaLena');
    expect(cleanPart("O'Neill (Gast)!")).toBe('ONeillGast');
    expect(cleanPart('7 a/b')).toBe('7ab');
  });

  it('uses a placeholder if nothing is left', () => {
    expect(baseFileName(meta(['🎵'], '?'), day)).toBe('Klasse_Name_2026-11-11');
  });

  it('writes the date with leading zeros', () => {
    expect(isoDate(new Date(2027, 0, 5))).toBe('2027-01-05');
  });
});
