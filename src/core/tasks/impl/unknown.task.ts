import { execZNoop, failZ } from '../../../internals';
import type { ZExecution, ZJob } from '../../jobs';
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

  protected _execTask(job: ZJob<ZTaskSpec.Unknown>): ZExecution {
    if (job.call.params().flag('if-present')) {
      return execZNoop();
    }
    return failZ(new UnknownZTaskError(this.target.name, this.name));
  }

}
