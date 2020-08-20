import { ZJobProgress } from './job-progress.cli';

/**
 * @internal
 */
export class SimpleZJobProgress extends ZJobProgress {

  protected _scheduleRender(): void {
    this._pending = this._format.schedule.schedule(async () => {
      await this._printAll();
      this._output.clear();
    });
  }

}
