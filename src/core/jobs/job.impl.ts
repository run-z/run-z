import { mapIt } from '@proc7ts/a-iterable';
import { execZAll, execZNext } from '../../internals';
import type { ZCallRecord } from '../plan/call.impl';
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZExecution } from './execution';
import type { ZJob } from './job';
import type { ZShell } from './shell';

/**
 * @internal
 */
export class ZExecutor {

  readonly jobs = new Map<ZTask, ZExecutionJob>();

  exec<TAction extends ZTaskSpec.Action>(call: ZCallRecord<TAction>, shell: ZShell): ZExecutionJob<TAction> {

    const { task } = call;
    const running = this.jobs.get(task);

    if (running) {
      return running as ZExecutionJob<TAction>;
    }

    const starting = new ZExecutionJob(this, shell, call);

    this.jobs.set(task, starting);

    return starting.start();
  }

}

/**
 * @internal
 */
export class ZExecutionJob<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> implements ZJob<TAction> {

  private _whenStarted!: Promise<void>;
  private _whenFinished!: ZExecution;
  private _whenDone!: ZExecution;

  constructor(
      private readonly _executor: ZExecutor,
      readonly shell: ZShell,
      readonly call: ZCallRecord<TAction>,
  ) {
  }

  get started(): boolean {
    return this._whenFinished != null;
  }

  whenStarted(): Promise<void> {
    return Promise.race([this._whenStarted, this.whenFinished()]);
  }

  start(): this {

    const whenPrerequisites = this._execPrerequisites();
    const whenReady = this._whenReady();

    this._whenStarted = new Promise<void>(resolve => {
      this._whenFinished = execZNext(
          whenReady,
          () => {
            resolve();
            return this.call.task.exec(this);
          },
      );
    });

    this._whenDone = execZAll([whenPrerequisites, this._whenFinished]);

    return this;
  }

  abort(): void {
    this._whenDone.abort();
  }

  private _execPrerequisites(): ZExecution {
    return execZAll(mapIt(
        this.call.prerequisites(),
        pre => pre.exec(this.shell),
    ));
  }

  private _whenReady(): ZExecution {

    const whenReady: ZExecution[] = [];

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

    return execZAll(whenReady);
  }

  whenFinished(): Promise<void> {
    return this._whenFinished.whenDone();
  }

  whenDone(): Promise<void> {
    return this._whenDone.whenDone();
  }

}
