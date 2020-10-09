import type { ZBatchPlanner } from './batch-planner';

/**
 * @internal
 */
export async function batchZTask(this: void, planner: ZBatchPlanner): Promise<void> {
  await Promise.all(
      (await planner.targets.packages()).map(
          target => target.task(planner.taskName).then(task => planner.batch(task)),
      ),
  );
}
