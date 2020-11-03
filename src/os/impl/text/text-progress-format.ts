import type { ZLogRecorder } from '@run-z/log-z';
import type { ZJob } from '../../../core';
import { ZJobProgress } from '../job-progress';
import { ZProgressFormat } from '../progress-format';
import { ProgressZLogRecorder } from '../progress-log';
import { textProgressZLogFormatter } from './text-log-format';

/**
 * @internal
 */
export class TextZProgressFormat extends ZProgressFormat {

  jobProgress(job: ZJob): ZJobProgress {
    return new TextZJobProgress(this, job);
  }

  protected _createLog(): ZLogRecorder {
    return ProgressZLogRecorder.create(
        {
          prefix: this.prefix,
          format: textProgressZLogFormatter(this.prefix),
          eol: '',
        },
    );
  }

}

/**
 * @internal
 */
class TextZJobProgress extends ZJobProgress {
}


