import type { ZLogRecorder } from '@run-z/log-z';
import type { ZJob } from '../../core';
import type { ZJobProgress } from './job-progress';
import { ProgressZLogPrefix } from './progress-log';

/**
 * @internal
 */
export abstract class ZProgressFormat<TProgress extends ZJobProgress = ZJobProgress> {

  readonly prefix: ProgressZLogPrefix;
  private _log: ZLogRecorder | null = null;

  constructor() {
    this.prefix = new ProgressZLogPrefix();
  }

  get log(): ZLogRecorder {
    return this._log || (this._log = this._createLog());
  }

  abstract jobProgress(job: ZJob): TProgress;

  protected abstract _createLog(): ZLogRecorder;

}
