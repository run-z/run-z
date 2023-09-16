import { noop } from '@proc7ts/primitives';
import { execZ, execZAfter, execZAll, execZNoOp, ZExecution } from '@run-z/exec-z';
import { ZCallRecord } from '../plan/call.impl.js';
import { ZTaskParams } from '../plan/task-params.js';
import { ZTaskSpec } from '../tasks/task-spec.js';
import { ZTask } from '../tasks/task.js';
import { ZJob } from './job.js';
import { ZShell } from './shell.js';

/**
 * @internal
 */
export class ZExecutor {

  readonly jobs = new Map<ZTask, ZExecutionJob>();
  readonly evaluator = ZCallRecord.newEvaluator();

  exec<TAction extends ZTaskSpec.Action>(
    call: ZCallRecord<TAction>,
    shell: ZShell,
  ): ZExecutionJob<TAction> {
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
export class ZExecutionJob<TAction extends ZTaskSpec.Action = ZTaskSpec.Action>
  implements ZJob<TAction> {

  readonly #executor: ZExecutor;
  #params?: ZTaskParams | undefined;
  #exec!: ZExecution;
  #execAndPre!: ZExecution;

  constructor(executor: ZExecutor, readonly shell: ZShell, readonly call: ZCallRecord<TAction>) {
    this.#executor = executor;
  }

  get params(): ZTaskParams {
    return this.#params || (this.#params = this.call.params(this.#executor.evaluator));
  }

  get started(): boolean {
    return this.#exec != null;
  }

  whenStarted(): Promise<void> {
    return this.#exec.whenStarted();
  }

  start(): this {
    if (this.params.flag('skip')) {
      this.#exec = this.#execAndPre = execZNoOp();

      return this;
    }

    const whenPre = this.#execPre();
    const whenReady = this.#whenReady();

    this.#exec = execZAfter(whenReady, () => this.call.task.exec(this));
    this.#execAndPre = execZAll([whenPre, this.#exec], noop);

    return this;
  }

  abort(): void {
    this.#execAndPre.abort();
  }

  #execPre(): ZExecution {
    return execZAll(
      this.call.prerequisites().map(pre => pre.exec(this.shell)),
      noop,
    );
  }

  #whenReady(): ZExecution {
    const whenReady: ZExecution[] = [];

    for (const job of this.#executor.jobs.values()) {
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
    return this.#exec.whenDone();
  }

  whenDone(): Promise<void> {
    return this.#execAndPre.whenDone();
  }

}
