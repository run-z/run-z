import { noop } from '@proc7ts/primitives';
import * as os from 'os';
import { promisify } from 'util';
import type { ZExecution, ZJob } from '../../core';
import { ZJobRun } from './job-run.cli';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const stringWidth = require('string-width');

/**
 * @internal
 */
export class ZShellRunner {

  targetCols = 0;
  taskCols = 0;
  numRows = 0;
  private readonly _runs: ZJobRun[] = [];
  private readonly _schedule: (() => Promise<unknown>)[] = [];

  run(job: ZJob, command: string, args: readonly string[]): ZExecution {
    return new ZJobRun(this, job).run(command, args);
  }

  register(run: ZJobRun): number {

    const task = run.job.call.task;
    const targetCols = stringWidth(task.target.name);
    const taskCols = stringWidth(task.name);
    let renderAll = false;

    if (this.targetCols < targetCols) {
      this.targetCols = targetCols;
      renderAll = true;
    }
    if (this.taskCols < taskCols) {
      this.taskCols = taskCols;
      renderAll = true;
    }

    if (renderAll) {
      this._renderAll();
    }

    const result = this.numRows;

    this._runs.push(run);

    return result;
  }

  async println(chunk = '', fd: 0 | 1 = 0): Promise<void> {

    const out = fd ? process.stderr : process.stdout;

    await promisify(out.write.bind(out))(chunk + os.EOL);

    ++this.numRows;
  }

  schedule(action: () => Promise<unknown>): void {

    const doSchedule = !this._schedule.length;

    this._schedule.push(action);

    if (doSchedule) {

      const execScheduled = async (): Promise<void> => {
        for (;;) {

          const scheduled = this._schedule.pop();

          if (!scheduled) {
            break;
          }

          await scheduled().catch(noop);
        }
      };

      execScheduled().catch(noop);
    }
  }

  private _renderAll(): void {
    this.schedule(async () => {
      for (const run of this._runs) {
        await run.render();
      }
    });
  }

}


