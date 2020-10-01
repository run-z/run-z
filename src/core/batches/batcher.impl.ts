import { mapIt } from '@proc7ts/push-iterator';
import type { ZBatchPlanner } from './batch-planner';

/**
 * @internal
 */
export async function batchZTask(this: void, planner: ZBatchPlanner): Promise<void> {
  await Promise.all(mapIt(
      await planner.targets.packages(),
      target => target.task(planner.taskName).then(task => planner.batch(task)),
  ));
}
