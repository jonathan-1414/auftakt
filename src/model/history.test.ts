import { describe, expect, it } from 'vitest';
import { History } from './history';

describe('History', () => {
  it('undoes several steps in reverse order', () => {
    const history = new History<{ n: number }>();
    expect(history.canUndo()).toBe(false);
    history.push({ n: 1 });
    history.push({ n: 2 });
    expect(history.undo()).toEqual({ n: 2 });
    expect(history.undo()).toEqual({ n: 1 });
    expect(history.undo()).toBeUndefined();
  });

  it('stores copies, not references', () => {
    const history = new History<{ n: number }>();
    const state = { n: 1 };
    history.push(state);
    state.n = 99;
    expect(history.undo()).toEqual({ n: 1 });
  });

  it('drops the oldest states at the limit', () => {
    const history = new History<number>(2);
    history.push(1);
    history.push(2);
    history.push(3);
    expect(history.undo()).toBe(3);
    expect(history.undo()).toBe(2);
    expect(history.canUndo()).toBe(false);
  });
});
