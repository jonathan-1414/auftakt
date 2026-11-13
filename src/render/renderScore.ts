import { BarlineType, Beam, Formatter, Fraction, Renderer, Stave, StaveNote, Voice } from 'vexflow/bravura';
import { describeStatus, measureStatus } from '../model/check';
import { measureLength, placeEvents } from '../model/measure';
import { germanNoteName } from '../model/noteName';
import type { Position, Score, ScoreEvent, Staff } from '../model/types';
import type { MeasureLayout, ScoreLayout } from './layout';

/**
 * Draws the score as SVG. Contains no musical logic: everything it shows
 * (notes, rests, measure check) comes from the model. Cursor, selection and
 * preview are only drawn where the caller says.
 */

// Size of the drawing in "logical" pixels. The SVG is then scaled to the screen width.
export const WIDTH = 720;
const HEIGHT = 160;
const MARGIN = 10;
const STAVE_Y = 30;
const NAME_Y = 150;

const DURATION_CODES: Record<number, string> = { 192: 'w', 96: 'h', 48: 'q', 24: '8', 12: '16' };

export interface RenderOptions {
  showNoteNames: boolean;
  cursor: Position | null;
  selection: Position | null;
  /** Position of a note that is only a preview (drawn half transparent). */
  preview: Position | null;
}

function durationCode(ticks: number): string {
  const code = DURATION_CODES[ticks];
  if (!code) throw new Error(`No note value for ${ticks} ticks`);
  return code;
}

function toStaveNote(event: ScoreEvent, staff: Staff, wholeMeasure: boolean): StaveNote {
  if (event.kind === 'rest') {
    // A whole rest hangs from the 4th line; a rest filling the whole measure sits in the middle.
    const key = event.ticks === 192 ? 'd/5' : 'b/4';
    const rest = new StaveNote({ keys: [key], duration: durationCode(event.ticks) + 'r', clef: staff.clef });
    if (wholeMeasure) rest.setCenterAlignment(true);
    return rest;
  }
  const { step, octave } = event.pitch;
  return new StaveNote({
    keys: [`${step.toLowerCase()}/${octave}`],
    duration: durationCode(event.ticks),
    clef: staff.clef,
    autoStem: true,
  });
}

/**
 * Adds a CSS class to a drawn note. A beamed note's stem is drawn by the beam
 * and sits outside the note's own group, so it gets the class as well.
 */
function markNote(note: StaveNote, className: string): void {
  note.getSVGElement()?.classList.add(className);
  note.getStem()?.getSVGElement()?.classList.add(className);
}

/** Extra width that clef and time signature take up in the first measure. */
function headerWidth(clef: string, timeSignature: string): number {
  const plain = new Stave(0, 0, 200);
  const withHeader = new Stave(0, 0, 200).addClef(clef).addTimeSignature(timeSignature);
  return withHeader.getNoteStartX() - plain.getNoteStartX();
}

const same = (a: Position | null, staff: number, measure: number, tick: number) =>
  a !== null && a.staff === staff && a.measure === measure && a.tick === tick;

export function renderScore(container: HTMLElement, score: Score, options: RenderOptions): ScoreLayout {
  container.innerHTML = '';
  const drawing = document.createElement('div');
  const statusRow = document.createElement('div');
  statusRow.className = 'status-row';
  container.append(drawing, statusRow);

  const renderer = new Renderer(drawing, Renderer.Backends.SVG);
  renderer.resize(WIDTH, HEIGHT);
  const ctx = renderer.getContext();

  // Scale with the screen instead of using fixed pixels.
  const svg = drawing.querySelector('svg');
  if (svg) {
    svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '';
    svg.style.height = '';
  }

  const staffIndex = 0;
  const staff = score.staves[staffIndex];
  const { beats, beatValue } = score.timeSignature;
  const timeSignature = `${beats}/${beatValue}`;
  const length = measureLength(score.timeSignature);
  const extra = headerWidth(staff.clef, timeSignature);
  const count = staff.measures.length;
  const baseWidth = (WIDTH - 2 * MARGIN - extra) / count;

  const layout: ScoreLayout = { topLineY: 0, lineSpacing: 10, measures: [] };
  let x = MARGIN;
  staff.measures.forEach((measure, i) => {
    const width = baseWidth + (i === 0 ? extra : 0);
    const stave = new Stave(x, STAVE_Y, width);
    if (i === 0) stave.addClef(staff.clef).addTimeSignature(timeSignature);
    if (i === count - 1) stave.setEndBarType(BarlineType.END);
    stave.setContext(ctx).draw();
    layout.topLineY = stave.getYForLine(0);
    layout.lineSpacing = stave.getSpacingBetweenLines();
    const top = stave.getYForLine(0);
    const bottom = stave.getYForLine(stave.getNumLines() - 1);

    const placed = placeEvents(measure);
    const notes = measure.map((event) => toStaveNote(event, staff, event.ticks === length));
    const voice = new Voice({ numBeats: beats, beatValue }).addTickables(notes);
    notes.forEach((note) => note.setStave(stave)); // needed before reading note positions
    // Eighths are beamed per beat.
    const beams = Beam.generateBeams(notes, { groups: [new Fraction(1, beatValue)] });
    new Formatter().joinVoices([voice]).formatToStave([voice], stave);

    const measureLayout: MeasureLayout = {
      x,
      width,
      events: placed.map(({ start, event }, j) => ({
        tick: start,
        kind: event.kind,
        headLeft: notes[j].getNoteHeadBeginX(),
        headRight: notes[j].getNoteHeadEndX(),
        y: notes[j].getYs()[0],
      })),
    };
    layout.measures.push(measureLayout);

    voice.draw(ctx, stave);
    beams.forEach((beam) => beam.setContext(ctx).draw());

    placed.forEach(({ start, event }, j) => {
      if (event.kind !== 'note') return;
      if (same(options.preview, staffIndex, i, start)) markNote(notes[j], 'preview');
      // Selected note: drawn in the accent colour, the staff lines stay visible.
      if (same(options.selection, staffIndex, i, start)) markNote(notes[j], 'selected');
    });

    // Cursor: a line just before the spot where the next note will go.
    if (options.cursor && options.cursor.staff === staffIndex && options.cursor.measure === i) {
      const target = measureLayout.events.find((e) => e.tick === options.cursor!.tick);
      // An empty measure has one centred rest; the cursor still goes to the start.
      const emptyMeasure = measure.length === 1 && target?.kind === 'rest';
      const cursorX = emptyMeasure ? stave.getNoteStartX() + 4 : target ? target.headLeft - 6 : x + width - 6;
      ctx.openGroup('cursor');
      ctx.beginPath();
      ctx.rect(cursorX - 1.5, top - 14, 3, bottom - top + 28);
      ctx.fill();
      ctx.closeGroup();
    }

    // German note names, all on one line below the staff.
    if (options.showNoteNames) {
      ctx.openGroup('note-names');
      ctx.setFont('sans-serif', 14);
      placed.forEach(({ event }, j) => {
        if (event.kind !== 'note') return;
        const center = (notes[j].getNoteHeadBeginX() + notes[j].getNoteHeadEndX()) / 2;
        ctx.fillText(germanNoteName(event.pitch), center, NAME_Y);
      });
      ctx.closeGroup();
    }

    // Measure check below the measure, as normal text so that it can wrap.
    const status = measureStatus(measure);
    const left = i === 0 ? stave.getNoteStartX() : x;
    const cell = document.createElement('div');
    cell.className = status.full ? 'status full' : 'status missing';
    cell.style.left = `${(left / WIDTH) * 100}%`;
    cell.style.width = `${((x + width - left) / WIDTH) * 100}%`;
    cell.textContent = describeStatus(status);
    statusRow.append(cell);

    x += width;
  });
  return layout;
}
