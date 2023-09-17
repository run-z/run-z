import { ZLogLevel, zlogMessage, ZLogMessage, ZLogRecorder } from '@run-z/log-z';
import type { ZJobOutput } from './job-output.js';
import type { ZJobRow, ZJobRows } from './job-rows.js';

/**
 * @internal
 */
export class RichJobZLogRecorder implements ZLogRecorder {

  readonly #rows: ZJobRows;
  readonly #output: ZJobOutput;
  readonly #by: ZLogRecorder;
  #row: ZJobRow | null = null;

  constructor(rows: ZJobRows, output: ZJobOutput, by: ZLogRecorder) {
    this.#rows = rows;
    this.#output = output;
    this.#by = by;
  }

  record(message: ZLogMessage): void {
    const {
      details: { error, success },
    } = message;

    if (error != null) {
      const line: unknown[] = error instanceof Error ? [error.message] : [String(error)];

      // Error report.
      // Update status and log collected error.
      this.#by.record(
        this.#output.setStatus({
          ...message,
          level: ZLogLevel.Info,
          line,
          details: { ...message.details, row: this.#useRow() },
        }),
      );

      this.#output
        .lines()
        .forEach(([message, err]) => this.#by.record(zlogMessage(err ? ZLogLevel.Error : ZLogLevel.Info, message)));

      this.#by.record({ ...message, line });
    } else if (success) {
      // Final success
      // Update status.
      this.#by.record(
        this.#output.setStatus({
          ...message,
          level: ZLogLevel.Info,
          line: [this.#output.lastLine || 'Ok'],
          details: { ...message.details, row: this.#useRow() },
        }),
      );
    } else {
      // Regular message.
      // Update status and record output.
      this.#output.add(message.line.join(' '), message.level >= ZLogLevel.Error ? 1 : 0);
      this.#by.record({
        ...message,
        level: ZLogLevel.Info,
        line: [this.#output.status],
        details: { ...message.details, row: this.#useRow() },
      });
    }
  }

  whenLogged(which?: 'all' | 'last'): Promise<boolean> {
    return this.#by.whenLogged(which);
  }

  end(): Promise<void> {
    return this.#by.end();
  }

  #useRow(): ZJobRow {
    if (this.#row != null) {
      return this.#row;
    }

    return (this.#row = this.#rows.add(() => this.record(this.#output.statusMessage)));
  }

}
