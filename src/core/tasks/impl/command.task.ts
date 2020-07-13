import { valueProvider } from '@proc7ts/primitives';
import type { ZCall, ZPlanRecorder } from '../../plan';
import type { ZTaskSpec } from '../task-spec';
import { AbstractZTask } from './abstract.task';

/**
 * @internal
 */
export class CommandZTask extends AbstractZTask<ZTaskSpec.Command> {

  protected async planCall(recorder: ZPlanRecorder): Promise<ZCall> {

    const { spec: { attrs, args, action: { args: actionArgs } } } = this;

    return recorder.call(this, valueProvider({ attrs, args, actionArgs }));
  }

}
