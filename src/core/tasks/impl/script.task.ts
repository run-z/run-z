import type { ZExecution } from '@run-z/exec-z';
import { AbstractZTask } from './abstract.task.js';
import { ZTaskSpec } from '../task-spec.js';
import { ZJob } from '../../jobs/job.js';

/**
 * @internal
 */
export class ScriptZTask extends AbstractZTask<ZTaskSpec.Script> {
  override get alike(): Iterable<string> {
    const {
      spec: {
        action: { command },
      },
    } = this;

    return command ? [`cmd:${command}`] : [];
  }

  protected _execTask(job: ZJob<ZTaskSpec.Script>): ZExecution {
    return job.shell.execScript(job, this.name);
  }
}
