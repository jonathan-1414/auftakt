/**
 * Symbols drawn as SVG, so that they look the same on every device.
 * They take the text colour of their button (currentColor).
 */
const svg = (paths: string) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  /** Share (box with arrow up), as known from the iPad: hand in. */
  share: svg(
    '<path d="M8 9H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1h-2"/><path d="M12 3v11"/><path d="M8.5 6.5 12 3l3.5 3.5"/>',
  ),
  /** Plus: new score. */
  plus: svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  /** Circle with i: details (names, class, title). */
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/>'),
};
