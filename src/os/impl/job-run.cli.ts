import { mapIt } from '@proc7ts/a-iterable';
import { noop } from '@proc7ts/primitives';
import * as ansiEscapes from 'ansi-escapes';
import { spawn } from 'child_process';
import * as os from 'os';
import { promisify } from 'util';
import { AbortedZExecutionError, ZExecution, ZJob } from '../../core';
import { execZ } from '../../internals';
import { ZJobOutput } from './job-output';
import type { ZShellRunner } from './shell-runner.cli';

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
export class ZJobRun {

  private _pendingRender = false;
  private _row?: number;
  private readonly _output = new ZJobOutput();
  private _status: keyof typeof zJobRunStatus = 'progress';
  private _pending: Promise<void> = Promise.resolve();

  constructor(private readonly _runner: ZShellRunner, readonly job: ZJob) {
  }

  get reportsProgress(): boolean {
    return chalk.supportsColor && chalk.supportsColor.level;
  }

  run(command: string, args: readonly string[]): ZExecution {
    return execZ(() => {

      const childProcess = spawn(
          command,
          args,
          {
            cwd: this.job.call.task.target.location.path,
            env: {
              ...process.env,
              FORCE_COLOR: chalk.supportsColor ? String(chalk.supportsColor.level) : '0',
            },
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true,
          },
      );

      let abort = (): void => {
        childProcess.kill();
      };
      let whenDone = new Promise<void>((resolve, reject) => {

        const reportError = (error: any): void => {
          abort = noop;
          reject(error);
        };

        childProcess.on('error', reportError);
        childProcess.on('exit', (code, signal) => {
          if (signal) {
            reportError(new AbortedZExecutionError(signal));
          } else if (code) {
            reportError(code > 127 ? new AbortedZExecutionError(code) : code);
          } else {
            abort = noop;
            resolve();
          }
        });
        childProcess.stdout.on('data', chunk => this._report(chunk));
        childProcess.stderr.on('data', chunk => this._report(chunk, 1));
      }).then(
          () => this._reportSuccess(),
      ).catch(
          async error => {
            await this._reportError(error);
            return Promise.reject(error);
          },
      );

      if (this.reportsProgress) {

        const interval = setInterval(() => this._scheduleRender(), zJobSpinner.interval);

        whenDone = whenDone.finally(() => clearInterval(interval));
      }

      return {
        whenDone() {
          return whenDone;
        },
        abort() {
          abort();
        },
      };
    });
  }

  async render(): Promise<void> {
    if (this.reportsProgress) {
      await this._render();
    }
  }

  private _report(chunk: string | Buffer, fd: 0 | 1 = 0): void {
    this._output.add(chunk, fd);
    this._scheduleRender();
  }

  private _scheduleRender(): void {
    if (!this.reportsProgress) {
      this._pending = this._runner.schedule.schedule(async () => {
        await this._printAll();
        this._output.clear();
      });
    } else if (!this._pendingRender) {
      this._pendingRender = true;
      this._pending = this._runner.schedule.schedule(() => {
        this._pendingRender = false;
        return this._render();
      });
    }
  }

  private _printAll(): Promise<void> {
    this._pending = Promise.all(mapIt(
        this._output.lines(),
        ([line, fd]) => this._runner.println(`${this._prefix()}${line}`, fd),
    )).then();
    if (this._row == null) {
      this._row = this._runner.register(this);
    }
    return this._pending;
  }

  private async _render(): Promise<void> {

    const firstReport = this._row == null;
    let out = '';

    if (!firstReport) {
      // Position at proper row and clean it
      out += ansiEscapes.cursorSavePosition
          + ansiEscapes.cursorUp(this._runner.numRows - this._row!)
          + ansiEscapes.cursorLeft
          + ansiEscapes.eraseEndLine;
    }

    const prefix = zJobRunStatus[this._status]() + ' ' + this._prefix();
    const prefixCols = stringWidth(prefix);
    const status = wrapAnsi(this._output.status, process.stdout.columns - prefixCols, { hard: true, trim: false });

    out += `${prefix}${status}`;

    if (firstReport) {
      await this._runner.println(out);
      this._row = this._runner.register(this) - 1;
    } else {
      // Move back to original position
      await this._write(out + os.EOL + ansiEscapes.cursorRestorePosition);
    }
  }

  private _reportSuccess(): Promise<void> {
    this._status = 'ok';
    this._scheduleRender();
    return this._pending;
  }

  private _reportError(error: any): Promise<void> {
    this._status = 'error';
    this._report(error.message || String(error), 1);
    if (this.reportsProgress) {
      this._pending = this._runner.schedule.schedule(() => this._printAll());
    }
    return this._pending;
  }

  private _prefix(): string {

    const task = this.job.call.task;
    const targetName = chalk.green(task.target.name);
    const gaps1 = ' '.repeat(Math.max(this._runner.targetCols - stringWidth(targetName), 0));
    const taskName = chalk.greenBright(task.name);
    const gaps2 = ' '.repeat(Math.max(this._runner.taskCols - stringWidth(taskName), 0));

    return `${chalk.gray('[')}${targetName}${gaps1} ${taskName}${gaps2}${chalk.gray(']')} `;
  }

  private _write(text: string): Promise<void> {
    return promisify(process.stdout.write.bind(process.stdout))(text);
  }

}
