/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskSpec } from '../tasks';
import type { ZExecutedProcess } from './executed-process';
import type { ZJob } from './job';

/**
 * Custom task executor signature.
 *
 * @typeparam TAction  Task action type.
 */
export type ZTaskExecutor<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> =
/**
 * @param job  Task execution job.
 *
 * @returns Task execution instance.
 */
    (this: void, job: ZJob<TAction>) => ZExecutedProcess;
