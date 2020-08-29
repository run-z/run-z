import { valueProvider } from '@proc7ts/primitives';
import { ZPackageTree } from '../packages';
import { ZSetup } from '../setup';
import type { ZTask } from '../tasks';
import type { ZCall } from './call';
import { ZTaskParams } from './task-params';

describe('ZCall', () => {

  let setup: ZSetup;
  let initParams: ZTaskParams.Values;
  let task: ZTask;

  beforeEach(async () => {
    setup = new ZSetup();

    const tree = new ZPackageTree('root', { packageJson: { name: 'root' } });

    initParams = {
      attrs: { attr1: ['attr1-val'] },
      args: ['arg1'],
    };

    task = setup.taskFactory
        .newTask(await setup.packageResolver.get(tree), 'test')
        .addAttrs(initParams.attrs)
        .addArg(...initParams.args)
        .setAction({
          type: 'command',
          command: 'test-command',
          parallel: false,
          args: ['cmd-arg1'],
        })
        .task();
  });

  describe('call', () => {
    it('appends attribute values', async () => {

      const call = await plan({ attrs: { attr1: ['attr1-val2'] } });

      expect(call.params(ZTaskParams.newEvaluator())).toEqual({
        args: ['cmd-arg1', 'arg1'],
        attrs: { ...initParams.attrs, attr1: ['attr1-val', 'attr1-val2'] },
      });
    });
    it('adds attribute', async () => {

      const call = await plan({ attrs: { attr2: ['attr2-val'] } });

      expect(call.params(ZTaskParams.newEvaluator())).toEqual({
        args: ['cmd-arg1', 'arg1'],
        attrs: { ...initParams.attrs, attr2: ['attr2-val'] },
      });
    });
    it('appends args', async () => {

      const call = await plan({ args: ['arg2'] });

      expect(call.params(ZTaskParams.newEvaluator())).toEqual({
        ...initParams,
        args: ['cmd-arg1', 'arg1', 'arg2'],
      });
    });
  });

  describe('params', () => {
    it('cached', async () => {

      const call = await plan({ attrs: { attr1: ['attr1-val2'] } });

      expect(call.params(ZTaskParams.newEvaluator())).toBe(call.params(ZTaskParams.newEvaluator()));
    });
    it('recalculated after plan modification', async () => {

      let call1!: ZCall;
      let params1!: ZTaskParams;
      let call2!: ZCall;
      let params2!: ZTaskParams;
      const call = await task.call({
        params: valueProvider({ attrs: { attr1: ['attr1-val2'] } }),
        async plan(planner) {
          call1 = planner.plannedCall;
          params1 = call1.params(ZTaskParams.newEvaluator());
          call2 = await planner.call(task, { params: valueProvider({ attrs: { attr2: ['attr2-val2'] } }) });
          params2 = call1.params(ZTaskParams.newEvaluator());
        },
      });

      expect(call1).toBe(call);
      expect(call2).toBe(call);
      expect(params1).not.toBe(params2);
      expect(params2).toBe(call.params(ZTaskParams.newEvaluator()));
    });
  });

  describe('extendAttrs', () => {
    it('extends params', async () => {

      const call = await plan();

      expect(call.extendAttrs({
        attrs: { attr1: ['attr1-val2'] },
        args: ['arg2'],
      })(ZTaskParams.newEvaluator())).toEqual({
        ...initParams,
        attrs: { ...initParams.attrs, attr1: ['attr1-val', 'attr1-val2'] },
        args: ['arg2'],
      });
    });
  });

  function plan(params: ZTaskParams.Partial = {}): Promise<ZCall> {
    return task.call({ params: valueProvider(params) });
  }
});
