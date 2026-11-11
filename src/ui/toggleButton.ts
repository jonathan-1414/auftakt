/** A labelled on/off button for the toolbar. */
export function createToggleButton(
  label: string,
  initial: boolean,
  onChange: (on: boolean) => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tool';
  button.textContent = label;
  let on = initial;
  button.setAttribute('aria-pressed', String(on));
  button.addEventListener('click', () => {
    on = !on;
    button.setAttribute('aria-pressed', String(on));
    onChange(on);
  });
  return button;
}
