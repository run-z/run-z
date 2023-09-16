import { logZAtopOf, logZBy, logZWithDetails, ZLogger, ZLogRecorder } from '@run-z/log-z';
import { ZJob } from '../../core/jobs/job.js';
import { ZProgressFormat } from './progress-format.js';

/**
 * @internal
 */
export abstract class ZJobProgress {

  #log: ZLogger | null = null;

  constructor(protected readonly _format: ZProgressFormat, readonly job: ZJob) {}

  get log(): ZLogger {
    return this.#log || (this.#log = logZBy(this._createLog()));
  }

  start(): void {
    /* no-op */
  }

  stop(): void {
    /* no-op */
  }

  protected _createLog(): ZLogRecorder {
    return logZWithDetails(
      {
        target: this.job.call.task.target.name,
        task: this.job.call.task.name,
      },
      logZAtopOf(this._format.log),
    );
  }

}
