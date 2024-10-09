import type { ZLogRecorder } from '@run-z/log-z';
import { ZJob } from '../../../core/jobs/job.js';
import { ZJobProgress } from '../job-progress.js';
import { ZProgressFormat } from '../progress-format.js';
import { ProgressZLogRecorder } from '../progress-log.js';
import { textProgressZLogFormatter } from './text-log-format.js';

/**
 * @internal
 */
export class TextZProgressFormat extends ZProgressFormat {
  jobProgress(job: ZJob): ZJobProgress {
    return new TextZJobProgress(this, job);
  }

  protected _createLog(): ZLogRecorder {
    return ProgressZLogRecorder.create({
      prefix: this.prefix,
      format: textProgressZLogFormatter(this.prefix),
      eol: '',
    });
  }
}

/**
 * @internal
 */
class TextZJobProgress extends ZJobProgress {}
