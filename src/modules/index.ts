import { modul1 } from './modul1';
import type { ModuleConfig } from './types';

const MODULES: Record<string, ModuleConfig> = { '1': modul1 };

/** Picks the module from the link (…/?modul=1). Unknown or missing → Modul 1. */
export function moduleFromSearch(search: string): ModuleConfig {
  const id = new URLSearchParams(search).get('modul');
  return (id !== null && MODULES[id]) || modul1;
}
