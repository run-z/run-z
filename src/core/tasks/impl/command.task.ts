import type { ZTaskParams } from '../../plan';
import type { ZTaskExecution } from '../../plan/task-execution';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class CommandZTask extends AbstractZTask<ZTaskSpec.Command> {

  params(): ZTaskParams.Partial {

    const { spec: { attrs, args, action: { args: actionArgs } } } = this;

    return { attrs, args, actionArgs };
  }

  exec(execution: ZTaskExecution<ZTaskSpec.Command>): Promise<void> {
    return this.target.location.shell.execCommand(this.spec.action.command, execution.call.params());
  }

  protected isParallel(): boolean {
    return this.spec.action.parallel;
  }

}
