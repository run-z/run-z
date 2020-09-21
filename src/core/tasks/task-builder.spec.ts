import { TestPlan } from '../../spec';
import type { ZPackageJson } from '../packages';
import type { ZTaskBuilder } from './task-builder';

describe('ZTaskBuilder', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  describe('applyArgv', () => {
    it('applies explicit options', async () => {

      const builder = await newTask({
        name: 'test',
        scripts: {
          test: 'run-z attr=val1 --then exec',
        },
      });

      await builder.applyArgv('test', ['/usr/bin/node', 'run-z.js', 'attr=val1', '--then', 'exec', 'attr=val2']);

      expect(builder.spec()).toEqual({
        pre: [
          {
            targets: [],
            task: 'test',
            annex: false,
            parallel: false,
            attrs: {},
            args: [],
          },
        ],
        attrs: {
          attr: ['val2'],
        },
        args: [],
        action: {
          type: 'group',
          targets: [],
        },
      });
    });
    it('falls back when task command is not `run-z`', async () => {

      const builder = await newTask({
        name: 'test',
        scripts: {
          test: 'not-run-z attr=val1 --then exec',
        },
      });

      await builder.applyArgv('test', ['/usr/bin/node', 'run-z.js', 'attr=val1', '--then', 'exec', 'attr=val2']);

      expect(builder.spec()).toEqual({
        pre: [],
        attrs: {
          attr: ['val1'],
        },
        args: [],
        action: {
          type: 'command',
          command: 'exec',
          parallel: false,
          args: ['attr=val2'],
        },
      });
    });
    it('falls back when task name absent', async () => {

      const builder = await newTask({
        name: 'test',
        scripts: {
          test: 'run-z attr=val1 --then exec',
        },
      });

      await builder.applyArgv(undefined, ['/usr/bin/node', 'run-z.js', 'attr=val1', '--then', 'exec', 'attr=val2']);

      expect(builder.spec()).toEqual({
        pre: [],
        attrs: {
          attr: ['val1'],
        },
        args: [],
        action: {
          type: 'command',
          command: 'exec',
          parallel: false,
          args: ['attr=val2'],
        },
      });
    });
    it('falls back when there is no scripts in `package.json`', async () => {

      const builder = await newTask({ name: 'test' });

      await builder.applyArgv('wrong', ['/usr/bin/node', 'run-z.cli.js', 'attr=val1', '--then', 'exec', 'attr=val2']);

      expect(builder.spec()).toEqual({
        pre: [],
        attrs: {
          attr: ['val1'],
        },
        args: [],
        action: {
          type: 'command',
          command: 'exec',
          parallel: false,
          args: ['attr=val2'],
        },
      });
    });
    it('falls back when task name is wrong', async () => {

      const builder = await newTask({
        name: 'test',
        scripts: {
          test: 'run-z attr=val1 --then exec',
        },
      });

      await builder.applyArgv('wrong', ['/usr/bin/node', 'run-z.cli.js', 'attr=val1', '--then', 'exec', 'attr=val2']);

      expect(builder.spec()).toEqual({
        pre: [],
        attrs: {
          attr: ['val1'],
        },
        args: [],
        action: {
          type: 'command',
          command: 'exec',
          parallel: false,
          args: ['attr=val2'],
        },
      });
    });
    it('falls back when command line is too short', async () => {

      const builder = await newTask({
        name: 'test',
        scripts: {
          test: 'run-z attr=val1 --then exec --arg1 --arg2 --arg3',
        },
      });

      await builder.applyArgv('test', ['/usr/bin/node', 'run-z.cli.js', 'attr=val1', '--then', 'exec', 'attr=val2']);

      expect(builder.spec()).toEqual({
        pre: [],
        attrs: {
          attr: ['val1'],
        },
        args: [],
        action: {
          type: 'command',
          command: 'exec',
          parallel: false,
          args: ['attr=val2'],
        },
      });
    });
    it('falls back when script is not a command line prefix', async () => {

      const builder = await newTask({
        name: 'test',
        scripts: {
          test: 'run-z attr=val1 --then exec --arg',
        },
      });

      await builder.applyArgv('test', ['/usr/bin/node', 'run-z.cli.js', 'attr=val1', '--then', 'exec', 'attr=val2']);

      expect(builder.spec()).toEqual({
        pre: [],
        attrs: {
          attr: ['val1'],
        },
        args: [],
        action: {
          type: 'command',
          command: 'exec',
          parallel: false,
          args: ['attr=val2'],
        },
      });
    });
  });

  async function newTask(packageJson: ZPackageJson): Promise<ZTaskBuilder> {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            name: 'test',
            ...packageJson,
          },
        },
    );

    const target = await testPlan.target();

    return testPlan.setup.taskFactory.newTask(target, '');
  }
});
