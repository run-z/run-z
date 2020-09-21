import type { ZExecution } from '@run-z/exec-z';
import type { ZJob } from '../../jobs';
import { ZCall, ZTaskParams } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class ScriptZTask extends AbstractZTask<ZTaskSpec.Script> {

  protected _callParams(call: ZCall<ZTaskSpec.Script>, evaluator: ZTaskParams.Evaluator): ZTaskParams {

    const { spec: { attrs, args, action: { command } } } = this;
    const params = ZTaskParams.newMutable();

    if (command) {

      const cmdCall = call.plan.findCallOf(this.target, `cmd:${command}`);

      if (cmdCall) {
        ZTaskParams.update(params, cmdCall.params(evaluator));
      }
    }

    ZTaskParams.update(params, { attrs, args });

    return new ZTaskParams(params);
  }

  protected _execTask(job: ZJob<ZTaskSpec.Script>): ZExecution {
    return job.shell.execScript(job, this.name);
  }

}
