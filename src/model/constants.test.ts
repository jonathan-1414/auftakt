import { describe, expect, it } from 'vitest';
import { TICKS_PER_QUARTER } from './constants';

describe('TICKS_PER_QUARTER', () => {
  it('divides evenly into eighths, sixteenths and eighth triplets', () => {
    expect(TICKS_PER_QUARTER % 2).toBe(0);
    expect(TICKS_PER_QUARTER % 4).toBe(0);
    expect(TICKS_PER_QUARTER % 3).toBe(0);
  });
});
