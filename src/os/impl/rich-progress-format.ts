/* eslint-disable @typescript-eslint/no-var-requires */
import { noop } from '@proc7ts/primitives';
import * as ansiEscapes from 'ansi-escapes';
import * as os from 'os';
import type { ZJob } from '../../core';
import { ZJobProgress } from './job-progress';
import { ZProgressFormat } from './progress-format';
import { write2stdout } from './writer-for';

/**
 * @internal
 */
export class RichZProgressFormat extends ZProgressFormat<RichZJobProgress> {

  private readonly _jobs: RichZJobProgress[] = [];

  jobProgress(job: ZJob): RichZJobProgress {
    return new RichZJobProgress(this, job);
  }

  register(jobProgress: RichZJobProgress): number {

    const { targetCols, taskCols } = this;
    const result = super.register(jobProgress);

    this._jobs.push(jobProgress);

    if (this.targetCols !== targetCols || this.taskCols !== taskCols) {
      this._renderAll().catch(noop);
    }

    return result;
  }

  private _renderAll(): Promise<void> {
    return this.schedule.schedule(async () => {
      for (const run of this._jobs) {
        await run.render();
      }
    });
  }

}

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
class RichZJobProgress extends ZJobProgress {

  private _status: keyof typeof zJobRunStatus = 'progress';
  private _interval!: NodeJS.Timeout;

  start(): void {
    this._interval = setInterval(() => this._scheduleRender(), zJobSpinner.interval);
  }

  stop(): void {
    clearInterval(this._interval);
  }

  async render(): Promise<void> {

    const firstReport = this._row == null || 0;
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
      await write2stdout(out + os.EOL + ansiEscapes.cursorRestorePosition);
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
