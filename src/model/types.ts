export type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

/** A pitch in scientific notation: c' = C4, f'' = F5. */
export interface Pitch {
  step: Step;
  alter: -1 | 0 | 1; // flat, natural, sharp
  octave: number;
}

/**
 * One event in a measure. Called ScoreEvent (not Event as in CLAUDE.md)
 * because the browser already has a built-in type named Event.
 */
export type ScoreEvent =
  | { kind: 'note'; pitch: Pitch; ticks: number; dotted?: boolean; tieToNext?: boolean }
  | { kind: 'rest'; ticks: number; auto: boolean }; // auto = gap filled by the app

export interface Staff {
  id: string;
  instrument: string;
  clef: 'treble' | 'bass';
  volume: number; // 0..1
  measures: ScoreEvent[][];
}

export interface TimeSignature {
  beats: number;
  beatValue: number;
}

export interface Score {
  format: 'auftakt';
  version: 1;
  meta: { title: string; names: string[]; className: string };
  moduleId: string;
  timeSignature: TimeSignature;
  keySignature: number;
  tempo: number;
  swing: boolean;
  staves: Staff[];
}

/** Where something sits in the score: staff index, measure index, start tick in the measure. */
export interface Position {
  staff: number;
  measure: number;
  tick: number;
}
