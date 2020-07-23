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

    const { attrs, args } = ref;
    const [subTaskName, ...subArgs] = args;

    if (!subTaskName || subTaskName.startsWith('-')) {
      return super.asPre(planner, ref);
    }

    // There is a sub-task(s) to execute.
    // Call prerequisite. Pass call parameters to sub-task(s) rather then to this prerequisite.
    await planner.call({
      task: this,
      params: () => planner.plannedCall.params(),
    });

    // Delegate to sub-task(s).
    const subTaskParams = planner.plannedCall.extendParams({ attrs, args: subArgs });
    const subCalls: Promise<ZCall>[] = [];

    for await (const target of this._subTaskTargets().packages()) {

      const subTask = target.task(subTaskName);

      subCalls.push(planner.call({
        task: subTask,
        params: subTaskParams,
      }));
      planner.order(this, subTask);
    }

    return Promise.all(subCalls);
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
