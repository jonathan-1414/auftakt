import { TICKS_PER_QUARTER } from '../model/constants';
import { placeEvents } from '../model/measure';
import type { Pitch, Position, Score } from '../model/types';

/** One note to play: when (seconds from the start), how long, which pitch, and where it is. */
export interface ScheduledNote {
  time: number;
  duration: number;
  note: string; // e.g. 'C4', 'F#5' (as Tone.js expects it)
  at: Position;
}

export interface Schedule {
  notes: ScheduledNote[];
  /** End of the last note; playback stops here (gaps after it are not waited for). */
  end: number;
}

export function noteName(p: Pitch): string {
  return `${p.step}${p.alter === 1 ? '#' : p.alter === -1 ? 'b' : ''}${p.octave}`;
}

/**
 * Turns the score into a list of timed notes. Gaps (automatic rests) are silence.
 * Ticks become seconds via the tempo (quarter notes per minute).
 */
export function buildSchedule(score: Score): Schedule {
  const secondsPerTick = 60 / score.tempo / TICKS_PER_QUARTER;
  const notes: ScheduledNote[] = [];
  let end = 0;
  score.staves.forEach((staff, staffIndex) => {
    let measureStart = 0;
    staff.measures.forEach((measure, measureIndex) => {
      let length = 0;
      for (const { start, event } of placeEvents(measure)) {
        length = start + event.ticks;
        if (event.kind !== 'note') continue;
        const time = (measureStart + start) * secondsPerTick;
        const duration = event.ticks * secondsPerTick;
        notes.push({ time, duration, note: noteName(event.pitch), at: { staff: staffIndex, measure: measureIndex, tick: start } });
        end = Math.max(end, time + duration);
      }
      measureStart += length;
    });
  });
  notes.sort((a, b) => a.time - b.time);
  return { notes, end };
}
