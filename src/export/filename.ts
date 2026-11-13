import type { Score } from '../model/types';

/**
 * File names for handing in: [klasse]_[name(n)]_[jjjj-mm-tt], e.g. 7a_Mia-Ben_2026-11-11.
 * Spaces inside a name are dropped ("Anna Lena" → "AnnaLena"), umlauts are written out
 * (ä → ae, Ä → Ae, ß → ss), accents are removed (é → e), all other characters are dropped.
 * Several names are joined with "-".
 */
export function cleanPart(text: string): string {
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/ẞ/g, 'SS')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents that were split off by normalize
    .replace(/[^A-Za-z0-9]/g, '');
}

/** Date of the day as jjjj-mm-tt (local time). */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** File name without extension. */
export function baseFileName(meta: Score['meta'], date: Date): string {
  const className = cleanPart(meta.className) || 'Klasse';
  const names = meta.names.map(cleanPart).filter((n) => n !== '').join('-') || 'Name';
  return `${className}_${names}_${isoDate(date)}`;
}
