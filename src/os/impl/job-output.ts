import { stripControlChars } from './strip-control-chars';

/**
 * @internal
 */
export class ZJobOutput {

  private readonly _lines: [string, 0 | 1][] = [];
  private _lastNL = true;

  get status(): string {
    return this.lastLine || 'Running...';
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

  add(chunk: string | Buffer, fd: 0 | 1 = 0): void {

    const lines = String(chunk).split('\n');

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

  lines(): Iterable<[string, 0 | 1]> {
    return this._lines;
  }

  clear(): void {
    this._lines.length = 0;
    this._lastNL = true;
  }

}
