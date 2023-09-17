import type { ZExecution } from '@run-z/exec-z';
import { ZTaskSpec } from '../tasks/task-spec.js';
import { ZJob } from './job.js';

/**
 * Custom task executor signature.
 *
 * @typeParam TAction  Task action type.
 * @param job - Task execution job.
 *
 * @returns Task execution instance.
 */
export type ZTaskExecutor<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> = (
  this: void,
  job: ZJob<TAction>,
) => ZExecution;
