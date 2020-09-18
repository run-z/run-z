import { itsEmpty, makeIt, mapIt } from '@proc7ts/a-iterable';
import type { ZPackage, ZPackageSet } from '../packages';
import { ZCall, ZCallDetails, ZPrePlanner } from '../plan';
import { UnknownZTaskError, ZTask, ZTaskSpec } from '../tasks';
import type { ZBatchPlanner } from './batch-planner';
import type { ZBatcher } from './batcher';
import { batchZTask } from './batcher.impl';
import { ZBatching } from './batching';

/**
 * @internal
 */
export class NamedZBatcher {

  static default = (/*#__PURE__*/ new NamedZBatcher({}));

  static newInstance(namedBatches?: ZBatcher.NamedBatches): NamedZBatcher {
    return namedBatches ? new NamedZBatcher(namedBatches) : NamedZBatcher.default;
  }

  private readonly _only?: ReadonlySet<string>;
  private readonly _with: ReadonlySet<string>;
  private readonly _except: ReadonlySet<string>;

  private constructor({ only, with: w = [], except = [] }: ZBatcher.NamedBatches) {
    this._only = only && new Set(only);
    this._with = new Set(w);
    this._except = new Set(except);
  }

  names(target: ZPackage, taskName: string, hardLimit?: boolean): Iterable<string> {

    const batchTaskNames = new Map<string, string>();
    const softInclusions = new Set<string>();

    for (const script of target.taskNames()) {

      const slashIdx = script.lastIndexOf('/');

      if (slashIdx <= 0) {
        continue; // Not a named batch.
      }

      const batchId = script.substr(0, slashIdx);
      let batchName = batchId;
      let additionalBatch = false;

      if (batchId.startsWith('+')) {
        batchName = batchName.substr(1);
        additionalBatch = true;
      }

      if (this._except.has(batchName)) {
        continue; // The batch is explicitly excluded.
      }

      const include: -1 | 0 | 1 = (
          // Batch set is limited?
          this._only
              // Explicit match.
              ? this._only.has(batchName)
              // Match any except additional.
              : !additionalBatch
      )
          ? 1
          // Additional match?
          : (this._with.has(batchName) ? -1 : 0);

      if (include) {
        if (include > 0 && !hardLimit) {
          // Some batch matches explicitly included one.
          // Require all batches to be explicitly included.
          hardLimit = true;
          // Remove all soft inclusions.
          for (const soft of softInclusions) {
            batchTaskNames.delete(soft);
          }
        }
      } else if (additionalBatch) {
        continue; // Additional batch is not included.
      } else if (hardLimit) {
        // Require explicitly included batches.
        continue;
      } else {
        softInclusions.add(batchId);
      }

      const batchTaskName = script.substr(slashIdx + 1);

      if (batchTaskName === taskName || (batchTaskName === '*' && !batchTaskNames.has(batchName))) {
        batchTaskNames.set(batchId, script);
      }
    }

    return makeIt(() => batchTaskNames.values());
  }

  async batch(planner: ZBatchPlanner): Promise<void> {
    await this._batch(planner, new Set<ZPackage>(), true);
  }

  private async _batch(planner: ZBatchPlanner, processed: Set<ZPackage>, hardLimit?: boolean): Promise<void> {

    const { taskName } = planner;
    let recurrentTargets: ZPackageSet | undefined;

    await Promise.all(mapIt(
        await planner.targets.packages(),
        async target => {
          if (processed.has(target)) {
            return;
          }
          processed.add(target);

          const batchNames = this.names(target, taskName, hardLimit);

          if (itsEmpty(batchNames)) {
            // No matching named batches.
            // Fallback to default task batching.
            return batchZTask({ ...planner, targets: target });
          }

          return Promise.all(mapIt(
              batchNames,
              async batchName => {

                let hasTargets = false;

                await target.task(batchName).then(batchTask => batchTask.callAsPre(
                    {
                      dependent: planner.dependent,
                      batching: ZBatching.unprocessedBatching(),
                      applyTargets(targets) {
                        hasTargets = true;
                        recurrentTargets = recurrentTargets ? recurrentTargets.andPackages(targets) : targets;
                      },
                      callPre<TAction extends ZTaskSpec.Action>(
                          task: ZTask<TAction>,
                          details?: ZCallDetails<TAction>,
                      ): Promise<ZCall> {
                        return planner.dependent.call(task, details);
                      },
                      // transient: noop, /* group can not do transient calls in this case */
                    } as ZPrePlanner,
                    {
                      targets: [],
                      task: batchName,
                      annex: true,
                      parallel: false,
                      attrs: {},
                      args: [],
                    },
                    ZCallDetails.by(),
                ));

                if (!hasTargets) {
                  throw new UnknownZTaskError(
                      target.name,
                      batchName,
                      `Can not apply named batch "${batchName}" in <${target.name}>`,
                  );
                }
              },
          ));
        },
    ));

    if (recurrentTargets) {
      await this._batch({ ...planner, targets: recurrentTargets }, processed);
    }
  }

}
