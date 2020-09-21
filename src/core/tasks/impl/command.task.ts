import type { ZExecution } from '@run-z/exec-z';
import type { ZJob } from '../../jobs';
import { ZCall, ZTaskParams } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class CommandZTask extends AbstractZTask<ZTaskSpec.Command> {

  protected _callParams(call: ZCall<ZTaskSpec.Command>, evaluator: ZTaskParams.Evaluator): ZTaskParams {

    const { spec: { attrs, args, action: { command, args: commandArgs } } } = this;
    const params = ZTaskParams.newMutable();

    const cmdCall = call.plan.findCallOf(this.target, `cmd:${command}`);

    if (cmdCall) {
      ZTaskParams.update(params, cmdCall.params(evaluator));
    }

    ZTaskParams.update(params, { attrs, args: [...commandArgs, ...args] });

    return new ZTaskParams(params);
  }

  protected _isParallel(): boolean {
    return this.spec.action.parallel;
  }

  protected _execTask(job: ZJob<ZTaskSpec.Command>): ZExecution {
    return job.shell.execCommand(job, this.spec.action.command);
  }

}
