import { valueProvider } from '@proc7ts/primitives';
import { ZPackageTree } from '../packages';
import { ZSetup } from '../setup';
import type { ZTask, ZTaskSpec } from '../tasks';
import { ZCall } from './call';
import type { ZTaskParams } from './task-params';

describe('ZCall', () => {

  let task: ZTask;

  beforeEach(async () => {

    const setup = new ZSetup();
    const tree = new ZPackageTree('root', { name: 'root' });
    const spec: ZTaskSpec = {
      deps: [],
      attrs: {},
      args: [],
      action: {
        type: 'command',
        command: 'test-command',
        parallel: false,
        args: [],
      },
    };

    task = setup.taskFactory.createTask(await setup.packageResolver.get(tree), 'test', spec);
  });

  let params: ZTaskParams;
  let call: ZCall;

  beforeEach(() => {
    params = {
      attrs: { attr1: ['attr1-val'] },
      args: ['arg1'],
      actionArgs: ['cmd-arg1'],
    };
    call = new ZCall(task, valueProvider(params), () => 1);
  });

  describe('params', () => {
    it('appends attribute values', () => {
      expect(call.refine(valueProvider({ attrs: { attr1: ['attr1-val2'] } }), valueProvider(0))).toBe(call);
      expect(call.params()).toEqual({
        ...params,
        attrs: { ...params.attrs, attr1: ['attr1-val', 'attr1-val2'] },
      });
    });
    it('prepends attribute values', () => {
      expect(call.refine(valueProvider({ attrs: { attr1: ['attr1-val2'] } }), valueProvider(2))).toBe(call);
      expect(call.params()).toEqual({
        ...params,
        attrs: { ...params.attrs, attr1: ['attr1-val2', 'attr1-val'] },
      });
    });
    it('adds attributes', () => {
      expect(call.refine(valueProvider({ attrs: { attr2: ['attr2-val'] } }), valueProvider(2))).toBe(call);
      expect(call.params()).toEqual({
        ...params,
        attrs: { ...params.attrs, attr2: ['attr2-val'] },
      });
    });
    it('appends args', () => {
      expect(call.refine(valueProvider({ args: ['arg2'] }), valueProvider(0))).toBe(call);
      expect(call.params()).toEqual({
        ...params,
        args: [...params.args, 'arg2'],
      });
    });
    it('prepends args', () => {
      expect(call.refine(valueProvider({ args: ['arg2'] }), valueProvider(2))).toBe(call);
      expect(call.params()).toEqual({
        ...params,
        args: ['arg2', ...params.args],
      });
    });
    it('appends action args', () => {
      expect(call.refine(valueProvider({ actionArgs: ['cmd-arg2'] }), valueProvider(0))).toBe(call);
      expect(call.params()).toEqual({
        ...params,
        actionArgs: [...params.actionArgs, 'cmd-arg2'],
      });
    });
    it('prepends action args', () => {
      expect(call.refine(valueProvider({ actionArgs: ['cmd-arg2'] }), valueProvider(2))).toBe(call);
      expect(call.params()).toEqual({
        ...params,
        actionArgs: ['cmd-arg2', ...params.actionArgs],
      });
    });
  });

  describe('extendParams', () => {
    it('extends params', () => {
      expect(call.extendParams({
        attrs: { attr1: ['attr1-val2'] },
        args: ['arg2'],
        actionArgs: ['cmd-arg2'],
      })()).toEqual({
        ...params,
        attrs: { ...params.attrs, attr1: ['attr1-val', 'attr1-val2'] },
        args: [...params.args, 'arg2'],
        actionArgs: [...params.actionArgs, 'cmd-arg2'],
      });
    });
  });
});
