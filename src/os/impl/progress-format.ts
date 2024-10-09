import type { ZLogRecorder } from '@run-z/log-z';
import { ZJob } from '../../core/jobs/job.js';
import { ZJobProgress } from './job-progress.js';
import { ProgressZLogPrefix } from './progress-log.js';

/**
 * @internal
 */
export abstract class ZProgressFormat<TProgress extends ZJobProgress = ZJobProgress> {
  readonly prefix: ProgressZLogPrefix;
  #log: ZLogRecorder | null = null;

  constructor() {
    this.prefix = new ProgressZLogPrefix();
  }

  get log(): ZLogRecorder {
    return this.#log || (this.#log = this._createLog());
  }

  abstract jobProgress(job: ZJob): TProgress;

  protected abstract _createLog(): ZLogRecorder;
}
