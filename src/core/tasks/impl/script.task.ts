import type { ZExecutedProcess, ZTaskExecution } from '../../jobs';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class ScriptZTask extends AbstractZTask<ZTaskSpec.Script> {

  protected _execTask({ shell, job }: ZTaskExecution<ZTaskSpec.Script>): ZExecutedProcess {
    return shell.execScript(job, this.name, job.call.params());
  }

}
