import { ZLogLevel, zlogMessage, ZLogMessage, ZLogRecorder } from '@run-z/log-z';
import type { ZJobOutput } from './job-output.js';
import type { ZJobRow, ZJobRows } from './job-rows.js';

/**
 * @internal
 */
export class RichJobZLogRecorder implements ZLogRecorder {

  #row: ZJobRow | null = null;

  constructor(
    private readonly _rows: ZJobRows,
    private readonly _output: ZJobOutput,
    private readonly _by: ZLogRecorder,
  ) {}

  record(message: ZLogMessage): void {
    const {
      details: { error, success },
    } = message;

    if (error != null) {
      const line: unknown[] = error instanceof Error ? [error.message] : [String(error)];

      // Error report.
      // Update status and log collected error.
      this._by.record(
        this._output.setStatus({
          ...message,
          level: ZLogLevel.Info,
          line,
          details: { ...message.details, row: this._useRow() },
        }),
      );

      this._output
        .lines()
        .forEach(([message, err]) => this._by.record(zlogMessage(err ? ZLogLevel.Error : ZLogLevel.Info, message)));

      this._by.record({ ...message, line });
    } else if (success) {
      // Final success
      // Update status.
      this._by.record(
        this._output.setStatus({
          ...message,
          level: ZLogLevel.Info,
          line: [this._output.lastLine || 'Ok'],
          details: { ...message.details, row: this._useRow() },
        }),
      );
    } else {
      // Regular message.
      // Update status and record output.
      this._output.add(message.line.join(' '), message.level >= ZLogLevel.Error ? 1 : 0);
      this._by.record({
        ...message,
        level: ZLogLevel.Info,
        line: [this._output.status],
        details: { ...message.details, row: this._useRow() },
      });
    }
  }

  whenLogged(which?: 'all' | 'last'): Promise<boolean> {
    return this._by.whenLogged(which);
  }

  end(): Promise<void> {
    return this._by.end();
  }

  private _useRow(): ZJobRow {
    if (this.#row != null) {
      return this.#row;
    }

    return (this.#row = this._rows.add(() => this.record(this._output.statusMessage)));
  }

}
