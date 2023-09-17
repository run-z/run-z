import type { ZExecution } from '@run-z/exec-z';
import { ZJob } from '../../jobs/job.js';
import { ZTaskParams } from '../../plan/task-params.js';
import { ZTaskSpec } from '../task-spec.js';
import { AbstractZTask } from './abstract.task.js';

/**
 * @internal
 */
export class CommandZTask extends AbstractZTask<ZTaskSpec.Command> {

  override get alike(): Iterable<string> {
    const {
      spec: {
        action: { command },
      },
    } = this;

    return [`cmd:${command}`];
  }

  protected override _callParams(): ZTaskParams.Partial {
    const {
      spec: {
        attrs,
        args,
        action: { args: commandArgs },
      },
    } = this;

    return { attrs, args: [...commandArgs, ...args] };
  }

  protected override _isParallel(): boolean {
    return this.spec.action.parallel;
  }

  protected _execTask(job: ZJob<ZTaskSpec.Command>): ZExecution {
    return job.shell.execCommand(job, this.spec.action.command);
  }

}
