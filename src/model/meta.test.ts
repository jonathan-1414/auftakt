import { describe, expect, it } from 'vitest';
import { cleanMeta, isMetaComplete } from './meta';

describe('cleanMeta', () => {
  it('tidies spaces and drops empty name fields', () => {
    expect(cleanMeta({ title: '  Mein  Lied ', names: [' Mia ', '', 'Anna  Lena'], className: ' 7a ' })).toEqual({
      ok: true,
      meta: { title: 'Mein Lied', names: ['Mia', 'Anna Lena'], className: '7a' },
    });
  });

  it('needs at least one name and a class; the title is optional', () => {
    expect(cleanMeta({ title: '', names: ['  '], className: '' })).toEqual({
      ok: false,
      errors: ['names-missing', 'class-missing'],
    });
    expect(cleanMeta({ title: '', names: ['Ben'], className: '6b' }).ok).toBe(true);
  });
});

describe('isMetaComplete', () => {
  it('is false for a new score', () => {
    expect(isMetaComplete({ title: '', names: [], className: '' })).toBe(false);
    expect(isMetaComplete({ title: '', names: ['Mia'], className: '' })).toBe(false);
    expect(isMetaComplete({ title: '', names: ['Mia'], className: '7a' })).toBe(true);
  });
});
