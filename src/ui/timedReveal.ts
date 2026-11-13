/**
 * Shows something only for a short time, then locks it for a while.
 * Used for the note names: students may peek, but not keep them on screen.
 *
 *   idle --start()--> showing --(showMs)--> cooldown --(cooldownMs)--> idle
 */
export type RevealPhase = 'idle' | 'showing' | 'cooldown';

export interface TimedReveal {
  /** Starts showing; ignored unless idle. */
  start(): void;
  phase(): RevealPhase;
}

export function createTimedReveal(
  showMs: number,
  cooldownMs: number,
  onChange: (phase: RevealPhase, durationMs: number) => void,
): TimedReveal {
  let current: RevealPhase = 'idle';

  function enter(phase: RevealPhase, durationMs: number, next?: () => void): void {
    current = phase;
    onChange(phase, durationMs);
    if (next) setTimeout(next, durationMs);
  }

  return {
    start() {
      if (current !== 'idle') return;
      enter('showing', showMs, () => enter('cooldown', cooldownMs, () => enter('idle', 0)));
    },
    phase: () => current,
  };
}
