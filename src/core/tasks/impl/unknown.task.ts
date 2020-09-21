import type { ZExecution } from '@run-z/exec-z';
import { execZNoOp, failZ } from '@run-z/exec-z';
import type { ZJob } from '../../jobs';
import { UnknownZTaskError } from '../../unknown-task-error';
import type { ZTaskBuilder$ } from '../task-builder.impl';
import { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

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
