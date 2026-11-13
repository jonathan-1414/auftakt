import type { Score } from './types';

export type Meta = Score['meta'];

export type MetaError = 'names-missing' | 'class-missing';

/**
 * Cleans what was typed into the start dialog: spaces at the ends are removed,
 * empty name fields are dropped. Name(s) and class are required, the title is optional.
 */
export function cleanMeta(input: { title: string; names: string[]; className: string }):
  | { ok: true; meta: Meta }
  | { ok: false; errors: MetaError[] } {
  const tidy = (s: string) => s.trim().replace(/\s+/g, ' ');
  const meta: Meta = {
    title: tidy(input.title),
    names: input.names.map(tidy).filter((n) => n !== ''),
    className: tidy(input.className),
  };
  const errors: MetaError[] = [];
  if (meta.names.length === 0) errors.push('names-missing');
  if (meta.className === '') errors.push('class-missing');
  return errors.length ? { ok: false, errors } : { ok: true, meta };
}

/** Are the required details there (otherwise the start dialog is shown)? */
export function isMetaComplete(meta: Meta): boolean {
  return meta.names.some((n) => n.trim() !== '') && meta.className.trim() !== '';
}
