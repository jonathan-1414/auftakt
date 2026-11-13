import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyScore } from '../model/score';
import { modul1 } from '../modules/modul1';
import { loadScore, saveScore } from './autosave';

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

describe('autosave', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads what was saved', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    const score = createEmptyScore(modul1);
    score.meta = { title: '', names: ['Mia'], className: '7a' };
    expect(saveScore(modul1, score)).toBe(true);
    expect(loadScore(modul1)).toEqual(score);
  });

  it('returns null when nothing was saved', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    expect(loadScore(modul1)).toBeNull();
  });

  it('ignores broken data', () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
    storage.setItem('auftakt:score:modul-1', '{not json');
    expect(loadScore(modul1)).toBeNull();
    storage.setItem('auftakt:score:modul-1', '{"format":"other"}');
    expect(loadScore(modul1)).toBeNull();
  });

  it('works without localStorage (missing or throwing)', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(loadScore(modul1)).toBeNull();
    const throwing = fakeStorage();
    throwing.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    throwing.getItem = () => {
      throw new Error('SecurityError');
    };
    vi.stubGlobal('localStorage', throwing);
    expect(saveScore(modul1, createEmptyScore(modul1))).toBe(false);
    expect(loadScore(modul1)).toBeNull();
  });
});
