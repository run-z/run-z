/* eslint-disable @typescript-eslint/no-var-requires */
import { noop } from '@proc7ts/primitives';
import * as os from 'os';
import { promisify } from 'util';
import type { ZJob } from '../../core';
import { colorSupportLevel } from './color-support-level';
import type { ZJobProgress } from './job-progress.cli';
import { ColorZJobProgress } from './job-progress.color';
import { SimpleZJobProgress } from './job-progress.simple';
import { ZRenderSchedule } from './render-schedule';

/**
 * @internal
 */
const stringWidth = require('string-width');

/**
 * @internal
 */
export class ZProgressFormat {

  targetCols = 0;
  taskCols = 0;
  numRows = 0;
  readonly schedule = new ZRenderSchedule();
  private readonly _runs: ZJobProgress[] = [];

  jobProgress(job: ZJob): ZJobProgress {
    return colorSupportLevel() ? new ColorZJobProgress(this, job) : new SimpleZJobProgress(this, job);
  }

  register(run: ZJobProgress): number {

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
      this._renderAll().catch(noop);
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

  private _renderAll(): Promise<void> {
    return this.schedule.schedule(async () => {
      for (const run of this._runs) {
        await run.render();
      }
    });
  }

}


