/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskSpec } from '../tasks';
import type { ZExecutedProcess } from './executed-process';
import type { ZTaskExecution } from './task-execution';

/**
 * Custom task executor signature.
 *
 * @typeparam TAction  Task action type.
 */
export type ZTaskExecutor<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> =
/**
 * @param execution  Task execution context.
 *
 * @returns Executed task instance.
 */
    (this: void, execution: ZTaskExecution<TAction>) => ZExecutedProcess;
