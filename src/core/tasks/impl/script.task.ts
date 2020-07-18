import type { ZPackage } from '../../packages';
import type { ZTaskExecution } from '../../plan/task-execution';
import { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class ScriptZTask extends AbstractZTask<ZTaskSpec.Script> {

  constructor(target: ZPackage, name: string) {
    super(target, name, ZTaskSpec.script);
  }

  exec(execution: ZTaskExecution<ZTaskSpec.Script>): Promise<void> {
    return this.target.location.shell.execScript(this.name, execution.call.params());
  }

}
