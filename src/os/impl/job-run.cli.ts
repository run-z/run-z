import { noop } from '@proc7ts/primitives';
import * as ansiEscapes from 'ansi-escapes';
import { ChildProcessByStdio, spawn } from 'child_process';
import * as os from 'os';
import type { Readable } from 'stream';
import { promisify } from 'util';
import { AbortedZExecutionError, ZExecution, ZJob } from '../../core';
import { execZ } from '../../internals';
import type { ZShellRunner } from './shell-runner.cli';
import { stripControlChars } from './strip-control-chars';

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

  private _process!: ChildProcessByStdio<null, Readable, Readable>;
  private _pendingRender = false;
  private _row?: number;
  private readonly _output: [string, 0 | 1][] = [];
  private _outputNL = true;
  private _status: keyof typeof zJobRunStatus = 'progress';

  constructor(private readonly _runner: ZShellRunner, readonly job: ZJob) {
  }

  get reportsProgress(): boolean {
    return chalk.supportsColor && chalk.supportsColor.level;
  }

  get status(): string {
    for (let i = this._output.length - 1; i >= 0; --i) {

      const line = stripControlChars(this._output[i][0]);

      if (line.trim()) {
        return line;
      }
    }

    return 'Running...';
  }

  run(command: string, args: readonly string[]): ZExecution {
    return execZ(() => {
      this._process = spawn(
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
        this._process.kill();
      };
      const whenDone = new Promise<void>((resolve, reject) => {

        const reportError = (error: any): void => {
          abort = noop;
          reject(error);
        };

        this._process.on('error', reportError);
        this._process.on('exit', (code, signal) => {
          if (signal) {
            reportError(new AbortedZExecutionError(signal));
          } else if (code) {
            reportError(code > 127 ? new AbortedZExecutionError(code) : code);
          } else {
            abort = noop;
            resolve();
          }
        });
        this._process.stdout.on('data', chunk => this._report(chunk));
        this._process.stderr.on('data', chunk => this._report(chunk, 1));
      }).then(
          () => this._reportSuccess(),
      ).catch(
          error => {
            this._reportError(error);
            return Promise.reject(error);
          },
      );

      if (this.reportsProgress) {

        const interval = setInterval(() => this._scheduleRender(), zJobSpinner.interval);

        whenDone.finally(() => clearInterval(interval));
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

    const lines = String(chunk).split('\n');

    for (let i = 0; i < lines.length; ++i) {

      const line = lines[i];
      const append = !i && !this._outputNL;

      if (i === lines.length - 1) {
        // Last line
        if (!line) {
          this._outputNL = true;
          break;
        } else {
          this._outputNL = false;
        }
      }
      if (append) {
        this._output[this._output.length - 1][0] += line;
      } else {
        this._output.push([line, fd]);
      }
    }

    this._scheduleRender();
  }

  private _scheduleRender(): void {
    if (!this.reportsProgress) {
      this._runner.schedule(async () => {
        await this._printAll();
        this._output.length = 0;
      });
    } else if (!this._pendingRender) {
      this._pendingRender = true;
      this._runner.schedule(() => {
        this._pendingRender = false;
        return this._render();
      });
    }
  }

  private async _printAll(): Promise<void> {
    await Promise.all(this._output.map(
        ([line, fd]) => this._runner.println(`${this._prefix()}${line}`, fd),
    ));
    if (this._row == null) {
      this._row = this._runner.register(this);
    }
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
    const status = wrapAnsi(this.status, process.stdout.columns - prefixCols, { hard: true, trim: false });

    out += `${prefix}${status}`;

    if (firstReport) {
      await this._runner.println(out);
      this._row = this._runner.register(this) - 1;
    } else {
      // Move back to original position
      await this._write(out + os.EOL + ansiEscapes.cursorRestorePosition);
    }
  }

  private _reportSuccess(): void {
    this._status = 'ok';
    this._scheduleRender();
  }

  private _reportError(error: any): void {
    this._status = 'error';
    this._report(error.message || String(error), 1);
    if (this.reportsProgress) {
      this._runner.schedule(() => this._printAll());
    }
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
