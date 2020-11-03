import type { ZLogRecorder } from '@run-z/log-z';
import type { ZJob } from '../../../core';
import { ZJobProgress } from '../job-progress';
import { ZProgressFormat } from '../progress-format';
import { ProgressZLogRecorder } from '../progress-log';
import { ZJobOutput } from './job-output';
import { ZJobRows } from './job-rows';
import { zjobSpinner } from './job-status-indicator';
import { RichJobZLogRecorder } from './rich-job.log';
import { richProgressZLogFormatter } from './rich-log-format';

/**
 * @internal
 */
export class RichZProgressFormat extends ZProgressFormat<RichZJobProgress> {

  readonly rows = new ZJobRows();

  jobProgress(job: ZJob): RichZJobProgress {
    return new RichZJobProgress(this, job);
  }

  protected _createLog(): ZLogRecorder {
    return ProgressZLogRecorder.create({
      prefix: this.prefix,
      format: richProgressZLogFormatter(this.prefix),
      eol: '',
      onPrefixUpdate: () => {
        this.rows.renderAll();
      },
    });
  }

}

/**
 * @internal
 */
class RichZJobProgress extends ZJobProgress {

  private _interval!: NodeJS.Timeout;
  private readonly _output = new ZJobOutput();

  start(): void {
    this._interval = setInterval(() => this.log.info(), zjobSpinner.interval);
  }

  stop(): void {
    clearInterval(this._interval);
  }

  protected _createLog(): ZLogRecorder {
    return new RichJobZLogRecorder(
        (this._format as RichZProgressFormat).rows,
        this._output,
        super._createLog(),
    );
  }

}
