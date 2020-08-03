import { asis } from '@proc7ts/primitives';
import { ZOptionError } from '@run-z/optionz';
import { ZPackage, ZPackageTree } from '../packages';
import { ZSetup } from '../setup';
import type { ZTaskBuilder } from './task-builder';
import { ZTaskParser } from './task-parser';
import { ZTaskSpec } from './task-spec';

describe('ZTaskParser', () => {

  let setup: ZSetup;

  beforeEach(() => {
    setup = new ZSetup();
  });

  it('recognizes NPM script task', async () => {

    const spec = await parseSpec('some command');

    expect(spec.action).toBe(ZTaskSpec.scriptAction);
  });
  it('treats task with comment as NPM script', async () => {

    const spec = await parseSpec('run-z command #comment');

    expect(spec.action).toBe(ZTaskSpec.scriptAction);
  });
  it('treats task with shell commands as NPM script', async () => {

    const spec = await parseSpec('run-z command > out');

    expect(spec.action).toBe(ZTaskSpec.scriptAction);
  });
  it('treats task with environment variable substitution as NPM script', async () => {

    const spec = await parseSpec('run-z comm${some_env}');

    expect(spec.action).toBe(ZTaskSpec.scriptAction);
  });
  it('recognizes prerequisites', async () => {

    const spec = await parseSpec('run-z dep1 dep2 dep3');

    expect(spec.pre).toEqual([
        { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
        { targets: [], task: 'dep2', parallel: false, attrs: {}, args: [] },
        { targets: [], task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('ignores empty prerequisite', async () => {

    const spec = await parseSpec('run-z dep1 "" dep2 dep3');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes arguments', async () => {

    const builder = await newTask();

    await builder.parse('run-z dep1 dep2 dep3 --dep-arg1=value --dep-arg2 test');
    await builder.applyOptions(['--test=value', '--other']);

    const spec = builder.spec();

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--dep-arg1=value', '--dep-arg2'] },
      { targets: [], task: 'test', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--test=value', '--other']);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('throws on unrecognized option', async () => {

    const error: ZOptionError = await parseSpec('run-z --wrong').catch(asis);

    expect(error).toBeInstanceOf(ZOptionError);
    expect(error.optionLocation).toEqual({
      args: ['run-z', '--wrong'],
      index: 1,
      endIndex: 2,
      offset: 0,
      endOffset: 7,
    });
  });
  it('recognizes command', async () => {

    const spec = await parseSpec('run-z dep1 dep2 dep3 --some --then cmd --arg');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({
      type: 'command',
      command: 'cmd',
      parallel: false,
      args: ['--arg'],
    });
  });
  it('applies command options', async () => {

    const spec = await applyOptions(['dep1', 'dep2', 'dep3', '--some', '--then', 'cmd', '--arg']);

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({
      type: 'command',
      command: 'cmd',
      parallel: false,
      args: ['--arg'],
    });
  });
  it('recognizes parallel command', async () => {

    const spec = await parseSpec('run-z dep1 dep2 dep3 --some --and cmd --arg');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({
      type: 'command',
      command: 'cmd',
      parallel: true,
      args: ['--arg'],
    });
  });
  it('ignores incomplete command', async () => {

    const spec = await parseSpec('run-z dep1 dep2 dep3 --some --then');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes prerequisite argument', async () => {

    const spec = await parseSpec('run-z dep1 dep2//-a //dep3 --some test');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: ['-a'] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
      { targets: [], task: 'test', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes shorthand prerequisite argument', async () => {

    const spec = await parseSpec('run-z dep1 dep2/-a dep3 --some test');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: ['-a'] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
      { targets: [], task: 'test', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes multiple prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1 dep2//-a// //-b// //-c//dep3 --some test');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: ['-a', '-b', '-c'] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
      { targets: [], task: 'test', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes prerequisite arguments with multi-slash delimiter', async () => {

    const spec = await parseSpec('run-z dep1 dep2///-a -b -c/// dep3 --some test');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: ['-a', '-b', '-c'] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
      { targets: [], task: 'test', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes quoted prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1 "dep2 ///-a -b -c/// " dep3 --some test');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: ['-a -b -c'] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
      { targets: [], task: 'test', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('reads unclosed prerequisite arguments up to the end', async () => {

    const spec = await parseSpec('run-z dep1 dep2////-a -b -c // dep3 --some test');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      {
        targets: [],
        task: 'dep2',
        parallel: false,
        attrs: {},
        args: ['-a', '-b', '-c', '//', 'dep3', '--some', 'test'],
      },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes multiple shorthand prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1 dep2/-a /-b //-c///-d dep3 --some test');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: ['-a', '-b', '-c', '-d'] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
      { targets: [], task: 'test', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('ignores empty prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1 dep2 // // dep3 --some test');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
      { targets: [], task: 'test', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('ignores empty shorthand prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1 dep2/ / dep3 --some test');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep3', parallel: false, attrs: {}, args: ['--some'] },
      { targets: [], task: 'test', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes parallel prerequisites', async () => {

    const spec = await parseSpec('run-z dep1,dep2, dep3 dep4');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      { targets: [], task: 'dep2', parallel: true, attrs: {}, args: [] },
      { targets: [], task: 'dep3', parallel: true, attrs: {}, args: [] },
      { targets: [], task: 'dep4', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes parallel prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1//-a//,dep2 //-b//, dep3');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: ['-a'] },
      { targets: [], task: 'dep2', parallel: true, attrs: {}, args: ['-b'] },
      { targets: [], task: 'dep3', parallel: true, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes parallel prerequisite shorthand arguments', async () => {

    const spec = await parseSpec('run-z dep1/-a/-b /-c,dep2 /-d, dep3');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: ['-a', '-b', '-c'] },
      { targets: [], task: 'dep2', parallel: true, attrs: {}, args: ['-d'] },
      { targets: [], task: 'dep3', parallel: true, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes prerequisite target', async () => {

    const spec = await parseSpec('run-z dep1 ./path//selector dep2 dep3');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      {
        targets: [{ selector: './path//selector' }],
        task: 'dep2',
        parallel: false,
        attrs: {},
        args: [],
      },
      {
        targets: [{ selector: './path//selector' }],
        task: 'dep3',
        parallel: false,
        attrs: {},
        args: [],
      },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [{ selector: './path//selector' }] });
  });
  it('recognizes sub-task targets', async () => {

    const spec = await parseSpec('run-z dep1 ./path//selector');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [{ selector: './path//selector' }] });
  });
  it('recognizes parallel prerequisite target', async () => {

    const spec = await parseSpec('run-z dep1, ./path//selector dep2');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      {
        targets: [{ selector: './path//selector' }],
        task: 'dep2',
        parallel: true,
        attrs: {},
        args: [],
      },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [{ selector: './path//selector' }] });
  });
  it('recognizes target of parallel prerequisite with standalone comma', async () => {

    const spec = await parseSpec('run-z dep1 ./path//selector , dep2');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      {
        targets: [{ selector: './path//selector' }],
        task: 'dep2',
        parallel: true,
        attrs: {},
        args: [],
      },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [{ selector: './path//selector' }] });
  });
  it('recognizes target of parallel prerequisite with comma prefix', async () => {

    const spec = await parseSpec('run-z dep1 ./path//selector ,dep2');

    expect(spec.pre).toEqual([
      { targets: [], task: 'dep1', parallel: false, attrs: {}, args: [] },
      {
        targets: [{ selector: './path//selector' }],
        task: 'dep2',
        parallel: true,
        attrs: {},
        args: [],
      },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toEqual({ type: 'group', targets: [{ selector: './path//selector' }] });
  });
  it('recognizes attributes', async () => {

    const spec = await parseSpec('run-z attr1=val1 attr2= =attr3 attr3=val3');

    expect(spec.attrs).toEqual({
      attr1: ['val1'],
      attr2: [''],
      attr3: ['on', 'val3'],
    });
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('recognizes prerequisite attributes', async () => {

    const spec = await parseSpec('run-z attr1=val1 dep/attr2=/=attr3/arg1/--arg2=2/attr3=val3');

    expect(spec.pre).toEqual([
      {
        targets: [],
        task: 'dep',
        parallel: false,
        attrs: { attr2: [''], attr3: ['on', 'val3'] },
        args: ['arg1', '--arg2=2'],
      },
    ]);
    expect(spec.attrs).toEqual({ attr1: ['val1'] });
    expect(spec.action).toEqual({ type: 'group', targets: [] });
  });
  it('throws on arguments without prerequisite', async () => {

    const error: ZOptionError = await parseSpec('run-z   //-a//   task').catch(asis);

    expect(error).toBeInstanceOf(ZOptionError);
    expect(error.optionLocation).toEqual({
      args: ['run-z', '//', '-a', '//', 'task'],
      index: 1,
      endIndex: 2,
      offset: 0,
      endOffset: 2,
    });
  });
  it('throws on shorthand argument without prerequisite', async () => {

    const error: ZOptionError = await parseSpec('run-z   /-a   task').catch(asis);

    expect(error).toBeInstanceOf(ZOptionError);
    expect(error.optionLocation).toEqual({
      args: ['run-z', '/-a', 'task'],
      index: 1,
      endIndex: 2,
      offset: 0,
      endOffset: 3,
    });
  });
  it('throws on arguments after comma', async () => {

    const error: ZOptionError = await parseSpec('run-z  task1,  //-a//   task2').catch(asis);

    expect(error).toBeInstanceOf(ZOptionError);
    expect(error.optionLocation).toEqual({
      args: ['run-z', 'task1', ',', '//', '-a', '//', 'task2'],
      index: 3,
      endIndex: 4,
      offset: 0,
      endOffset: 2,
    });
  });
  it('throws on shorthand argument after comma', async () => {

    const error: ZOptionError = await parseSpec('run-z  task1,  /-a   task2').catch(asis);

    expect(error).toBeInstanceOf(ZOptionError);
    expect(error.optionLocation).toEqual({
      args: ['run-z', 'task1', ',', '/-a', 'task2'],
      index: 3,
      endIndex: 4,
      offset: 0,
      endOffset: 3,
    });
  });
  it('throws on arguments after comma within the same entry', async () => {

    const error: ZOptionError = await parseSpec('run-z  task1,//-a//   task2').catch(asis);

    expect(error).toBeInstanceOf(ZOptionError);
    expect(error.optionLocation).toEqual({
      args: ['run-z', 'task1', ',', '//', '-a', '//', 'task2'],
      index: 3,
      endIndex: 4,
      offset: 0,
      endOffset: 2,
    });
  });
  it('throws on shorthand argument after comma within the same entry', async () => {

    const error: ZOptionError = await parseSpec('run-z  task1,/-a   task2').catch(asis);

    expect(error).toBeInstanceOf(ZOptionError);
    expect(error.optionLocation).toEqual({
      args: ['run-z', 'task1', ',', '/-a', 'task2'],
      index: 3,
      endIndex: 4,
      offset: 0,
      endOffset: 3,
    });
  });
  it('throws on arguments after comma inside entry', async () => {

    const error: ZOptionError = await parseSpec('run-z  task1,//-a//task2').catch(asis);

    expect(error).toBeInstanceOf(ZOptionError);
    expect(error.optionLocation).toEqual({
      args: ['run-z', 'task1', ',', '//', '-a', '//', 'task2'],
      index: 3,
      endIndex: 4,
      offset: 0,
      endOffset: 2,
    });
  });
  it('throws on shorthand argument after comma inside entry', async () => {

    const error: ZOptionError = await parseSpec('run-z  task1,/-a,task2').catch(asis);

    expect(error).toBeInstanceOf(ZOptionError);
    expect(error.optionLocation).toEqual({
      args: ['run-z', 'task1', ',', '/-a', ',', 'task2'],
      index: 3,
      endIndex: 4,
      offset: 0,
      endOffset: 3,
    });
  });

  describe('with custom options', () => {
    it('recognizes custom options', async () => {

      const taskParser = new ZTaskParser({
        options: {
          '--custom'(option) {

            const [name, value] = option.values(2);

            option.addAttrs({
              [name]: value ? [value] : undefined,
            });
          },
          '--pre'(option) {

            const [name, value] = option.values(2);

            option.pre.start('prerequisite').addAttrs({
              [name]: value ? [value] : undefined,
            });
          },
        },
      });

      setup = new ZSetup({ taskParser });

      const spec = await parseSpec('run-z --custom attr1 val1 --custom attr2 --pre attr2 val2');

      expect(spec).toEqual({
        pre: [{
          targets: [],
          task: 'prerequisite',
          parallel: false,
          attrs: {
            attr2: ['val2'],
          },
          args: [],
        }],
        attrs: {
          attr1: ['val1'],
        },
        args: [],
        action: {
          type: 'group',
          targets: [],
        },
      });
    });
    it('always allows empty arguments', async () => {

      const taskParser = new ZTaskParser({
        options: {
          '--custom'(option) {
            option.addArg();
            option.values(0);
          },
        },
      });

      setup = new ZSetup({ taskParser });

      const spec = await parseSpec('run-z --custom attr=val');

      expect(spec.attrs).toEqual({
        attr: ['val'],
      });
    });
  });

  function target(): Promise<ZPackage> {
    return setup.packageResolver.get(new ZPackageTree('root', { packageJson: { name: 'root' } }));
  }

  async function newTask(): Promise<ZTaskBuilder> {
    return setup.taskFactory.newTask(await target(), 'test');
  }

  async function parseSpec(commandLine: string): Promise<ZTaskSpec> {

    const builder = await newTask();
    await builder.parse(commandLine);

    return builder.spec();
  }

  async function applyOptions(args: readonly string[]): Promise<ZTaskSpec> {

    const builder = await newTask();
    await builder.applyOptions(args);

    return builder.spec();
  }
});
