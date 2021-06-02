import { noop, valueProvider } from '@proc7ts/primitives';
import type { ZLogMessage } from '@run-z/log-z';

/**
 * @internal
 */
export class ZJobRows {

  private readonly _renders: (() => void)[] = [];
  private _numRows = 0;

  add(render: () => void): ZJobRow {
    this._renders.push(render);

    let up: () => number = valueProvider(0);
    let done = (): void => {
      done = noop;

      const row = this._numRows++;

      up = () => this._numRows - row;
    };

    return {
      up: () => up(),
      done: () => done(),
    };
  }

  renderAll(): void {
    this._renders.forEach(render => render());
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
export function zjobRowOf(message: ZLogMessage): ZJobRow {
  return message.details.row as ZJobRow;
}
