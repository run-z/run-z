import { isPresent } from '@proc7ts/primitives';
import { ZExecutor } from '../jobs/job.impl';
import type { ZPackage } from '../packages';
import type { ZSetup } from '../setup';
import type { ZTask, ZTaskQualifier, ZTaskSpec } from '../tasks';
import type { ZCall } from './call';
import type { ZCallDetails } from './call-details';
import { ZCallRecord } from './call.impl';
import type { ZPlan } from './plan';

/**
 * @internal
 */
export class ZInstructionRecords {

  rev = 0;
  readonly plan: ZPlan;
  readonly executor: ZExecutor = new ZExecutor();
  private readonly _qualifiers = new Map<ZTask, Set<ZTaskQualifier>>();
  private readonly _calls = new Map<ZTask, ZCallRecord>();
  private readonly _targetCalls = new Map<ZPackage, Map<string, ZCall>>();
  private readonly _prerequisites = new Map<ZTask, Set<ZTask>>();
  private readonly _parallel = new Map<ZTaskQualifier, Set<ZTaskQualifier>>();
  private readonly _parallelWhen = new Map<
    ZTaskQualifier,
    Set<(this: void, other: ZTask, task: ZTask) => boolean>
  >();

  constructor(readonly setup: ZSetup) {
    this.plan = {
      calls: () => this._calls.values(),
      callOf: <TAction extends ZTaskSpec.Action>(task: ZTask<TAction>): ZCall<TAction> => {
        const call = this._calls.get(task) as ZCallRecord<TAction> | undefined;

        if (!call) {
          throw new TypeError(`Task "${task.name}" from <${task.target.name}> is never called`);
        }

        return call;
      },
      findCallOf: (target: ZPackage, taskName: string): ZCall | undefined => {
        const calls = this._targetCalls.get(target);

        return calls && calls.get(taskName);
      },
    };
  }

  qualify(task: ZTask, qualifier: ZTaskQualifier): void {
    const qualifiers = this._qualifiers.get(task);

    if (qualifiers) {
      qualifiers.add(qualifier);
    } else {
      this._qualifiers.set(task, new Set<ZTaskQualifier>().add(task).add(qualifier));
    }
  }

  private _qualifiersOf(task: ZTask): readonly ZTaskQualifier[] {
    const foundQualifiers = this._qualifiers.get(task);
    const result = foundQualifiers ? [...foundQualifiers] : [task];

    for (const alike of task.alike) {
      const alikeCall = this.plan.findCallOf(task.target, alike);

      if (alikeCall) {
        result.push(alikeCall.task);
      }
    }

    return result;
  }

  async call<TAction extends ZTaskSpec.Action>(
    task: ZTask<TAction>,
    details: ZCallDetails<TAction> = {},
    by?: ZCallRecord,
  ): Promise<ZCall<TAction>> {
    ++this.rev;

    let call = this._calls.get(task) as ZCallRecord<TAction> | undefined;

    if (call) {
      call._call(details, by!); // `by` always known here
    } else {
      call = new ZCallRecord(this, by, task, details);
      this._calls.set(task, call);

      const targetCalls = this._targetCalls.get(task.target);

      if (targetCalls) {
        targetCalls.set(task.name, call);
      } else {
        this._targetCalls.set(task.target, new Map([[task.name, call]]));
      }

      await call._plan(task.callDetails(call));
    }
    await call._plan(details);

    return call;
  }

  order(first: ZTask, second: ZTask): void {
    const prerequisites = this._prerequisites.get(second);

    if (prerequisites) {
      prerequisites.add(first);
    } else {
      this._prerequisites.set(second, new Set<ZTask>().add(first));
    }
  }

  prerequisitesOf(dependent: ZTask): readonly ZCall[] {
    const prerequisites = this._prerequisites.get(dependent);

    if (!prerequisites) {
      return [];
    }

    return [...prerequisites].map(task => this._calls.get(task)).filter(isPresent);
  }

  isPrerequisiteOf(target: ZTask, toCheck: ZTask, checked: Set<ZTask>): boolean {
    if (checked.has(target)) {
      return false;
    }
    checked.add(target);

    const prerequisites = this._prerequisites.get(target);

    if (!prerequisites) {
      return false;
    }
    if (prerequisites.has(toCheck)) {
      return true;
    }
    for (const prerequisite of prerequisites) {
      if (this.isPrerequisiteOf(prerequisite, toCheck, checked)) {
        return true;
      }
    }

    return false;
  }

  makeParallel(tasks: ZTaskQualifier[]): void {
    for (let i = tasks.length - 1; i > 0; --i) {
      const first = tasks[i];
      let parallels = this._parallel.get(first);

      if (!parallels) {
        parallels = new Set();
        this._parallel.set(first, parallels);
      }

      for (let j = i - 1; j >= 0; --j) {
        parallels.add(tasks[j]);
      }
    }
  }

  makeParallelWhen(
    task: ZTaskQualifier,
    condition: (this: void, other: ZTask, task: ZTask) => boolean,
  ): void {
    const conditions = this._parallelWhen.get(task);

    if (conditions) {
      conditions.add(condition);
    } else {
      this._parallelWhen.set(task, new Set([condition]));
    }
  }

  areParallel(first: ZTask, second: ZTask): boolean {
    return this._areParallel(first, second) || this._areParallel(second, first, true);
  }

  private _areParallel(first: ZTask, second: ZTask, reverse?: boolean): boolean {
    for (const firstQ of this._qualifiersOf(first)) {
      if (!reverse) {
        const conditions = this._parallelWhen.get(firstQ);

        if (conditions) {
          for (const condition of conditions) {
            if (condition(first, second)) {
              return true;
            }
          }
        }
      }

      const parallel = this._parallel.get(firstQ);

      if (parallel) {
        for (const secondQ of this._qualifiersOf(second)) {
          if (parallel.has(secondQ)) {
            return true;
          }
        }
      }
    }

    return false;
  }

}
