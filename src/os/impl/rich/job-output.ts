import type { ZLogMessage } from '@run-z/log-z';
import { ZLogLevel, zlogMessage } from '@run-z/log-z';
import { stripControlChars } from '../strip-control-chars.js';

/**
 * @internal
 */
export class ZJobOutput {

  #statusMessage: ZLogMessage | null = null;
  readonly #lines: [string, 0 | 1][] = [];
  #lastNL = true;

  get statusMessage(): ZLogMessage {
    return this.#statusMessage || zlogMessage(ZLogLevel.Info, this.status);
  }

  get status(): string {
    return this.lastLine || '';
  }

  get lastLine(): string | undefined {
    for (let i = this.#lines.length - 1; i >= 0; --i) {
      const line = stripControlChars(this.#lines[i][0]);

      if (line.trim()) {
        return line;
      }
    }

    return;
  }

  setStatus(statusMessage: ZLogMessage): ZLogMessage {
    return (this.#statusMessage = statusMessage);
  }

  add(chunk: string, fd: 0 | 1 = 0): void {
    const lines = chunk.split('\n');

    for (let i = 0; i < lines.length; ++i) {
      const line = lines[i];
      const append = !i && !this.#lastNL;

      if (i === lines.length - 1) {
        // Last line
        if (!line) {
          this.#lastNL = true;

          break;
        } else {
          this.#lastNL = false;
        }
      }
      if (append) {
        this.#lines[this.#lines.length - 1][0] += line;
      } else {
        this.#lines.push([line, fd]);
      }
    }
  }

  lines(): readonly [string, 0 | 1][] {
    return this.#lines;
  }

  clear(): void {
    this.#lines.length = 0;
    this.#lastNL = true;
  }

}
