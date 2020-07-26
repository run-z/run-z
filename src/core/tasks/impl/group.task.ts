import { flatMapIt, mapIt } from '@proc7ts/a-iterable';
import type { ZPackageSet } from '../../packages';
import type { ZCall, ZCallPlanner } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class GroupZTask extends AbstractZTask<ZTaskSpec.Group> {

  async asPre(
      planner: ZCallPlanner,
      ref: ZTaskSpec.TaskRef,
  ): Promise<Iterable<ZCall>> {

    const [subTaskName, ...subArgs] = ref.args;

    if (!subTaskName || planner.setup.taskParser.isOption(subTaskName)) {
      return super.asPre(planner, ref);
    }

    // There is a sub-task(s) to execute.
    // Call prerequisite. Pass call parameters to sub-task(s) rather then to this prerequisite.
    await planner.call({
      task: this,
      params: () => planner.plannedCall.params(),
    });

    // Delegate to sub-task(s).
    const subTaskRef: ZTaskSpec.TaskRef = { ...ref, args: subArgs };
    const subCalls: Iterable<Promise<Iterable<ZCall>>> = mapIt(
        await this._subTaskTargets().packages(),
        async target => {

          const subTask = await target.task(subTaskName);

          planner.order(this, subTask);

          return subTask.asPre(planner, subTaskRef);
        },
    );

    return flatMapIt(await Promise.all(subCalls));
  }

  exec(): void {
    // Grouping task does nothing
  }

  private _subTaskTargets(): ZPackageSet {

    const { target, spec: { pre } } = this;
    let result: ZPackageSet | undefined;

    for (let i = pre.length - 1; i >= 0; --i) {

      const dep = pre[i];

      if (dep.selector) {

        const selected = target.select(dep.selector);

        result = result ? selected.andPackages(result) : selected;
      } else if (result) {
        break;
      }
    }

    return result || target;
  }

}
