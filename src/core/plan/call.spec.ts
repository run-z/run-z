import { valueProvider } from '@proc7ts/primitives';
import { ZPackageTree } from '../packages';
import { ZSetup } from '../setup';
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCall } from './call';
import type { ZTaskParams } from './task-params';

describe('ZCall', () => {

  let setup: ZSetup;
  let initParams: ZTaskParams;
  let task: ZTask;

  beforeEach(async () => {
    setup = new ZSetup();

    const tree = new ZPackageTree('root', { name: 'root' });
    initParams = {
      attrs: { attr1: ['attr1-val'] },
      args: ['arg1'],
      actionArgs: ['cmd-arg1'],
    };
    const spec: ZTaskSpec = {
      deps: [],
      attrs: initParams.attrs,
      args: initParams.args,
      action: {
        type: 'command',
        command: 'test-command',
        parallel: false,
        args: initParams.actionArgs,
      },
    };

    task = setup.taskFactory.createTask(await setup.packageResolver.get(tree), 'test', spec);
  });

  describe('call', () => {
    it('appends attribute values', async () => {

      const call = await makeCall({ attrs: { attr1: ['attr1-val2'] } });

      expect(call.params()).toEqual({
        ...initParams,
        attrs: { ...initParams.attrs, attr1: ['attr1-val', 'attr1-val2'] },
      });
    });
    it('adds attribute', async () => {

      const call = await makeCall({ attrs: { attr2: ['attr2-val'] } });

      expect(call.params()).toEqual({
        ...initParams,
        attrs: { ...initParams.attrs, attr2: ['attr2-val'] },
      });
    });
    it('appends args', async () => {

      const call = await makeCall({ args: ['arg2'] });

      expect(call.params()).toEqual({
        ...initParams,
        args: [...initParams.args, 'arg2'],
      });
    });
    it('appends action args', async () => {

      const call = await makeCall({ actionArgs: ['cmd-arg2'] });

      expect(call.params()).toEqual({
        ...initParams,
        actionArgs: [...initParams.actionArgs, 'cmd-arg2'],
      });
    });
  });

  describe('extendParams', () => {
    it('extends params', async () => {

      const call = await makeCall();

      expect(call.extendParams({
        attrs: { attr1: ['attr1-val2'] },
        args: ['arg2'],
        actionArgs: ['cmd-arg2'],
      })()).toEqual({
        ...initParams,
        attrs: { ...initParams.attrs, attr1: ['attr1-val', 'attr1-val2'] },
        args: [...initParams.args, 'arg2'],
        actionArgs: [...initParams.actionArgs, 'cmd-arg2'],
      });
    });
  });

  async function makeCall(params: Partial<ZTaskParams> = {}): Promise<ZCall> {

    const plan = await setup.planner.plan(async recorder => {
      await recorder.follow(async recorder => {
        await recorder.call(task, valueProvider(params));
      });
    });

    return plan.callOf(task)!;
  }
});
