import { cleanMeta, type Meta, type MetaError } from '../model/meta';

/**
 * Dialogs: the start dialog (who writes, which class, title) and a yes/no question.
 * Built on the browser's <dialog> element, so they work with touch, keyboard and screen readers.
 */

const MAX_NAMES = 6;

const ERROR_TEXTS: Record<MetaError, string> = {
  'names-missing': 'Bitte mindestens einen Namen eintragen.',
  'class-missing': 'Bitte die Klasse eintragen.',
};

/** Creates an element with properties (e.g. textContent, type) and children. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element: HTMLElementTagNameMap[K] = document.createElement(tag);
  Object.assign(element, props);
  element.append(...children);
  return element;
}

function textButton(label: string, className = 'tool'): HTMLButtonElement {
  return el('button', { type: 'button', className, textContent: label });
}

/**
 * Shows a modal dialog. Returns `finish`, which closes and removes it.
 * The answer is passed on directly instead of relying on the dialog's own 'close'
 * event (that event is not delivered reliably while a page is in the background).
 */
function showDialog(dialog: HTMLDialogElement, onEscape: (() => void) | null): () => void {
  dialog.addEventListener('cancel', (event) => {
    // The start dialog cannot be closed with Escape: name and class are required.
    event.preventDefault();
    onEscape?.();
  });
  document.body.append(dialog);
  dialog.showModal();
  return () => {
    dialog.close();
    dialog.remove();
  };
}

/**
 * Asks for name(s), class and title. In 'start' mode it cannot be cancelled.
 * Resolves with the cleaned details, or null if cancelled ('edit' mode only).
 */
export function askForMeta(mode: 'start' | 'edit', current: Meta): Promise<Meta | null> {
  return new Promise((resolve) => {
    const dialog = el('dialog', { className: 'dialog' });
    const form = el('form', { noValidate: true });

    const heading = el('h2', { textContent: mode === 'start' ? 'Neue Partitur' : 'Angaben ändern' });
    const intro = el('p', { className: 'dialog-text', textContent: 'Trag ein, wer an dieser Partitur schreibt.' });

    // Names: one field per person, more can be added.
    const nameList = el('div', { className: 'name-list' });
    const addButton = textButton('+ Weitere Person', 'tool small');
    const nameInputs = () => [...nameList.querySelectorAll('input')];
    function addName(value: string): void {
      const index = nameInputs().length + 1;
      const input = el('input', { type: 'text', value, maxLength: 40, autocomplete: 'off', name: `name-${index}` });
      input.setAttribute('aria-label', `Name ${index}`);
      const row = el('div', { className: 'name-row' }, input);
      if (index > 1) {
        const remove = textButton('✕', 'tool small');
        remove.setAttribute('aria-label', 'Name entfernen');
        remove.addEventListener('click', () => {
          row.remove();
          addButton.hidden = false;
        });
        row.append(remove);
      }
      nameList.append(row);
      addButton.hidden = nameInputs().length >= MAX_NAMES;
    }
    (current.names.length ? current.names : ['']).forEach(addName);
    addButton.addEventListener('click', () => {
      addName('');
      nameInputs().at(-1)?.focus();
    });

    const classInput = el('input', { type: 'text', value: current.className, maxLength: 10, autocomplete: 'off', id: 'meta-class' });
    const titleInput = el('input', { type: 'text', value: current.title, maxLength: 60, autocomplete: 'off', id: 'meta-title' });
    const error = el('p', { className: 'dialog-error' });
    error.setAttribute('role', 'alert');

    const submit = el('button', { type: 'submit', className: 'tool primary', textContent: mode === 'start' ? 'Los geht’s' : 'Speichern' });
    const actions = el('div', { className: 'dialog-actions' });
    const cancel = textButton('Abbrechen');
    if (mode === 'edit') actions.append(cancel);
    actions.append(submit);

    form.append(
      heading,
      intro,
      el('fieldset', { className: 'field' }, el('legend', { textContent: 'Name(n)' }), nameList, addButton),
      el('div', { className: 'field' }, el('label', { htmlFor: 'meta-class', textContent: 'Klasse' }), classInput),
      el('div', { className: 'field' }, el('label', { htmlFor: 'meta-title', textContent: 'Titel (freiwillig)' }), titleInput),
      error,
      actions,
    );
    dialog.append(form);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const cleaned = cleanMeta({
        title: titleInput.value,
        names: nameInputs().map((i) => i.value),
        className: classInput.value,
      });
      if (!cleaned.ok) {
        error.textContent = cleaned.errors.map((e) => ERROR_TEXTS[e]).join(' ');
        (cleaned.errors[0] === 'names-missing' ? nameInputs()[0] : classInput).focus();
        return;
      }
      done(cleaned.meta);
    });
    form.addEventListener('input', () => (error.textContent = ''));
    cancel.addEventListener('click', () => done(null));
    const close = showDialog(dialog, mode === 'edit' ? () => done(null) : null);
    function done(meta: Meta | null): void {
      close();
      resolve(meta);
    }
  });
}

/** A yes/no question. Resolves true if confirmed. */
export function confirm(text: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = el('dialog', { className: 'dialog' });
    const cancel = textButton('Abbrechen');
    const ok = textButton(confirmLabel, 'tool primary');
    dialog.append(el('p', { className: 'dialog-text', textContent: text }), el('div', { className: 'dialog-actions' }, cancel, ok));
    const close = showDialog(dialog, () => done(false));
    function done(answer: boolean): void {
      close();
      resolve(answer);
    }
    cancel.addEventListener('click', () => done(false));
    ok.addEventListener('click', () => done(true));
    cancel.focus();
  });
}

export type HandInFormat = 'auftakt' | 'pdf';

/**
 * The hand-in dialog: choose the formats (none chosen at first), then share.
 * The file is prepared as soon as the choice changes, so that sharing can start
 * directly from the tap (browsers only allow the share menu right after a touch).
 */
export function askHandIn(options: {
  fileName(formats: HandInFormat[]): string;
  prepare(formats: HandInFormat[]): Promise<File>;
  canShare(file: File): boolean;
  deliver(file: File): Promise<void>;
}): Promise<void> {
  return new Promise((resolve) => {
    const dialog = el('dialog', { className: 'dialog' });
    const choices: Array<[HandInFormat, string]> = [
      ['auftakt', 'Auftakt-Datei'],
      ['pdf', 'PDF'],
    ];
    const boxes = choices.map(([format, label]) => {
      const input = el('input', { type: 'checkbox', checked: false, value: format });
      return { format, input, row: el('label', { className: 'check-row' }, input, label) };
    });
    const nameLine = el('p', { className: 'dialog-text file-name' });
    const hint = el('p', { className: 'dialog-error' });
    hint.setAttribute('role', 'alert');
    const cancel = textButton('Abbrechen');
    const send = el('button', { type: 'button', className: 'tool primary' });

    dialog.append(
      el('h2', { textContent: 'Abgeben' }),
      el('fieldset', { className: 'field' }, el('legend', { textContent: 'Was möchtest du abgeben?' }), ...boxes.map((b) => b.row)),
      nameLine,
      hint,
      el('div', { className: 'dialog-actions' }, cancel, send),
    );

    let file: File | null = null;
    let request = 0;
    async function update(): Promise<void> {
      const formats = boxes.filter((b) => b.input.checked).map((b) => b.format);
      file = null;
      const mine = ++request;
      hint.textContent = '';
      if (formats.length === 0) {
        nameLine.textContent = 'Wähle mindestens ein Format.';
        send.textContent = 'Teilen';
        send.disabled = true;
        return;
      }
      nameLine.textContent = `Datei: ${options.fileName(formats)}`;
      send.textContent = 'Wird vorbereitet …';
      send.disabled = true;
      try {
        const prepared = await options.prepare(formats);
        if (mine !== request) return; // the choice changed in the meantime
        file = prepared;
        send.textContent = options.canShare(prepared) ? 'Teilen' : 'Herunterladen';
        send.disabled = false;
      } catch {
        if (mine !== request) return;
        hint.textContent = 'Die Datei konnte nicht erstellt werden. Bitte noch einmal versuchen.';
        send.textContent = 'Teilen';
      }
    }
    boxes.forEach((b) => b.input.addEventListener('change', () => void update()));

    const close = showDialog(dialog, () => done());
    // Focus the dialog itself, not the first checkbox: otherwise Safari draws a focus ring
    // around it, which looks as if it had been chosen.
    dialog.tabIndex = -1;
    dialog.focus();
    function done(): void {
      request++;
      close();
      resolve();
    }
    cancel.addEventListener('click', () => done());
    send.addEventListener('click', () => {
      if (!file) return;
      const ready = file;
      void options.deliver(ready).finally(done);
    });
    void update();
  });
}
