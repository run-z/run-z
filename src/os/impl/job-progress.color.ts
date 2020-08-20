/* eslint-disable @typescript-eslint/no-var-requires */
import * as ansiEscapes from 'ansi-escapes';
import * as os from 'os';
import { promisify } from 'util';
import { ZJobProgress } from './job-progress.cli';

/**
 * @internal
 */
const cliSpinners = require('cli-spinners');

/**
 * @internal
 */
const logSymbols = require('log-symbols');

/**
 * @internal
 */
const stringWidth = require('string-width');

/**
 * @internal
 */
const wrapAnsi = require('wrap-ansi');

/**
 * @internal
 */
const zJobSpinner = cliSpinners.dots;

/**
 * @internal
 */
const zJobRunStatus = {

  progress(): string {

    const { interval, frames } = zJobSpinner;
    const now = Date.now();
    const period = interval * frames.length;
    const sinceStart = now % period;
    const stage = Math.floor(sinceStart / interval);

    return frames[stage];
  },

  ok(): string {
    return logSymbols.success;
  },

  error(): string {
    return logSymbols.error;
  },

};

/**
 * @internal
 */
const writeToStdout = promisify(process.stdout.write.bind(process.stdout));

/**
 * @internal
 */
export class ColorZJobProgress extends ZJobProgress {

  private _status: keyof typeof zJobRunStatus = 'progress';

  start(): void {

    const interval = setInterval(() => this._scheduleRender(), zJobSpinner.interval);

    this.stop = () => clearInterval(interval);
  }

  async render(): Promise<void> {

    const firstReport = this._row == null;
    let out = '';

    if (!firstReport) {
      // Position at proper row and clean it
      out += ansiEscapes.cursorSavePosition
          + ansiEscapes.cursorUp(this._format.numRows - this._row!)
          + ansiEscapes.cursorLeft
          + ansiEscapes.eraseEndLine;
    }

    const prefix = zJobRunStatus[this._status]() + ' ' + this._prefix();
    const prefixCols = stringWidth(prefix);
    const status = wrapAnsi(this._output.status, process.stdout.columns - prefixCols, { hard: true, trim: false });

    out += `${prefix}${status}`;

    if (firstReport) {
      await this._format.println(out);
      this._row = this._format.register(this) - 1;
    } else {
      // Move back to original position
      await writeToStdout(out + os.EOL + ansiEscapes.cursorRestorePosition);
    }
  }

  reportSuccess(): Promise<void> {
    this._status = 'ok';
    return super.reportSuccess();
  }

  reportError(error: any): Promise<void> {
    this._status = 'error';
    this.report(error.message || String(error), 1);
    return this._pending = this._format.schedule.schedule(() => this._printAll());
  }

  protected _scheduleRender(): void {
    this._pending = this._format.schedule.schedule(() => this.render());
  }

}
