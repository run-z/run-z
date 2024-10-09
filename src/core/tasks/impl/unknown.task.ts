import type { ZExecution } from '@run-z/exec-z';
import { execZNoOp, failZ } from '@run-z/exec-z';
import { ZJob } from '../../jobs/job.js';
import { UnknownZTaskError } from '../../unknown-task-error.js';
import { ZTaskBuilder$ } from '../task-builder.impl.js';
import { ZTaskSpec } from '../task-spec.js';
import { AbstractZTask } from './abstract.task.js';

/**
 * @internal
 */
export class UnknownZTask extends AbstractZTask<ZTaskSpec.Unknown> {
  constructor(builder: ZTaskBuilder$, spec: ZTaskSpec) {
    super(builder, { ...spec, action: ZTaskSpec.unknownAction });
  }

  protected _execTask({ params }: ZJob<ZTaskSpec.Unknown>): ZExecution {
    if (params.flag('if-present')) {
      return execZNoOp();
    }

    return failZ(new UnknownZTaskError(this.target.name, this.name));
  }
}
