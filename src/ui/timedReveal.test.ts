import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTimedReveal, type RevealPhase } from './timedReveal';

describe('timed reveal (note names)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows for 5 s, then locks for 30 s, then is ready again', () => {
    const phases: Array<[RevealPhase, number]> = [];
    const reveal = createTimedReveal(5000, 30000, (phase, ms) => phases.push([phase, ms]));

    reveal.start();
    expect(reveal.phase()).toBe('showing');
    vi.advanceTimersByTime(4999);
    expect(reveal.phase()).toBe('showing');
    vi.advanceTimersByTime(1);
    expect(reveal.phase()).toBe('cooldown');
    vi.advanceTimersByTime(30000);
    expect(reveal.phase()).toBe('idle');
    expect(phases).toEqual([
      ['showing', 5000],
      ['cooldown', 30000],
      ['idle', 0],
    ]);
  });

  it('cannot be started again while showing or locked', () => {
    const onChange = vi.fn();
    const reveal = createTimedReveal(5000, 30000, onChange);
    reveal.start();
    reveal.start();
    vi.advanceTimersByTime(6000);
    reveal.start();
    expect(reveal.phase()).toBe('cooldown');
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
