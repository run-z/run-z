import { ZLogLevel, zlogMessage, ZLogMessage, ZLogRecorder } from '@run-z/log-z';
import type { ZJobOutput } from './job-output';
import type { ZJobRow, ZJobRows } from './job-rows';

/**
 * @internal
 */
export class RichJobZLogRecorder implements ZLogRecorder {

  private _row: ZJobRow | null = null;

  constructor(
      private readonly _rows: ZJobRows,
      private readonly _output: ZJobOutput,
      private readonly _by: ZLogRecorder,
  ) {
  }

  record(message: ZLogMessage): void {

    const { error, details: { success } } = message;

    if (error != null) {
      // Error report.
      // Update status and log collected error.
      this._by.record(this._output.setStatus({
        ...message,
        level: ZLogLevel.Info,
        text: String(error),
        details: { ...message.details, row: this._useRow() },
      }));

      this._output.lines().forEach(([message, err]) => this._by.record(
          zlogMessage(err ? ZLogLevel.Error : ZLogLevel.Info, message),
      ));

      this._by.record(message);
    } else if (success) {
      // Final success
      // Update status.
      this._by.record(this._output.setStatus({
        ...message,
        level: ZLogLevel.Info,
        text: this._output.lastLine || 'Ok',
        details: { ...message.details, row: this._useRow() },
      }));
    } else {
      // Regular message.
      // Update status and record output.
      this._output.add(message.text, message.level >= ZLogLevel.Error ? 1 : 0);
      this._by.record({
        ...message,
        level: ZLogLevel.Info,
        text: this._output.status,
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
    if (this._row != null) {
      return this._row;
    }
    return this._row = this._rows.add(() => this.record(this._output.statusMessage));
  }

}
