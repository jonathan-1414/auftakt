import { describe, expect, it } from 'vitest';
import type { ScoreLayout } from '../render/layout';
import { hitTest, staffPositionAt } from './hitTest';

const layout: ScoreLayout = {
  topLineY: 70,
  lineSpacing: 10,
  measures: [
    {
      x: 10,
      width: 200,
      events: [
        { tick: 0, kind: 'note', headLeft: 100, headRight: 112, y: 120 },
        { tick: 96, kind: 'rest', headLeft: 160, headRight: 172, y: 90 },
      ],
    },
    { x: 210, width: 150, events: [{ tick: 0, kind: 'rest', headLeft: 270, headRight: 282, y: 90 }] },
  ],
};

describe('hitTest', () => {
  it('finds the measure', () => {
    expect(hitTest(layout, 50, 90)).toMatchObject({ measure: 0, noteTick: null });
    expect(hitTest(layout, 300, 90)).toMatchObject({ measure: 1, noteTick: null });
  });

  it('ignores points outside the measures', () => {
    expect(hitTest(layout, 5, 90)).toBeNull();
    expect(hitTest(layout, 400, 90)).toBeNull();
  });

  it('finds a note near its head', () => {
    expect(hitTest(layout, 106, 120)).toMatchObject({ measure: 0, noteTick: 0 });
    expect(hitTest(layout, 94, 132)).toMatchObject({ measure: 0, noteTick: 0 });
  });

  it('does not count a touch far above the note as on the note', () => {
    expect(hitTest(layout, 106, 80)).toMatchObject({ measure: 0, noteTick: null });
  });

  it('never selects rests', () => {
    expect(hitTest(layout, 276, 90)).toMatchObject({ measure: 1, noteTick: null });
  });

  it('finds the column under the finger, even away from the head', () => {
    expect(hitTest(layout, 20, 60)?.columnTick).toBe(0); // left of everything
    expect(hitTest(layout, 130, 60)?.columnTick).toBe(0); // closer to the note
    expect(hitTest(layout, 140, 60)?.columnTick).toBe(96); // closer to the rest
    expect(hitTest(layout, 205, 60)?.columnTick).toBe(96); // right of everything
  });
});

describe('staffPositionAt', () => {
  it('rounds to the nearest line or space', () => {
    expect(staffPositionAt(layout, 70)).toBe(0);
    expect(staffPositionAt(layout, 76)).toBe(1);
    expect(staffPositionAt(layout, 110)).toBe(8);
    expect(staffPositionAt(layout, 121)).toBe(10);
    expect(staffPositionAt(layout, 64)).toBe(-1);
  });
});
