import type { ZJob } from '../../core';
import { ZJobProgress } from './job-progress';
import { ZProgressFormat } from './progress-format';

/**
 * @internal
 */
export class TextZProgressFormat extends ZProgressFormat {

  jobProgress(job: ZJob): ZJobProgress {
    return new TextZJobProgress(this, job);
  }

}

/**
 * @internal
 */
class TextZJobProgress extends ZJobProgress {

  protected _scheduleRender(): void {
    this._pending = this._format.schedule.schedule(async () => {
      await this._printAll();
      this._output.clear();
    });
  }

}
