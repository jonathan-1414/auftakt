// TEMPORARY (step 3 only): a sample melody so the rendering can be checked.
// Will be removed in step 4, when notes can be entered.
import { setNote } from './model/edit';
import { parsePitch } from './model/pitch';
import { createEmptyScore } from './model/score';
import type { Score } from './model/types';
import type { ModuleConfig } from './modules/types';

const MELODY: Array<[number, number, number, string]> = [
  // [measure, tick, ticks, pitch]
  [0, 0, 48, 'C4'], [0, 48, 48, 'D4'], [0, 96, 48, 'E4'], [0, 144, 48, 'F4'],
  [1, 0, 96, 'G4'], [1, 96, 24, 'A4'], [1, 120, 24, 'B4'], [1, 144, 24, 'C5'], [1, 168, 24, 'A4'],
  [2, 0, 192, 'G4'],
  [3, 0, 48, 'F5'], [3, 48, 24, 'D5'], [3, 72, 24, 'B4'],
];

export function demoScore(module: ModuleConfig): Score {
  let score = createEmptyScore(module);
  for (const [measure, tick, ticks, pitch] of MELODY) {
    const result = setNote(score, module, { staff: 0, measure, tick }, parsePitch(pitch), ticks);
    if (result.ok) score = result.score;
  }
  return score;
}
