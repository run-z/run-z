import { noop, valueProvider } from '@proc7ts/primitives';
import type { ZLogMessage } from '@run-z/log-z';

/**
 * @internal
 */
export class ZJobRows {
  readonly #renders: (() => void)[] = [];
  #numRows = 0;

  add(render: () => void): ZJobRow {
    this.#renders.push(render);

    let up: () => number = valueProvider(0);
    let done = (): void => {
      done = noop;

      const row = this.#numRows++;

      up = () => this.#numRows - row;
    };

    return {
      up: () => up(),
      done: () => done(),
    };
  }

  renderAll(): void {
    this.#renders.forEach(render => render());
  }
}

/**
 * @internal
 */
export interface ZJobRow {
  up(): number;

  done(): void;
}

/**
 * @internal
 */
export function zJobRowOf(message: ZLogMessage): ZJobRow {
  return message.details.row as ZJobRow;
}
