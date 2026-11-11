import { describe as group, expect, it } from 'vitest';
import { describe } from '../test/helpers';
import { autoRests, emptyMeasure, firstFreeTick, measureLength } from './measure';

group('measure', () => {
  it('has 192 ticks in 4/4', () => {
    expect(measureLength({ beats: 4, beatValue: 4 })).toBe(192);
  });

  it('an empty measure is one whole rest', () => {
    expect(describe(emptyMeasure(192))).toEqual(['r192@0']);
  });

  it('splits gaps into rests that sit on the beat', () => {
    expect(describe(autoRests(48, 144))).toEqual(['r48@0', 'r96@48']);
    // from the 2nd eighth: eighth, quarter, half
    expect(autoRests(24, 168).map((e) => e.ticks)).toEqual([24, 48, 96]);
    // a half rest never starts on beat 2
    expect(autoRests(48, 96).map((e) => e.ticks)).toEqual([48, 48]);
  });

  it('finds the first free spot', () => {
    expect(firstFreeTick(emptyMeasure(192))).toBe(0);
  });
});
