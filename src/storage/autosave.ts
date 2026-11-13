import { parseScore } from '../model/validate';
import type { Score } from '../model/types';
import type { ModuleConfig } from '../modules/types';

/**
 * Automatic saving in the browser (localStorage). Everything stays on the device.
 * localStorage may be missing, full or blocked (e.g. private tabs), so every access
 * is wrapped in try/catch: then the app simply works without saving.
 */

const key = (module: ModuleConfig) => `auftakt:score:modul-${module.id}`;

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function saveScore(module: ModuleConfig, score: Score): boolean {
  try {
    storage()?.setItem(key(module), JSON.stringify(score));
    return true;
  } catch {
    return false;
  }
}

/** The last saved score of this module, or null (nothing saved, or unreadable). */
export function loadScore(module: ModuleConfig): Score | null {
  try {
    const text = storage()?.getItem(key(module));
    return text ? parseScore(JSON.parse(text), module) : null;
  } catch {
    return null;
  }
}
