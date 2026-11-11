/**
 * Undo history: keeps copies of earlier states (no redo).
 * The oldest states are dropped when the limit is reached.
 */
export class History<T> {
  private states: T[] = [];

  constructor(private readonly limit = 100) {}

  push(state: T): void {
    this.states.push(structuredClone(state));
    if (this.states.length > this.limit) this.states.shift();
  }

  undo(): T | undefined {
    return this.states.pop();
  }

  canUndo(): boolean {
    return this.states.length > 0;
  }

  clear(): void {
    this.states = [];
  }
}
