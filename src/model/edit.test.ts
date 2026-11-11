import { describe as group, expect, it } from 'vitest';
import { modul1 } from '../modules/modul1';
import { describe, p } from '../test/helpers';
import { canPlace, changePitch, deleteNote, setNote, type EditResult } from './edit';
import { firstFreeTick } from './measure';
import { createEmptyScore } from './score';
import type { Pitch, Score } from './types';

const at = (tick: number, measure = 0) => ({ staff: 0, measure, tick });

function ok(result: EditResult): Score {
  if (!result.ok) throw new Error(`Edit failed: ${result.error}`);
  return result.score;
}

/** Places several notes one after another: [tick, ticks, pitch]. */
function place(notes: Array<[number, number, string]>, measure = 0): Score {
  return notes.reduce(
    (score, [tick, ticks, pitch]) => ok(setNote(score, modul1, at(tick, measure), p(pitch), ticks)),
    createEmptyScore(modul1),
  );
}

const m = (score: Score, measure = 0) => describe(score.staves[0].measures[measure]);

group('createEmptyScore', () => {
  it('creates 4 empty 4/4 measures in one treble staff, tempo 90', () => {
    const score = createEmptyScore(modul1);
    expect(score.format).toBe('auftakt');
    expect(score.version).toBe(1);
    expect(score.moduleId).toBe('1');
    expect(score.timeSignature).toEqual({ beats: 4, beatValue: 4 });
    expect(score.keySignature).toBe(0);
    expect(score.tempo).toBe(90);
    expect(score.staves).toHaveLength(1);
    expect(score.staves[0].clef).toBe('treble');
    expect(score.staves[0].measures.map((x) => describe(x))).toEqual([
      ['r192@0'],
      ['r192@0'],
      ['r192@0'],
      ['r192@0'],
    ]);
  });
});

group('setNote', () => {
  it('places a note and fills the rest with automatic rests', () => {
    expect(m(place([[0, 48, 'E4']]))).toEqual(['n48@0 E4', 'r48@48', 'r96@96']);
  });

  it('fills a measure with four quarters', () => {
    const score = place([
      [0, 48, 'C4'],
      [48, 48, 'D4'],
      [96, 48, 'E4'],
      [144, 48, 'F4'],
    ]);
    expect(m(score)).toEqual(['n48@0 C4', 'n48@48 D4', 'n48@96 E4', 'n48@144 F4']);
  });

  it('places notes in other measures', () => {
    const score = place([[0, 192, 'G4']], 3);
    expect(m(score, 3)).toEqual(['n192@0 G4']);
    expect(m(score, 0)).toEqual(['r192@0']);
  });

  it('overwrites: a shorter note leaves an automatic rest', () => {
    const score = place([
      [0, 96, 'C4'],
      [0, 48, 'G4'],
    ]);
    expect(m(score)).toEqual(['n48@0 G4', 'r48@48', 'r96@96']);
  });

  it('overwrites: a longer note replaces several notes', () => {
    const score = place([
      [0, 48, 'C4'],
      [48, 48, 'D4'],
      [96, 48, 'E4'],
      [0, 96, 'A4'],
    ]);
    expect(m(score)).toEqual(['n96@0 A4', 'n48@96 E4', 'r48@144']);
  });

  it('overwrites: leftovers of a note that is hit in the middle become rests', () => {
    const score = place([
      [0, 96, 'C4'],
      [48, 48, 'D4'],
    ]);
    expect(m(score)).toEqual(['r48@0', 'n48@48 D4', 'r96@96']);
  });

  it('rejects a note that does not fit into the rest of the measure', () => {
    const score = createEmptyScore(modul1);
    expect(setNote(score, modul1, at(144), p('C4'), 96)).toEqual({ ok: false, error: 'does-not-fit' });
    expect(setNote(score, modul1, at(48), p('C4'), 192)).toEqual({ ok: false, error: 'does-not-fit' });
  });

  it('rejects note values that Modul 1 does not have', () => {
    const score = createEmptyScore(modul1);
    for (const ticks of [72, 12, 16, 144]) {
      expect(setNote(score, modul1, at(0), p('C4'), ticks)).toEqual({
        ok: false,
        error: 'duration-not-allowed',
      });
    }
  });

  it("rejects pitches outside c'–f''", () => {
    const score = createEmptyScore(modul1);
    expect(setNote(score, modul1, at(0), p('B3'), 48)).toEqual({ ok: false, error: 'out-of-range' });
    expect(setNote(score, modul1, at(0), p('G5'), 48)).toEqual({ ok: false, error: 'out-of-range' });
    expect(setNote(score, modul1, at(0), p('C4'), 48).ok).toBe(true);
    expect(setNote(score, modul1, at(0), p('F5'), 48).ok).toBe(true);
  });

  it('rejects positions that do not exist', () => {
    const score = createEmptyScore(modul1);
    expect(setNote(score, modul1, at(0, 4), p('C4'), 48)).toEqual({ ok: false, error: 'invalid-position' });
    expect(setNote(score, modul1, { staff: 1, measure: 0, tick: 0 }, p('C4'), 48)).toEqual({
      ok: false,
      error: 'invalid-position',
    });
  });

  it('never changes the original score', () => {
    const score = createEmptyScore(modul1);
    const before = structuredClone(score);
    const pitch: Pitch = p('C4');
    const after = ok(setNote(score, modul1, at(0), pitch, 48));
    expect(score).toEqual(before);
    pitch.octave = 5; // changing the input afterwards must not change the score
    expect(m(after)[0]).toBe('n48@0 C4');
  });
});

group('canPlace', () => {
  it('tells which note values still fit (for greying out the toolbar)', () => {
    const score = createEmptyScore(modul1);
    const fits = (tick: number) => modul1.durations.filter((d) => canPlace(score, modul1, at(tick), d));
    expect(fits(0)).toEqual([192, 96, 48, 24]);
    expect(fits(96)).toEqual([96, 48, 24]);
    expect(fits(144)).toEqual([48, 24]);
    expect(fits(168)).toEqual([24]);
    expect(fits(192)).toEqual([]);
  });
});

group('deleteNote', () => {
  it('turns the note into an automatic rest and joins the gaps', () => {
    const score = place([
      [0, 48, 'C4'],
      [48, 48, 'D4'],
    ]);
    const one = ok(deleteNote(score, at(0)));
    expect(m(one)).toEqual(['r48@0', 'n48@48 D4', 'r96@96']);
    const both = ok(deleteNote(one, at(48)));
    expect(m(both)).toEqual(['r192@0']);
  });

  it('fails if there is no note', () => {
    expect(deleteNote(createEmptyScore(modul1), at(0))).toEqual({ ok: false, error: 'no-note' });
    expect(deleteNote(place([[0, 96, 'C4']]), at(48))).toEqual({ ok: false, error: 'no-note' });
  });
});

group('changePitch', () => {
  it('changes only the pitch', () => {
    const score = ok(changePitch(place([[48, 96, 'C4']]), modul1, at(48), p('A4')));
    expect(m(score)).toEqual(['r48@0', 'n96@48 A4', 'r48@144']);
  });

  it("stays within c'–f''", () => {
    expect(changePitch(place([[0, 48, 'C4']]), modul1, at(0), p('A5'))).toEqual({
      ok: false,
      error: 'out-of-range',
    });
  });

  it('fails if there is no note', () => {
    expect(changePitch(createEmptyScore(modul1), modul1, at(0), p('C4'))).toEqual({
      ok: false,
      error: 'no-note',
    });
  });
});

group('firstFreeTick', () => {
  it('is where the cursor goes when tapping a measure', () => {
    expect(firstFreeTick(place([[0, 48, 'C4']]).staves[0].measures[0])).toBe(48);
    expect(firstFreeTick(place([[48, 48, 'C4']]).staves[0].measures[0])).toBe(0);
    expect(firstFreeTick(place([[0, 192, 'C4']]).staves[0].measures[0])).toBeNull();
  });
});
