import { noop } from '@proc7ts/primitives';
import { AbortedZExecutionError } from '@run-z/exec-z';
import cliSpinners from 'cli-spinners';
import cliTruncate from 'cli-truncate';
import logSymbols from 'log-symbols';
import stringWidth from 'string-width';
import type { ZJob } from '../../core';
import { ZJobProgress } from './job-progress';
import { ZProgressFormat } from './progress-format';
import { textAtRow } from './text-at-row';
import { ttyColumns } from './tty-columns';
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

    if (firstReport) {
      await this._format.println(this._statusLine());
      this._row = this._format.register(this) - 1;
    } else {
      await write2stdout(textAtRow(this._format.numRows - this._row!, this._statusLine()));
    }
  }

  private _statusLine(): string {

    const prefix = zJobRunStatus[this._status]() + ' ' + this._prefix();
    const prefixCols = stringWidth(prefix);
    const status = cliTruncate(
        this._output.status,
        ttyColumns() - prefixCols,
        {
          preferTruncationOnSpace: true,
        },
    );

    return `${prefix}${status}`;
  }

  reportSuccess(): Promise<void> {
    if (!this._output.lastLine) {
      this.report('Ok');
    }
    this._status = 'ok';
    return super.reportSuccess();
  }

  reportError(error: any): Promise<void> {
    this._status = 'error';
    this.report(String(error), 1);

    if (error instanceof AbortedZExecutionError) {
      // No need to print abort message
      return this._pending;
    }

    // Print collected output
    return this._pending = this._format.schedule.schedule(() => this._printAll());
  }

  protected _scheduleRender(): void {
    this._pending = this._format.schedule.schedule(() => this.render());
  }

}
