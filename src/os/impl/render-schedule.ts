import { noop } from '@proc7ts/primitives';

/**
 * @internal
 */
export class ZRenderSchedule {

  private readonly _scheduled: (() => Promise<unknown>)[] = [];
  private _running?: Promise<void>;

  schedule(render: () => Promise<unknown>): Promise<void> {
    this._scheduled.push(render);

    if (!this._running) {

      const execScheduled = async (): Promise<void> => {
        for (;;) {

          const scheduled = this._scheduled.pop();

          if (!scheduled) {
            break;
          }

          await scheduled().catch(noop);
        }

        this._running = undefined;
      };

      this._running = execScheduled();
    }

    return this._running;
  }

}
