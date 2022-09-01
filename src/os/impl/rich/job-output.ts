import type { ZLogMessage } from '@run-z/log-z';
import { ZLogLevel, zlogMessage } from '@run-z/log-z';
import { stripControlChars } from '../strip-control-chars';

/**
 * @internal
 */
export class ZJobOutput {

  private _statusMessage: ZLogMessage | null = null;
  private readonly _lines: [string, 0 | 1][] = [];
  private _lastNL = true;

  get statusMessage(): ZLogMessage {
    return this._statusMessage || zlogMessage(ZLogLevel.Info, this.status);
  }

  get status(): string {
    return this.lastLine || '';
  }

  get lastLine(): string | undefined {
    for (let i = this._lines.length - 1; i >= 0; --i) {
      const line = stripControlChars(this._lines[i][0]);

      if (line.trim()) {
        return line;
      }
    }

    return;
  }

  setStatus(statusMessage: ZLogMessage): ZLogMessage {
    return (this._statusMessage = statusMessage);
  }

  add(chunk: string, fd: 0 | 1 = 0): void {
    const lines = chunk.split('\n');

    for (let i = 0; i < lines.length; ++i) {
      const line = lines[i];
      const append = !i && !this._lastNL;

      if (i === lines.length - 1) {
        // Last line
        if (!line) {
          this._lastNL = true;

          break;
        } else {
          this._lastNL = false;
        }
      }
      if (append) {
        this._lines[this._lines.length - 1][0] += line;
      } else {
        this._lines.push([line, fd]);
      }
    }
  }

  lines(): readonly [string, 0 | 1][] {
    return this._lines;
  }

  clear(): void {
    this._lines.length = 0;
    this._lastNL = true;
  }

}
