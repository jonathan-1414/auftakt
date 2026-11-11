/**
 * Where things were drawn, in drawing coordinates.
 * The renderer returns it; the input uses it to find out what was touched.
 */
export interface EventLayout {
  tick: number;
  kind: 'note' | 'rest';
  headLeft: number;
  headRight: number;
  y: number; // vertical center of the note head
}

export interface MeasureLayout {
  x: number;
  width: number;
  events: EventLayout[];
}

export interface ScoreLayout {
  topLineY: number;
  lineSpacing: number;
  measures: MeasureLayout[];
}
