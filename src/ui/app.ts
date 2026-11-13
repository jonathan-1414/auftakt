import { advanceCursor, initialCursor, positionForTap } from '../model/cursor';
import { isMetaComplete } from '../model/meta';
import { canPlace, changePitch, deleteNote, setNote } from '../model/edit';
import { History } from '../model/history';
import { isInRange, pitchAtStaffPosition } from '../model/pitch';
import { createEmptyScore } from '../model/score';
import type { Pitch, Position, Score } from '../model/types';
import type { ModuleConfig } from '../modules/types';
import { hitTest, staffPositionAt } from '../input/hitTest';
import { attachScoreInput } from '../input/scoreInput';
import type { ScoreLayout } from '../render/layout';
import { renderScore } from '../render/renderScore';
import { createPlayer } from '../playback/player';
import { buildSchedule } from '../playback/schedule';
import { loadScore, saveScore } from '../storage/autosave';
import { baseFileName } from '../export/filename';
import { buildHandIn } from '../export/handIn';
import { canShareFile, shareOrDownload } from '../export/share';
import { askForMeta, askHandIn, confirm, showInfo } from './dialogs';
import { createTimedReveal } from './timedReveal';
import { createToolbar } from './toolbar';

const NOTE_NAMES_SHOW_MS = 5000;
const NOTE_NAMES_LOCK_MS = 30000;

interface Snapshot {
  score: Score;
  cursor: Position;
}

type Gesture =
  | { kind: 'place'; before: Snapshot }
  | { kind: 'drag'; at: Position; before: Snapshot; changed: boolean };

/** Connects model, drawing, toolbar and input. Holds the current state of the app. */
export function startApp(root: HTMLElement, module: ModuleConfig): void {
  root.innerHTML = `
    <header class="toolbar"></header>
    <main class="score-area"><div id="score"></div></main>
    <footer class="app-footer"><button type="button" class="link-button">Info und Lizenzen</button></footer>
  `;
  root.querySelector('.app-footer button')!.addEventListener('click', showInfo);
  const scoreElement = root.querySelector<HTMLDivElement>('#score')!;

  // The last state is loaded from the browser; every change is saved right away.
  let score = loadScore(module) ?? createEmptyScore(module);
  let savedScore: Score | null = score;
  let cursor: Position = initialCursor(score);
  let selection: Position | null = null;
  let duration = module.durations.includes(48) ? 48 : module.durations[0];
  let showNoteNames = false;
  let preview: { at: Position; pitch: Pitch } | null = null;
  let gesture: Gesture | null = null;
  let layout: ScoreLayout | null = null;
  const history = new History<Snapshot>();
  // Playback: plays a copy of the score; any change to the score stops it.
  let playing: Position | null = null;
  let playedScore: Score | null = null;
  const player = createPlayer({
    onNote(at) {
      if (at && !playedScore) return; // a late marking after the stop
      playing = at;
      render();
    },
    onEnd() {
      playing = null;
      playedScore = null;
      render();
    },
  });
  // iOS allows sound only after a touch: unlock the audio on every early touch.
  for (const type of ['pointerdown', 'pointerup', 'keydown'] as const) {
    document.addEventListener(type, () => player.unlock(), { capture: true });
  }


  const toolbar = createToolbar(root.querySelector('.toolbar')!, module.durations, {
    togglePlay() {
      if (player.isPlaying() || playedScore) {
        player.stop();
        playedScore = null;
        render();
        return;
      }
      const schedule = buildSchedule(score);
      if (schedule.notes.length === 0) return; // nothing to play
      playedScore = score;
      // While playing, only the sounding note is marked: no selection, no cursor.
      selection = null;
      render();
      void player.play(schedule);
    },
    selectDuration(ticks) {
      // The toolbar always chooses the value of the next note, it never changes a note.
      // A selected note is let go: the cursor goes behind the last note of its measure.
      if (selection) {
        cursor = advanceCursor(score, selection);
        selection = null;
      }
      duration = ticks;
      render();
    },
    undo() {
      const previous = history.undo();
      if (!previous) return;
      // Undo is for notes only: the details (names, class, title) stay as they are.
      score = { ...previous.score, meta: score.meta };
      cursor = previous.cursor;
      selection = null;
      render();
    },
    deleteSelection() {
      if (!selection) return;
      const result = deleteNote(score, selection);
      if (!result.ok) return;
      history.push({ score, cursor });
      score = result.score;
      cursor = advanceCursor(score, selection); // behind the last note of that measure
      selection = null;
      render();
    },
    async newScore() {
      const yes = await confirm('Neue Partitur beginnen? Alle Noten dieser Partitur werden gelöscht.', 'Neu beginnen');
      if (!yes) return;
      player.stop();
      // Everything starts empty, also names, class and title.
      score = createEmptyScore(module);
      cursor = initialCursor(score);
      selection = null;
      history.clear();
      render();
      await askForDetails('start');
    },
    editDetails() {
      void askForDetails('edit');
    },
    handIn() {
      player.stop();
      const date = new Date(); // the day of handing in
      const handedIn = score;
      void askHandIn({
        fileName: (formats) =>
          `${baseFileName(handedIn.meta, date)}.${formats.length > 1 ? 'zip' : formats[0]}`,
        prepare: (formats) => buildHandIn(handedIn, formats, date),
        canShare: canShareFile,
        deliver: shareOrDownload,
      });
    },
    showNoteNames() {
      noteNames.start();
    },
  });

  // Note names can only be peeked at: shown for a few seconds, then locked for a while,
  // so that students read the notes instead of playing by letters.
  const noteNames = createTimedReveal(NOTE_NAMES_SHOW_MS, NOTE_NAMES_LOCK_MS, (phase, ms) => {
    showNoteNames = phase === 'showing';
    toolbar.setNoteNamesPhase(phase, ms);
    render();
  });

  /** Start dialog (required) or changing the details later. */
  async function askForDetails(mode: 'start' | 'edit'): Promise<void> {
    const meta = await askForMeta(mode, score.meta);
    if (!meta) return;
    score = { ...score, meta };
    render();
  }

  function render(): void {
    if (score !== savedScore) {
      saveScore(module, score);
      savedScore = score;
    }
    if (playedScore && playedScore !== score) {
      playedScore = null;
      player.stop();
    }
    let shown = score;
    if (preview) {
      const result = setNote(score, module, preview.at, preview.pitch, duration);
      if (result.ok) shown = result.score;
    }
    layout = renderScore(scoreElement, shown, {
      showNoteNames,
      cursor: preview || playedScore ? null : cursor,
      selection: preview || playedScore ? null : selection,
      preview: preview?.at ?? null,
      playing,
    });
    toolbar.update({
      duration,
      canUndo: history.canUndo(),
      canDelete: selection !== null,
      playing: playedScore !== null,
    });
  }

  /** Note value of the note that starts at this position, if there is one. */
  function noteTicksAt(at: Position): number | null {
    let start = 0;
    for (const event of score.staves[at.staff].measures[at.measure]) {
      if (start === at.tick && event.kind === 'note') return event.ticks;
      start += event.ticks;
    }
    return null;
  }

  /** Pitch under the finger, or null outside the module's range. */
  function pitchAt(y: number): Pitch | null {
    if (!layout) return null;
    const clef = score.staves[cursor.staff].clef;
    const pitch = pitchAtStaffPosition(clef, staffPositionAt(layout, y));
    return isInRange(pitch, module.range) ? pitch : null;
  }

  attachScoreInput(scoreElement, {
    down(x, y) {
      if (!layout) return;
      const hit = hitTest(layout, x, y);
      if (!hit) return;
      const before = { score, cursor };

      // Touching a note selects it, puts the cursor there and lets it be dragged.
      if (hit.noteTick !== null) {
        selection = { staff: cursor.staff, measure: hit.measure, tick: hit.noteTick };
        cursor = selection;
        // The toolbar shows the value of the selected note.
        duration = noteTicksAt(selection) ?? duration;
        gesture = { kind: 'drag', at: selection, before, changed: false };
        render();
        return;
      }

      // Touching elsewhere chooses the spot under the finger.
      cursor = positionForTap(score, cursor.staff, hit.measure, hit.columnTick);
      // With a note selected, this touch only lets it go and moves the cursor there;
      // the next touch places a note.
      if (selection) {
        selection = null;
        render();
        return;
      }
      // Otherwise a preview note appears. The spot is fixed now; moving the finger
      // only changes the pitch.
      if (canPlace(score, module, cursor, duration)) {
        gesture = { kind: 'place', before };
        const pitch = pitchAt(y);
        preview = pitch ? { at: cursor, pitch } : null;
      }
      render();
    },

    move(_x, y) {
      if (!gesture) return;
      const pitch = pitchAt(y);
      if (gesture.kind === 'place') {
        const changed =
          (pitch === null) !== (preview === null) ||
          (pitch !== null && preview !== null && (pitch.step !== preview.pitch.step || pitch.octave !== preview.pitch.octave));
        if (!changed) return;
        preview = pitch ? { at: cursor, pitch } : null;
        render();
        return;
      }
      if (!pitch) return;
      const result = changePitch(score, module, gesture.at, pitch);
      if (!result.ok || JSON.stringify(result.score) === JSON.stringify(score)) return;
      score = result.score;
      gesture.changed = true;
      render();
    },

    up() {
      const done = gesture;
      gesture = null;
      if (done?.kind === 'place' && preview) {
        const result = setNote(score, module, preview.at, preview.pitch, duration);
        if (result.ok) {
          history.push(done.before);
          score = result.score;
          cursor = advanceCursor(score, preview.at);
          selection = null;
        }
      }
      if (done?.kind === 'drag' && done.changed) history.push(done.before);
      preview = null;
      render();
    },

    cancel() {
      if (gesture?.kind === 'drag' && gesture.changed) score = gesture.before.score;
      gesture = null;
      preview = null;
      render();
    },
  });

  render();
  if (!isMetaComplete(score.meta)) void askForDetails('start');
}
