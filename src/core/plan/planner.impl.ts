import { isPresent } from '@proc7ts/primitives';
import { ZExecutor } from '../jobs/job.impl.js';
import { ZPackage } from '../packages/package.js';
import { ZSetup } from '../setup.js';
import { ZTaskSpec } from '../tasks/task-spec.js';
import { ZTask, ZTaskQualifier } from '../tasks/task.js';
import { ZCallDetails } from './call-details.js';
import { ZCallRecord } from './call.impl.js';
import { ZCall } from './call.js';
import { ZPlan } from './plan.js';

/**
 * @internal
 */
export class ZInstructionRecords {

  rev = 0;
  readonly plan: ZPlan;
  readonly executor: ZExecutor = new ZExecutor();
  readonly #qualifiers = new Map<ZTask, Set<ZTaskQualifier>>();
  readonly #calls = new Map<ZTask, ZCallRecord>();
  readonly #targetCalls = new Map<ZPackage, Map<string, ZCall>>();
  readonly #prerequisites = new Map<ZTask, Set<ZTask>>();
  readonly #parallel = new Map<ZTaskQualifier, Set<ZTaskQualifier>>();
  readonly #parallelWhen = new Map<
    ZTaskQualifier,
    Set<(this: void, other: ZTask, task: ZTask) => boolean>
  >();

  constructor(readonly setup: ZSetup) {
    this.plan = {
      calls: () => this.#calls.values(),
      callOf: <TAction extends ZTaskSpec.Action>(task: ZTask<TAction>): ZCall<TAction> => {
        const call = this.#calls.get(task) as ZCallRecord<TAction> | undefined;

        if (!call) {
          throw new TypeError(`Task "${task.name}" from <${task.target.name}> is never called`);
        }

        return call;
      },
      findCallOf: (target: ZPackage, taskName: string): ZCall | undefined => {
        const calls = this.#targetCalls.get(target);

        return calls && calls.get(taskName);
      },
    };
  }

  qualify(task: ZTask, qualifier: ZTaskQualifier): void {
    const qualifiers = this.#qualifiers.get(task);

    if (qualifiers) {
      qualifiers.add(qualifier);
    } else {
      this.#qualifiers.set(task, new Set<ZTaskQualifier>().add(task).add(qualifier));
    }
  }

  #qualifiersOf(task: ZTask): readonly ZTaskQualifier[] {
    const foundQualifiers = this.#qualifiers.get(task);
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

    let call = this.#calls.get(task) as ZCallRecord<TAction> | undefined;

    if (call) {
      call._call(details, by!); // `by` always known here
    } else {
      call = new ZCallRecord(this, by, task, details);
      this.#calls.set(task, call);

      const targetCalls = this.#targetCalls.get(task.target);

      if (targetCalls) {
        targetCalls.set(task.name, call);
      } else {
        this.#targetCalls.set(task.target, new Map([[task.name, call]]));
      }

      await call._plan(task.callDetails(call));
    }
    await call._plan(details);

    return call;
  }

  order(first: ZTask, second: ZTask): void {
    const prerequisites = this.#prerequisites.get(second);

    if (prerequisites) {
      prerequisites.add(first);
    } else {
      this.#prerequisites.set(second, new Set<ZTask>().add(first));
    }
  }

  prerequisitesOf(dependent: ZTask): readonly ZCall[] {
    const prerequisites = this.#prerequisites.get(dependent);

    if (!prerequisites) {
      return [];
    }

    return [...prerequisites].map(task => this.#calls.get(task)).filter(isPresent);
  }

  isPrerequisiteOf(target: ZTask, toCheck: ZTask, checked: Set<ZTask>): boolean {
    if (checked.has(target)) {
      return false;
    }
    checked.add(target);

    const prerequisites = this.#prerequisites.get(target);

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
      let parallels = this.#parallel.get(first);

      if (!parallels) {
        parallels = new Set();
        this.#parallel.set(first, parallels);
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
    const conditions = this.#parallelWhen.get(task);

    if (conditions) {
      conditions.add(condition);
    } else {
      this.#parallelWhen.set(task, new Set([condition]));
    }
  }

  areParallel(first: ZTask, second: ZTask): boolean {
    return this.#areParallel(first, second) || this.#areParallel(second, first, true);
  }

  #areParallel(first: ZTask, second: ZTask, reverse?: boolean): boolean {
    for (const firstQ of this.#qualifiersOf(first)) {
      if (!reverse) {
        const conditions = this.#parallelWhen.get(firstQ);

        if (conditions) {
          for (const condition of conditions) {
            if (condition(first, second)) {
              return true;
            }
          }
        }
      }

      const parallel = this.#parallel.get(firstQ);

      if (parallel) {
        for (const secondQ of this.#qualifiersOf(second)) {
          if (parallel.has(secondQ)) {
            return true;
          }
        }
      }
    }

    return false;
  }

}
