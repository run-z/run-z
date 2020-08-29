import type { ZExecution } from '@run-z/exec-z';
import type { ZJob } from '../../jobs';
import { ZTaskParams } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class CommandZTask extends AbstractZTask<ZTaskSpec.Command> {

  protected _callParams(): ZTaskParams {

    const { spec: { attrs, args, action: { args: commandArgs } } } = this;

    return new ZTaskParams({ attrs, args: [...commandArgs, ...args] });
  }

  protected _isParallel(): boolean {
    return this.spec.action.parallel;
  }

  protected _execTask(job: ZJob<ZTaskSpec.Command>): ZExecution {
    return job.shell.execCommand(job, this.spec.action.command);
  }

}
