import type { ZTaskExecution } from '../../jobs';
import type { ZTaskParams } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class CommandZTask extends AbstractZTask<ZTaskSpec.Command> {

  exec(execution: ZTaskExecution<ZTaskSpec.Command>): Promise<void> {
    return this.target.location.shell.execCommand(this.spec.action.command, execution.call.params());
  }

  protected callParams(): ZTaskParams.Partial {

    const { spec: { attrs, args, action: { args: commandArgs } } } = this;

    return { attrs, args: [...commandArgs, ...args] };
  }

  protected isParallel(): boolean {
    return this.spec.action.parallel;
  }

}
