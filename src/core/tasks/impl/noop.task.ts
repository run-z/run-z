import { valueProvider } from '@proc7ts/primitives';
import type { ZPackageSet } from '../../packages';
import type { ZCall, ZInstruction, ZPlanRecorder } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class NoOpZTask extends AbstractZTask<ZTaskSpec.NoOp> {

  get acceptsSubTasks(): true {
    return true;
  }

  asDepOf(call: ZCall, dep: ZTaskSpec.TaskRef): ZInstruction {

    const { attrs, args } = dep;
    const [subTaskName, ...subArgs] = args;

    if (subTaskName && !subTaskName.startsWith('-')) {
      // There is a sub-task to execute

      const subTaskParams = call.extendParams({ attrs, args: subArgs });

      return async recorder => {
        for await (const target of this._subTaskTargets().packages()) {

          const subTask = target.task(subTaskName);

          await recorder.call(subTask, subTaskParams);
        }
      };
    }

    return super.asDepOf(call, dep);
  }

  protected async planCall(recorder: ZPlanRecorder): Promise<ZCall> {

    const { spec: { attrs } } = this;

    return recorder.call(this, valueProvider({ attrs }));
  }

  private _subTaskTargets(): ZPackageSet {

    const { target, spec: { args } } = this;
    const parser = target.setup.taskParser;
    let result: ZPackageSet | undefined;

    for (let i = args.length - 1; i >= 0; --i) {

      const arg = args[i];

      if (parser.isPackageSelector(arg)) {

        const selected = target.select(arg);

        result = result ? result.andPackages(selected) : selected;
      } else if (result) {
        break;
      }
    }

    return result || target;
  }

}
