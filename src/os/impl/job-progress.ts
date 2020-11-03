import { logZAtopOf, logZBy, logZWithDetails, ZLogger, ZLogRecorder } from '@run-z/log-z';
import type { ZJob } from '../../core';
import type { ZProgressFormat } from './progress-format';

/**
 * @internal
 */
export abstract class ZJobProgress {

  private _log: ZLogger | null = null;

  constructor(protected readonly _format: ZProgressFormat, readonly job: ZJob) {
  }

  get log(): ZLogger {
    return this._log || (this._log = logZBy(this._createLog()));
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
