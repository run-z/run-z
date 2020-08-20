/* eslint-disable @typescript-eslint/no-var-requires */
import * as os from 'os';
import type { ZJob } from '../../core';
import type { ZJobProgress } from './job-progress';
import { ZRenderSchedule } from './render-schedule';
import { write2stderr, write2stdout } from './writer-for';

/**
 * @internal
 */
const stringWidth = require('string-width');

/**
 * @internal
 */
export abstract class ZProgressFormat<TProgress extends ZJobProgress = ZJobProgress> {

  targetCols = 0;
  taskCols = 0;
  numRows = 0;
  readonly schedule = new ZRenderSchedule();

  abstract jobProgress(job: ZJob): TProgress;

  register(jobProgress: TProgress): number {

    const task = jobProgress.job.call.task;
    const targetCols = stringWidth(task.target.name);
    const taskCols = stringWidth(task.name);

    if (this.targetCols < targetCols) {
      this.targetCols = targetCols;
    }
    if (this.taskCols < taskCols) {
      this.taskCols = taskCols;
    }

    return this.numRows;
  }

  async println(chunk: string, fd: 0 | 1 = 0): Promise<void> {
    await (fd ? write2stderr : write2stdout)(chunk + os.EOL);
    ++this.numRows;
  }

}
