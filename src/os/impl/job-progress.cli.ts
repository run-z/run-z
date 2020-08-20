import { mapIt } from '@proc7ts/a-iterable';
import * as ansiEscapes from 'ansi-escapes';
import * as os from 'os';
import { promisify } from 'util';
import type { ZJob } from '../../core';
import { ZJobOutput } from './job-output';
import type { ZProgressFormat } from './progress-format.cli';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chalk = require('chalk');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cliSpinners = require('cli-spinners');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logSymbols = require('log-symbols');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const stringWidth = require('string-width');
// eslint-disable-next-line @typescript-eslint/no-var-requires
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
export class ZJobProgress {

  private _pendingRender = false;
  private _row?: number;
  private readonly _output = new ZJobOutput();
  private _status: keyof typeof zJobRunStatus = 'progress';
  private _pending: Promise<void> = Promise.resolve();
  private _interval?: NodeJS.Timeout;

  constructor(private readonly _format: ZProgressFormat, readonly job: ZJob) {
  }

  get reportsProgress(): boolean {
    return chalk.supportsColor && chalk.supportsColor.level;
  }

  start(): void {
    if (this.reportsProgress) {
      this._interval = setInterval(() => this._scheduleRender(), zJobSpinner.interval);
    }
  }

  stop(): void {
    if (this._interval) {
      clearInterval(this._interval);
    }
  }

  async render(): Promise<void> {
    if (this.reportsProgress) {
      await this._render();
    }
  }

  report(chunk: string | Buffer, fd: 0 | 1 = 0): void {
    this._output.add(chunk, fd);
    this._scheduleRender();
  }

  private _scheduleRender(): void {
    if (!this.reportsProgress) {
      this._pending = this._format.schedule.schedule(async () => {
        await this._printAll();
        this._output.clear();
      });
    } else if (!this._pendingRender) {
      this._pendingRender = true;
      this._pending = this._format.schedule.schedule(() => {
        this._pendingRender = false;
        return this._render();
      });
    }
  }

  private _printAll(): Promise<void> {
    this._pending = Promise.all(mapIt(
        this._output.lines(),
        ([line, fd]) => this._format.println(`${this._prefix()}${line}`, fd),
    )).then();
    if (this._row == null) {
      this._row = this._format.register(this);
    }
    return this._pending;
  }

  private async _render(): Promise<void> {

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
      await this._write(out + os.EOL + ansiEscapes.cursorRestorePosition);
    }
  }

  reportSuccess(): Promise<void> {
    this._status = 'ok';
    this._scheduleRender();
    return this._pending;
  }

  reportError(error: any): Promise<void> {
    this._status = 'error';
    this.report(error.message || String(error), 1);
    if (this.reportsProgress) {
      this._pending = this._format.schedule.schedule(() => this._printAll());
    }
    return this._pending;
  }

  private _prefix(): string {

    const task = this.job.call.task;
    const targetName = chalk.green(task.target.name);
    const gaps1 = ' '.repeat(Math.max(this._format.targetCols - stringWidth(targetName), 0));
    const taskName = chalk.greenBright(task.name);
    const gaps2 = ' '.repeat(Math.max(this._format.taskCols - stringWidth(taskName), 0));

    return `${chalk.gray('[')}${targetName}${gaps1} ${taskName}${gaps2}${chalk.gray(']')} `;
  }

  private _write(text: string): Promise<void> {
    return promisify(process.stdout.write.bind(process.stdout))(text);
  }

}
