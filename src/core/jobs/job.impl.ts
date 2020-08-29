import { mapIt } from '@proc7ts/a-iterable';
import { noop } from '@proc7ts/primitives';
import { execZ, execZAfter, execZAll, ZExecution } from '@run-z/exec-z';
import type { ZCallRecord } from '../plan/call.impl';
import type { ZTask, ZTaskSpec } from '../tasks';
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

  private _exec!: ZExecution;
  private _execAndPre!: ZExecution;

  constructor(
      private readonly _executor: ZExecutor,
      readonly shell: ZShell,
      readonly call: ZCallRecord<TAction>,
  ) {
  }

  get started(): boolean {
    return this._exec != null;
  }

  whenStarted(): Promise<void> {
    return this._exec.whenStarted();
  }

  start(): this {

    const whenPre = this._execPre();
    const whenReady = this._whenReady();

    this._exec = execZAfter(whenReady, () => this.call.task.exec(this));
    this._execAndPre = execZAll([whenPre, this._exec], noop);

    return this;
  }

  abort(): void {
    this._execAndPre.abort();
  }

  private _execPre(): ZExecution {
    return execZAll(
        mapIt(
            this.call.prerequisites(),
            pre => pre.exec(this.shell),
        ),
        noop,
    );
  }

  private _whenReady(): ZExecution {

    const whenReady: ZExecution[] = [];

    for (const job of this._executor.jobs.values()) {
      if (job.call.task.spec.action.type === 'group') {
        // No need to wait for group as its prerequisites are handled individually.
        continue;
      }
      if (!job.started) {
        // Job is not started yet, so this one is its prerequisite.
        // Do not await for it in order to prevent infinite recursion.
        continue;
      }
      if (this.call.isParallelTo(job.call.task)) {
        // Do not await for parallel job.
        continue;
      }
      // Can not run in parallel.
      // Await for job to finish.
      // Transitive prerequisites are handled individually.
      whenReady.push(
          execZ(() => ({
            whenStarted: job.whenStarted.bind(job),
            whenDone: job.whenFinished.bind(job),
            abort: job.abort.bind(job),
          })),
      );
    }

    return execZAll(whenReady, noop);
  }

  whenFinished(): Promise<void> {
    return this._exec.whenDone();
  }

  whenDone(): Promise<void> {
    return this._execAndPre.whenDone();
  }

}
