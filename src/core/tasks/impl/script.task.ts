import type { ZExecution } from '@run-z/exec-z';
import type { ZJob } from '../../jobs';
import type { ZTaskParams } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class ScriptZTask extends AbstractZTask<ZTaskSpec.Script> {

  protected _execTask(job: ZJob<ZTaskSpec.Script>, params: ZTaskParams): ZExecution {
    return job.shell.execScript(job, this.name, params);
  }

}
