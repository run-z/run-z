import type { ZPackage } from '../../packages';
import type { ZTaskExecution } from '../../plan/task-execution';
import { ZTaskSpec } from '../task-spec';
import { UnknownZTaskError } from '../unknown-task-error';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class UnknownZTask extends AbstractZTask<ZTaskSpec.Unknown> {

  constructor(target: ZPackage, name: string) {
    super(target, name, ZTaskSpec.unknown);
  }

  exec(execution: ZTaskExecution<ZTaskSpec.Unknown>): void | PromiseLike<unknown> {
    if (!execution.call.params().flag('if-present')) {
      return Promise.reject(new UnknownZTaskError(this.target.name, this.name));
    }
  }

}
