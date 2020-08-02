import { mapIt } from '@proc7ts/a-iterable';
import type { ZCallRecord } from '../plan/call.impl';
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZExecutedProcess } from './executed-process';
import { execAllZProcesses, execNextZProcess } from './impl';
import type { ZJob } from './job';

/**
 * @internal
 */
export class ZExecutor {

  readonly jobs = new Map<ZTask, ZExecutionJob>();

  exec<TAction extends ZTaskSpec.Action>(call: ZCallRecord<TAction>): ZExecutionJob<TAction> {

    const { task } = call;
    const running = this.jobs.get(task);

    if (running) {
      return running as ZExecutionJob<TAction>;
    }

    const starting = new ZExecutionJob(this, call);

    this.jobs.set(task, starting);

    return starting.start();
  }

}

/**
 * @internal
 */
export class ZExecutionJob<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> implements ZJob<TAction> {

  private _whenFinished!: ZExecutedProcess;
  private _whenDone!: ZExecutedProcess;

  constructor(
      private readonly _executor: ZExecutor,
      readonly call: ZCallRecord<TAction>,
  ) {
  }

  get started(): boolean {
    return this._whenFinished != null;
  }

  start(): this {

    const whenPrerequisites = this._execPrerequisites();

    this._whenFinished = execNextZProcess(
        this._whenReady(),
        () => this.call.task.exec({
          call: this.call,
        }),
    );
    this._whenDone = execAllZProcesses([whenPrerequisites, this._whenFinished]);

    return this;
  }

  abort(): void {
    this._whenDone.abort();
  }

  private _execPrerequisites(): ZExecutedProcess {
    return execAllZProcesses(mapIt(
        this.call.prerequisites(),
        pre => pre.exec(),
    ));
  }

  private _whenReady(): ZExecutedProcess {

    const whenReady: ZExecutedProcess[] = [];

    for (const job of this._executor.jobs.values()) {
      if (!job.started) {
        // Job is not started yet, so this one is its prerequisite.
        // Do not await for it in order to prevent infinite recursion.
        continue;
      }
      if (job.call.isParallelTo(this.call.task)) {
        // Do not await for parallel job.
        continue;
      }
      // Can not run in parallel.
      // Await for job to finish.
      // Transitive prerequisites are handled individually.
      whenReady.push({
        whenDone() {
          return job.whenFinished();
        },
        abort() {
          return job.abort();
        },
      });
    }

    return execAllZProcesses(whenReady);
  }

  whenFinished(): Promise<void> {
    return this._whenFinished.whenDone();
  }

  whenDone(): Promise<void> {
    return this._whenDone.whenDone();
  }

}
