import { describe, expect, it } from 'vitest';
import { setNote } from '../model/edit';
import { createEmptyScore } from '../model/score';
import type { Score } from '../model/types';
import { modul1 } from '../modules/modul1';
import { p } from '../test/helpers';
import { buildSchedule, noteName } from './schedule';

function place(notes: Array<[number, number, number, string]>): Score {
  return notes.reduce((score, [measure, tick, ticks, pitch]) => {
    const result = setNote(score, modul1, { staff: 0, measure, tick }, p(pitch), ticks);
    if (!result.ok) throw new Error(result.error);
    return result.score;
  }, createEmptyScore(modul1));
}

// Tempo 90: one quarter = 60/90 s = 2/3 s; one 4/4 measure = 8/3 s.
const Q = 60 / 90;

describe('buildSchedule', () => {
  it('is empty for an empty score', () => {
    expect(buildSchedule(createEmptyScore(modul1))).toEqual({ notes: [], end: 0 });
  });

  it('times notes by tempo', () => {
    const schedule = buildSchedule(place([[0, 0, 48, 'C4'], [0, 48, 96, 'E4']]));
    expect(schedule.notes.map((n) => [n.note, n.time, n.duration])).toEqual([
      ['C4', 0, Q],
      ['E4', Q, 2 * Q],
    ]);
    expect(schedule.end).toBeCloseTo(3 * Q);
  });

  it('keeps the free space of a measure as silence and stops after the last note', () => {
    const schedule = buildSchedule(place([[0, 0, 48, 'C4'], [2, 0, 24, 'G4']]));
    expect(schedule.notes).toHaveLength(2);
    expect(schedule.notes[1].time).toBeCloseTo(8 * Q);
    expect(schedule.notes[1].at).toEqual({ staff: 0, measure: 2, tick: 0 });
    expect(schedule.end).toBeCloseTo(8.5 * Q);
  });
});

describe('noteName', () => {
  it('writes pitches the way Tone.js expects', () => {
    expect(noteName(p('C4'))).toBe('C4');
    expect(noteName(p('F#5'))).toBe('F#5');
    expect(noteName(p('Bb4'))).toBe('Bb4');
  });
});
