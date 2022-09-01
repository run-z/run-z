import { beforeEach, describe, expect, it } from '@jest/globals';
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
      const evaluator = ZTaskParams.newEvaluator();

      expect(call.params(evaluator)).toBe(call.params(evaluator));
    });
  });

  function plan(params: ZTaskParams.Partial = {}): Promise<ZCall> {
    return task.call({ params: valueProvider(params) });
  }
});
