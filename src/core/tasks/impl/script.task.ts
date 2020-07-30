import type { ZTaskExecution } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class ScriptZTask extends AbstractZTask<ZTaskSpec.Script> {

  exec(execution: ZTaskExecution<ZTaskSpec.Script>): Promise<void> {
    return this.target.location.shell.execScript(this.name, execution.call.params());
  }

}
