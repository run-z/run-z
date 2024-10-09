import type { ZLogRecorder } from '@run-z/log-z';
import { ZJob } from '../../../core/jobs/job.js';
import { ZJobProgress } from '../job-progress.js';
import { ZProgressFormat } from '../progress-format.js';
import { ProgressZLogRecorder } from '../progress-log.js';
import { ZJobOutput } from './job-output.js';
import { ZJobRows } from './job-rows.js';
import { zJobSpinner } from './job-status-indicator.js';
import { RichJobZLogRecorder } from './rich-job.log.js';
import { richProgressZLogFormatter } from './rich-log-format.js';

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
  #interval!: NodeJS.Timeout;
  readonly #output = new ZJobOutput();

  override start(): void {
    this.#interval = setInterval(() => this.log.info(), zJobSpinner.interval);
  }

  override stop(): void {
    clearInterval(this.#interval);
  }

  protected override _createLog(): ZLogRecorder {
    return new RichJobZLogRecorder(
      (this._format as RichZProgressFormat).rows,
      this.#output,
      super._createLog(),
    );
  }
}
