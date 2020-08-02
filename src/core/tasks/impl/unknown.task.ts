import type { ZExecutedProcess, ZTaskExecution } from '../../jobs';
import { failZProcess, noopZExecutedProcess } from '../../jobs/impl';
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

  exec(execution: ZTaskExecution<ZTaskSpec.Unknown>): ZExecutedProcess {
    if (execution.call.params().flag('if-present')) {
      return noopZExecutedProcess;
    }
    return failZProcess(new UnknownZTaskError(this.target.name, this.name));
  }

}
