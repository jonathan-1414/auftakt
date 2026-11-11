import { DURATION_NAMES } from './constants';
import type { ScoreEvent } from './types';

export interface MeasureStatus {
  full: boolean;
  missingTicks: number;
  /** Missing note values, largest first, e.g. [{ ticks: 48, count: 2 }] = 2 Viertel. */
  missing: Array<{ ticks: number; count: number }>;
}

const NAMED_VALUES = Object.keys(DURATION_NAMES)
  .map(Number)
  .sort((a, b) => b - a);

/** Splits a length into named note values (normally the rest already is one). */
function splitIntoNamedValues(ticks: number): number[] {
  const parts: number[] = [];
  let remaining = ticks;
  for (const value of NAMED_VALUES) {
    while (remaining >= value) {
      parts.push(value);
      remaining -= value;
    }
  }
  return parts;
}

/** The measure check: what is still missing results from the automatic rests. */
export function measureStatus(measure: ScoreEvent[]): MeasureStatus {
  const counts = new Map<number, number>();
  let missingTicks = 0;
  for (const event of measure) {
    if (event.kind !== 'rest' || !event.auto) continue;
    missingTicks += event.ticks;
    for (const value of splitIntoNamedValues(event.ticks)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  const missing = [...counts.entries()]
    .map(([ticks, count]) => ({ ticks, count }))
    .sort((a, b) => b.ticks - a.ticks);
  return { full: missingTicks === 0, missingTicks, missing };
}

/** Text below the measure: "voll" or e.g. "fehlt noch: 1 Halbe und 1 Viertel". */
export function describeStatus(status: MeasureStatus): string {
  if (status.full) return 'voll';
  const parts = status.missing.map((m) => `${m.count} ${DURATION_NAMES[m.ticks]}`);
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} und ${parts.at(-1)}` : parts[0];
  return `fehlt noch: ${text}`;
}
