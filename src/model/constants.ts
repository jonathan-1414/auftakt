/** Time resolution of the data model: one quarter note = 48 ticks. */
export const TICKS_PER_QUARTER = 48;
export const TICKS_PER_WHOLE = TICKS_PER_QUARTER * 4;

/** German names of the plain note values (singular and plural are the same). */
export const DURATION_NAMES: Record<number, string> = {
  192: 'Ganze',
  96: 'Halbe',
  48: 'Viertel',
  24: 'Achtel',
  12: 'Sechzehntel',
};
