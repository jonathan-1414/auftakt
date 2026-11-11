import type { ModuleConfig } from '../modules/types';
import { emptyMeasure, measureLength } from './measure';
import type { Score, TimeSignature } from './types';

export function parseTimeSignature(text: string): TimeSignature {
  const [beats, beatValue] = text.split('/').map(Number);
  return { beats, beatValue };
}

/** A new, empty score as the module prescribes it. */
export function createEmptyScore(module: ModuleConfig): Score {
  const timeSignature = parseTimeSignature(module.timeSignatures[0]);
  const length = measureLength(timeSignature);
  return {
    format: 'auftakt',
    version: 1,
    meta: { title: '', names: [], className: '' },
    moduleId: module.id,
    timeSignature,
    keySignature: module.keySignatures[0],
    tempo: module.tempoFixed ?? 90,
    swing: false,
    staves: [
      {
        id: 'staff-1',
        instrument: 'piano',
        clef: 'treble',
        volume: 1,
        measures: Array.from({ length: module.measures }, () => emptyMeasure(length)),
      },
    ],
  };
}
