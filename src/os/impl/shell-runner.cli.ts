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

  prefixCols = 0;
  numRows = 0;
  private readonly _runs: ZJobRun[] = [];
  private readonly _schedule: (() => Promise<void>)[] = [];

  run(job: ZJob, command: string, args: readonly string[]): ZExecution {
    return new ZJobRun(this, job).run(command, args);
  }

  async report(run: ZJobRun): Promise<void> {

    const prefixCols = stringWidth(run.prefix);

    if (this.prefixCols < prefixCols) {
      this.prefixCols = prefixCols;
      await this._renderAll();
      this._runs.push(run);
    }
  }

  async println(chunk = '', out = process.stdout): Promise<void> {
    await promisify(out.write.bind(out))(chunk + os.EOL);
    ++this.numRows;
  }

  schedule(action: () => Promise<void>): void {

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

  private async _renderAll(): Promise<void> {
    for (const run of this._runs) {
      await run.render();
    }
  }

}


