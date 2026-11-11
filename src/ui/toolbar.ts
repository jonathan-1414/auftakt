import { DURATION_NAMES } from '../model/constants';

/** Music font symbols (SMuFL code points in Bravura) for the note value buttons. */
const DURATION_GLYPHS: Record<number, string> = {
  192: '',
  96: '',
  48: '',
  24: '',
};

export interface ToolbarState {
  duration: number;
  /** Note values that fit at the cursor; the others are greyed out. */
  fitting: number[];
  canUndo: boolean;
  canDelete: boolean;
  showNoteNames: boolean;
}

export interface ToolbarActions {
  selectDuration(ticks: number): void;
  undo(): void;
  deleteSelection(): void;
  toggleNoteNames(): void;
}

function button(label: string, onClick: () => void, glyph?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tool';
  if (glyph) {
    const symbol = document.createElement('span');
    symbol.className = 'glyph';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = glyph;
    b.append(symbol);
  }
  const text = document.createElement('span');
  text.textContent = label;
  b.append(text);
  b.addEventListener('click', onClick);
  return b;
}

export function createToolbar(
  container: HTMLElement,
  durations: number[],
  actions: ToolbarActions,
): (state: ToolbarState) => void {
  const durationGroup = document.createElement('div');
  durationGroup.className = 'tool-group';
  durationGroup.setAttribute('role', 'group');
  durationGroup.setAttribute('aria-label', 'Notenwert');
  const durationButtons = durations.map((ticks) => {
    const b = button(DURATION_NAMES[ticks], () => actions.selectDuration(ticks), DURATION_GLYPHS[ticks]);
    b.classList.add('duration');
    durationGroup.append(b);
    return { ticks, b };
  });

  const actionGroup = document.createElement('div');
  actionGroup.className = 'tool-group';
  const undoButton = button('Rückgängig', actions.undo, '↶');
  const deleteButton = button('Löschen', actions.deleteSelection, '✕');
  const namesButton = button('Notennamen', actions.toggleNoteNames);
  actionGroup.append(undoButton, deleteButton, namesButton);

  container.append(durationGroup, actionGroup);

  return (state) => {
    for (const { ticks, b } of durationButtons) {
      b.setAttribute('aria-pressed', String(ticks === state.duration));
      b.classList.toggle('unavailable', !state.fitting.includes(ticks));
    }
    undoButton.disabled = !state.canUndo;
    deleteButton.disabled = !state.canDelete;
    namesButton.setAttribute('aria-pressed', String(state.showNoteNames));
  };
}
