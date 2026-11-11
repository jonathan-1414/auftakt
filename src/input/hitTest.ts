import type { ScoreLayout } from '../render/layout';

export interface Hit {
  measure: number;
  /** Start tick of the note that was touched, if a note was touched. */
  noteTick: number | null;
}

/** How far around a note head a touch still counts as "on the note" (drawing units). */
const NOTE_MARGIN_X = 8;
const NOTE_MARGIN_Y_SPACES = 1.5;

/** Which measure (and which note, if any) is at this point? */
export function hitTest(layout: ScoreLayout, x: number, y: number): Hit | null {
  const measures = layout.measures;
  if (measures.length === 0) return null;
  const first = measures[0];
  const last = measures[measures.length - 1];
  if (x < first.x || x > last.x + last.width) return null;
  const index = measures.findIndex((m) => x >= m.x && x <= m.x + m.width);
  const measure = measures[index];

  const note = measure.events.find(
    (e) =>
      e.kind === 'note' &&
      x >= e.headLeft - NOTE_MARGIN_X &&
      x <= e.headRight + NOTE_MARGIN_X &&
      Math.abs(y - e.y) <= layout.lineSpacing * NOTE_MARGIN_Y_SPACES,
  );
  return { measure: index, noteTick: note ? note.tick : null };
}

/** Line or space under the finger, counted from the top line (0 = top line, 1 = space below, …). */
export function staffPositionAt(layout: ScoreLayout, y: number): number {
  return Math.round((y - layout.topLineY) / (layout.lineSpacing / 2));
}
