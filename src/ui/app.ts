import { advanceCursor, positionForTap } from '../model/cursor';
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
import { createToolbar } from './toolbar';

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
  `;
  const scoreElement = root.querySelector<HTMLDivElement>('#score')!;

  let score = createEmptyScore(module);
  let cursor: Position = { staff: 0, measure: 0, tick: 0 };
  let selection: Position | null = null;
  let duration = module.durations.includes(48) ? 48 : module.durations[0];
  let showNoteNames = false;
  let preview: { at: Position; pitch: Pitch } | null = null;
  let gesture: Gesture | null = null;
  let layout: ScoreLayout | null = null;
  const history = new History<Snapshot>();

  const updateToolbar = createToolbar(root.querySelector('.toolbar')!, module.durations, {
    selectDuration(ticks) {
      duration = ticks;
      render();
    },
    undo() {
      const previous = history.undo();
      if (!previous) return;
      score = previous.score;
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
      cursor = selection;
      selection = null;
      render();
    },
    toggleNoteNames() {
      showNoteNames = !showNoteNames;
      render();
    },
  });

  function render(): void {
    let shown = score;
    if (preview) {
      const result = setNote(score, module, preview.at, preview.pitch, duration);
      if (result.ok) shown = result.score;
    }
    layout = renderScore(scoreElement, shown, {
      showNoteNames,
      cursor: preview ? null : cursor,
      selection: preview ? null : selection,
      preview: preview?.at ?? null,
    });
    updateToolbar({
      duration,
      fitting: module.durations.filter((d) => canPlace(score, module, cursor, d)),
      canUndo: history.canUndo(),
      canDelete: selection !== null,
      showNoteNames,
    });
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
        gesture = { kind: 'drag', at: selection, before, changed: false };
        render();
        return;
      }

      // Touching elsewhere chooses the spot under the finger (a preview first).
      // The spot is fixed now; moving the finger only changes the pitch.
      cursor = positionForTap(score, cursor.staff, hit.measure, hit.columnTick);
      selection = null;
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
          cursor = advanceCursor(score, preview.at, duration);
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
}
