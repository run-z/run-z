import type { ZTaskParams } from '../../plan';
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

  protected isParallel(): boolean {
    return this.spec.action.parallel;
  }

}
