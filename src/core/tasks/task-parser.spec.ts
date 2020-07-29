import { asis } from '@proc7ts/primitives';
import { ZPackage, ZPackageTree } from '../packages';
import { ZSetup } from '../setup';
import { InvalidZTaskError } from './invalid-task-error';
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
        { task: 'dep1', parallel: false, attrs: {}, args: [] },
        { task: 'dep2', parallel: false, attrs: {}, args: [] },
        { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('ignores empty prerequisite', async () => {

    const spec = await parseSpec('run-z dep1 "" dep2 dep3');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes arguments', async () => {

    const spec = await parseSpec('run-z dep1 dep2 dep3 --some test');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes command', async () => {

    const spec = await parseSpec('run-z dep1 dep2 dep3 --some --then cmd --arg');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some']);
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
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some']);
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
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some']);
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
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes prerequisite argument', async () => {

    const spec = await parseSpec('run-z dep1 dep2//-a //dep3 --some test');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes shorthand prerequisite argument', async () => {

    const spec = await parseSpec('run-z dep1 dep2/-a dep3 --some test');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes multiple prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1 dep2//-a// //-b// //-c//dep3 --some test');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a', '-b', '-c'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes prerequisite arguments with multi-slash delimiter', async () => {

    const spec = await parseSpec('run-z dep1 dep2///-a -b -c/// dep3 --some test');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a', '-b', '-c'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes quoted prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1 "dep2 ///-a -b -c/// " dep3 --some test');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a -b -c'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('reads unclosed prerequisite arguments up to the end', async () => {

    const spec = await parseSpec('run-z dep1 dep2////-a -b -c // dep3 --some test');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a', '-b', '-c', '//', 'dep3', '--some', 'test'] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes multiple shorthand prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1 dep2/-a /-b //-c///-d dep3 --some test');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a', '-b', '-c', '-d'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('ignores empty prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1 dep2 // // dep3 --some test');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('ignores empty shorthand prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1 dep2/ / dep3 --some test');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes parallel prerequisites', async () => {

    const spec = await parseSpec('run-z dep1,dep2, dep3 dep4');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: true, attrs: {}, args: [] },
      { task: 'dep3', parallel: true, attrs: {}, args: [] },
      { task: 'dep4', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes parallel prerequisite arguments', async () => {

    const spec = await parseSpec('run-z dep1//-a//,dep2 //-b//, dep3');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: ['-a'] },
      { task: 'dep2', parallel: true, attrs: {}, args: ['-b'] },
      { task: 'dep3', parallel: true, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes parallel prerequisite shorthand arguments', async () => {

    const spec = await parseSpec('run-z dep1/-a/-b /-c,dep2 /-d, dep3');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: ['-a', '-b', '-c'] },
      { task: 'dep2', parallel: true, attrs: {}, args: ['-d'] },
      { task: 'dep3', parallel: true, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes package reference', async () => {

    const spec = await parseSpec('run-z dep1 ./path//selector dep2');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { selector: './path//selector' },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes parallel external prerequisite', async () => {

    const spec = await parseSpec('run-z dep1, ./path//selector dep2');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { selector: './path//selector' },
      { task: 'dep2', parallel: true, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes parallel external prerequisite with standalone comma', async () => {

    const spec = await parseSpec('run-z dep1 ./path//selector , dep2');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { selector: './path//selector' },
      { task: 'dep2', parallel: true, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes parallel external prerequisite with comma prefix', async () => {

    const spec = await parseSpec('run-z dep1 ./path//selector ,dep2');

    expect(spec.pre).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { selector: './path//selector' },
      { task: 'dep2', parallel: true, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes attributes', async () => {

    const spec = await parseSpec('run-z attr1=val1 attr2= =attr3 attr3=val3');

    expect(spec.attrs).toEqual({
      attr1: ['val1'],
      attr2: [''],
      attr3: ['on', 'val3'],
    });
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes prerequisite attributes', async () => {

    const spec = await parseSpec('run-z attr1=val1 dep/attr2=/=attr3/arg1/--arg2=2/attr3=val3');

    expect(spec.pre).toEqual([
      {
        task: 'dep',
        parallel: false,
        attrs: { attr2: [''], attr3: ['on', 'val3'] },
        args: ['arg1', '--arg2=2'],
      },
    ]);
    expect(spec.attrs).toEqual({ attr1: ['val1'] });
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('throws on arguments without prerequisite', async () => {

    const error: InvalidZTaskError = await parseSpec('run-z   //-a//   task').catch(asis);

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('// -a // task');
    expect(error.position).toBe(0);
  });
  it('throws on shorthand argument without prerequisite', async () => {

    const error: InvalidZTaskError = await parseSpec('run-z   /-a   task').catch(asis);

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('/-a task');
    expect(error.position).toBe(0);
  });
  it('throws on arguments after comma', async () => {

    const error: InvalidZTaskError = await parseSpec('run-z  task1,  //-a//   task2').catch(asis);

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1 , // -a // task2');
    expect(error.position).toBe(8);
  });
  it('throws on shorthand argument after comma', async () => {

    const error: InvalidZTaskError = await parseSpec('run-z  task1,  /-a   task2').catch(asis);

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1 , /-a task2');
    expect(error.position).toBe(8);
  });
  it('throws on arguments after comma within the same entry', async () => {

    const error: InvalidZTaskError = await parseSpec('run-z  task1,//-a//   task2').catch(asis);

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1 , // -a // task2');
    expect(error.position).toBe(8);
  });
  it('throws on shorthand argument after comma within the same entry', async () => {

    const error: InvalidZTaskError = await parseSpec('run-z  task1,/-a   task2').catch(asis);

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1 , /-a task2');
    expect(error.position).toBe(8);
  });
  it('throws on arguments after comma inside entry', async () => {

    const error: InvalidZTaskError = await parseSpec('run-z  task1,//-a//task2').catch(asis);

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1 , // -a // task2');
    expect(error.position).toBe(8);
  });
  it('throws on shorthand argument after comma inside entry', async () => {

    const error: InvalidZTaskError = await parseSpec('run-z  task1,/-a,task2').catch(asis);

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1 , /-a , task2');
    expect(error.position).toBe(8);
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
        },
      });

      setup = new ZSetup({ taskParser });

      const spec = await parseSpec('run-z --custom attr1 val1 --custom attr2');

      expect(spec.attrs).toEqual({
        attr1: ['val1'],
      });
    });
  });

  function target(): Promise<ZPackage> {
    return setup.packageResolver.get(new ZPackageTree('root', { packageJson: { name: 'root' } }));
  }

  async function parseSpec(commandLine: string): Promise<ZTaskSpec> {

    const builder = await setup.taskFactory.newTask(await target(), 'test').parse(commandLine);

    return builder.spec();
  }

  async function applyOptions(args: readonly string[]): Promise<ZTaskSpec> {

    const builder = await setup.taskFactory.newTask(await target(), 'test').applyOptions(args);

    return builder.spec();
  }
});
