import * as Tone from 'tone';
import type { Position } from '../model/types';
import type { Schedule } from './schedule';

/**
 * Plays a schedule with the piano sampler. Knows nothing about the score itself.
 * The audio is unlocked on the first touch (iOS only allows sound after a touch);
 * the piano samples are loaded at that moment too.
 */
export interface Player {
  /** Call on every touch/click; does something only until the audio is running. */
  unlock(): void;
  play(schedule: Schedule): Promise<void>;
  stop(): void;
  isPlaying(): boolean;
}

export interface PlayerEvents {
  /** The note that sounds right now (null = silence). Called in time with the sound. */
  onNote(at: Position | null): void;
  /** Playback has ended (by itself or by stop()). */
  onEnd(): void;
}

/** Samples in public/samples/piano/ (c' to f'', see LICENSE.txt there). */
const SAMPLE_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'];

export function createPlayer(events: PlayerEvents): Player {
  let sampler: Tone.Sampler | null = null;
  let playing = false;
  let request = 0; // a newer play() or a stop() makes a waiting play() give up

  function getSampler(): Tone.Sampler {
    if (!sampler) {
      sampler = new Tone.Sampler({
        urls: Object.fromEntries(SAMPLE_NOTES.map((n) => [n, `${n}.mp3`])),
        baseUrl: `${import.meta.env.BASE_URL}samples/piano/`,
        release: 1,
      }).toDestination();
    }
    return sampler;
  }

  function stop(): void {
    request++;
    if (!playing) return;
    playing = false;
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    sampler?.releaseAll();
    events.onNote(null);
    events.onEnd();
  }

  return {
    unlock() {
      if (Tone.getContext().state !== 'running') void Tone.start();
      getSampler();
    },

    async play(schedule) {
      stop();
      const mine = ++request;
      await Tone.start();
      const piano = getSampler();
      await Tone.loaded(); // the samples may still be loading
      if (mine !== request || schedule.notes.length === 0) return;

      const transport = Tone.getTransport();
      const draw = Tone.getDraw();
      transport.cancel();
      transport.position = 0;
      const starts = new Set(schedule.notes.map((n) => n.time.toFixed(4)));
      for (const n of schedule.notes) {
        transport.schedule((time) => {
          piano.triggerAttackRelease(n.note, n.duration, time);
          draw.schedule(() => events.onNote(n.at), time);
        }, n.time);
        // Switch the marking off when silence follows (not when the next note starts right away).
        const end = n.time + n.duration;
        if (!starts.has(end.toFixed(4))) {
          transport.schedule((time) => draw.schedule(() => events.onNote(null), time), end);
        }
      }
      // Stop after the last note has sounded a little. Not via Tone.Draw: that only runs
      // while the page is drawn, and the end must also come when the app is in the background.
      transport.schedule((time) => {
        setTimeout(stop, Math.max(0, (time - Tone.now()) * 1000));
      }, schedule.end + 0.3);
      playing = true;
      transport.start('+0.05');
    },

    stop,
    isPlaying: () => playing,
  };
}
