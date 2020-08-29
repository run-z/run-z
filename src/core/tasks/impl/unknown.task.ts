import type { ZExecution } from '@run-z/exec-z';
import { execZNoOp, failZ } from '@run-z/exec-z';
import type { ZJob } from '../../jobs';
import type { ZTaskParams } from '../../plan';
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

  protected _execTask(_job: ZJob<ZTaskSpec.Unknown>, params: ZTaskParams): ZExecution {
    if (params.flag('if-present')) {
      return execZNoOp();
    }
    return failZ(new UnknownZTaskError(this.target.name, this.name));
  }

}
