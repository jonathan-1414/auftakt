import { DURATION_NAMES } from '../model/constants';
import type { RevealPhase } from './timedReveal';

/** Music font symbols (SMuFL code points in Bravura) for the note value buttons. */
const DURATION_GLYPHS: Record<number, string> = {
  192: '',
  96: '',
  48: '',
  24: '',
};

export interface ToolbarState {
  duration: number;
  canUndo: boolean;
  canDelete: boolean;
  playing: boolean;
}

export interface Toolbar {
  update(state: ToolbarState): void;
  /** Note names button: a bar empties while names are shown, then fills while locked. */
  setNoteNamesPhase(phase: RevealPhase, durationMs: number): void;
}

export interface ToolbarActions {
  selectDuration(ticks: number): void;
  togglePlay(): void;
  undo(): void;
  deleteSelection(): void;
  showNoteNames(): void;
  newScore(): void;
  editDetails(): void;
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

/** A button that shows only a symbol; the name is given for screen readers and as a tooltip. */
function iconButton(name: string, glyph: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tool icon';
  b.setAttribute('aria-label', name);
  b.title = name;
  const symbol = document.createElement('span');
  symbol.className = 'icon-glyph';
  symbol.setAttribute('aria-hidden', 'true');
  symbol.textContent = glyph;
  b.append(symbol);
  b.addEventListener('click', onClick);
  return b;
}

export function createToolbar(
  container: HTMLElement,
  durations: number[],
  actions: ToolbarActions,
): Toolbar {
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

  const playGroup = document.createElement('div');
  playGroup.className = 'tool-group';
  const playButton = button('Abspielen', actions.togglePlay, '▶');
  playButton.classList.add('play');
  playGroup.append(playButton);
  const playLabel = playButton.querySelector('span:not(.glyph)')!;
  const playGlyph = playButton.querySelector('.glyph')!;

  const actionGroup = document.createElement('div');
  actionGroup.className = 'tool-group';
  const undoButton = button('Rückgängig', actions.undo, '↶');
  const deleteButton = button('Löschen', actions.deleteSelection, '✕');
  const namesButton = button('Notennamen', actions.showNoteNames);
  namesButton.classList.add('timed');
  const namesBar = document.createElement('span');
  namesBar.className = 'time-bar';
  namesBar.setAttribute('aria-hidden', 'true');
  namesButton.prepend(namesBar);
  actionGroup.append(undoButton, deleteButton, namesButton);

  // "New" and "Details" are used rarely: symbols only, always in the top right corner.
  const scoreGroup = document.createElement('div');
  scoreGroup.className = 'tool-group corner';
  scoreGroup.append(iconButton('Neue Partitur', '+', actions.newScore), iconButton('Angaben ändern', 'ⓘ', actions.editDetails));

  // The main groups wrap onto more lines if needed; the corner group stays at the top right.
  const main = document.createElement('div');
  main.className = 'toolbar-main';
  main.append(durationGroup, playGroup, actionGroup);
  container.append(main, scoreGroup);

  return {
    update(state) {
      for (const { ticks, b } of durationButtons) {
        b.setAttribute('aria-pressed', String(ticks === state.duration));
      }
      undoButton.disabled = !state.canUndo;
      deleteButton.disabled = !state.canDelete;
      playLabel.textContent = state.playing ? 'Stopp' : 'Abspielen';
      playGlyph.textContent = state.playing ? '■' : '▶';
      playButton.setAttribute('aria-pressed', String(state.playing));
    },

    setNoteNamesPhase(phase, durationMs) {
      namesButton.dataset.phase = phase;
      namesButton.disabled = phase === 'cooldown';
      namesButton.setAttribute('aria-pressed', String(phase === 'showing'));
      if (phase === 'idle') return;
      // Jump to the start without animation, then run the bar to the end.
      const [from, to] = phase === 'showing' ? [1, 0] : [0, 1];
      namesBar.style.transition = 'none';
      namesBar.style.transform = `scaleX(${from})`;
      void namesBar.offsetWidth; // makes the browser apply the start value first
      namesBar.style.transition = `transform ${durationMs}ms linear`;
      namesBar.style.transform = `scaleX(${to})`;
    },
  };
}
