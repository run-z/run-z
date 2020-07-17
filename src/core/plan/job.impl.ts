import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCallRecord } from './call.impl';
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

  private _whenFinished!: Promise<void>;
  private _whenDone!: Promise<void>;

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

    this._whenFinished = this._whenReady().then(async () => {
      await this.call.task.exec({
        call: this.call,
      });
    });
    this._whenDone = Promise.all([whenPrerequisites, this._whenFinished]) as Promise<any>;

    return this;
  }

  private _execPrerequisites(): Promise<unknown> {

    const whenDone: Promise<void>[] = [];

    for (const pre of this.call.prerequisites()) {
      whenDone.push(pre.exec().whenDone());
    }

    return Promise.all(whenDone);
  }

  private _whenReady(): Promise<unknown> {

    const whenReady: Promise<void>[] = [];

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
      whenReady.push(job.whenFinished());
    }

    return Promise.all(whenReady);
  }

  whenFinished(): Promise<void> {
    return this._whenFinished;
  }

  whenDone(): Promise<void> {
    return this._whenDone;
  }

}
