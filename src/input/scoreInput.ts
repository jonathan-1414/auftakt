/**
 * Turns touch, pen and mouse events on the score into calls of the app.
 * Coordinates are converted into drawing coordinates first.
 * A second finger (pinch zoom) cancels the current gesture.
 */
export interface ScoreGestureHandler {
  down(x: number, y: number): void;
  move(x: number, y: number): void;
  up(): void;
  cancel(): void;
}

function toDrawing(element: HTMLElement, event: PointerEvent): { x: number; y: number } | null {
  const svg = element.querySelector('svg');
  const matrix = svg?.getScreenCTM();
  if (!svg || !matrix) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}

export function attachScoreInput(element: HTMLElement, handler: ScoreGestureHandler): void {
  const pointers = new Set<number>();
  let active: number | null = null;

  element.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.add(event.pointerId);
    if (pointers.size > 1) {
      if (active !== null) handler.cancel();
      active = null;
      return;
    }
    const point = toDrawing(element, event);
    if (!point) return;
    active = event.pointerId;
    element.setPointerCapture(event.pointerId);
    handler.down(point.x, point.y);
  });

  element.addEventListener('pointermove', (event) => {
    if (event.pointerId !== active) return;
    const point = toDrawing(element, event);
    if (point) handler.move(point.x, point.y);
  });

  const end = (event: PointerEvent, cancelled: boolean) => {
    pointers.delete(event.pointerId);
    if (event.pointerId !== active) return;
    active = null;
    if (cancelled) handler.cancel();
    else handler.up();
  };
  element.addEventListener('pointerup', (event) => end(event, false));
  element.addEventListener('pointercancel', (event) => end(event, true));
}
