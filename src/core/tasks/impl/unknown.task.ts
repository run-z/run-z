import { execNoopZProcess, failZProcess } from '../../../internals';
import type { ZExecutedProcess, ZTaskExecution } from '../../jobs';
import type { ZTaskBuilder$ } from '../task-builder.impl';
import { ZTaskSpec } from '../task-spec';
import { UnknownZTaskError } from '../unknown-task-error';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class UnknownZTask extends AbstractZTask<ZTaskSpec.Unknown> {

  constructor(builder: ZTaskBuilder$, spec: ZTaskSpec) {
    super(builder, { ...spec, action: ZTaskSpec.unknownAction });
  }

  protected _execTask(execution: ZTaskExecution<ZTaskSpec.Unknown>): ZExecutedProcess {
    if (execution.call.params().flag('if-present')) {
      return execNoopZProcess();
    }
    return failZProcess(new UnknownZTaskError(this.target.name, this.name));
  }

}
