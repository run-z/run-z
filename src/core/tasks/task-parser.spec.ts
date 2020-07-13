import { InvalidZTaskError } from './invalid-task-error';
import { ZTaskParser } from './task-parser';
import { ZTaskSpec } from './task-spec';

describe('ZTaskParser', () => {

  let parser: ZTaskParser;

  beforeEach(() => {
    parser = new ZTaskParser();
  });

  it('recognizes NPM script task', () => {

    const spec = parser.parse('some command');

    expect(spec).toBe(ZTaskSpec.script);
  });
  it('treats task with comment as NPM script', () => {

    const spec = parser.parse('run-z command #comment');

    expect(spec).toBe(ZTaskSpec.script);
  });
  it('treats task with shell commands as NPM script', () => {

    const spec = parser.parse('run-z command > out');

    expect(spec).toBe(ZTaskSpec.script);
  });
  it('treats task with environment variable substitution as NPM script', () => {

    const spec = parser.parse('run-z comm${some_env}');

    expect(spec).toBe(ZTaskSpec.script);
  });
  it('recognizes dependencies', () => {

    const spec = parser.parse('run-z dep1 dep2 dep3');

    expect(spec.deps).toEqual([
        { task: 'dep1', parallel: false, attrs: {}, args: [] },
        { task: 'dep2', parallel: false, attrs: {}, args: [] },
        { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes arguments', () => {

    const spec = parser.parse('run-z dep1 dep2 dep3 --some test');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes command', () => {

    const spec = parser.parse('run-z dep1 dep2 dep3 --some --then cmd --arg');

    expect(spec.deps).toEqual([
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
  it('recognizes parallel command', () => {

    const spec = parser.parse('run-z dep1 dep2 dep3 --some --and cmd --arg');

    expect(spec.deps).toEqual([
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
  it('ignores incomplete command', () => {

    const spec = parser.parse('run-z dep1 dep2 dep3 --some --then');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes dependency argument', () => {

    const spec = parser.parse('run-z dep1 dep2//-a //dep3 --some test');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes shorthand dependency argument', () => {

    const spec = parser.parse('run-z dep1 dep2/-a dep3 --some test');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes multiple dependency arguments', () => {

    const spec = parser.parse('run-z dep1 dep2//-a// //-b// //-c//dep3 --some test');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a', '-b', '-c'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes multiple shorthand dependency arguments', () => {

    const spec = parser.parse('run-z dep1 dep2/-a /-b //-c///-d dep3 --some test');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: ['-a', '-b', '-c', '-d'] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('ignores empty dependency arguments', () => {

    const spec = parser.parse('run-z dep1 dep2 //// dep3 --some test');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('ignores empty shorthand dependency arguments', () => {

    const spec = parser.parse('run-z dep1 dep2/ / dep3 --some test');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
      { task: 'dep3', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toEqual(['--some', 'test']);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes parallel dependencies', () => {

    const spec = parser.parse('run-z dep1,dep2, dep3 dep4');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { task: 'dep2', parallel: true, attrs: {}, args: [] },
      { task: 'dep3', parallel: true, attrs: {}, args: [] },
      { task: 'dep4', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes parallel dependency arguments', () => {

    const spec = parser.parse('run-z dep1//-a//,dep2 //-b//, dep3');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: ['-a'] },
      { task: 'dep2', parallel: true, attrs: {}, args: ['-b'] },
      { task: 'dep3', parallel: true, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes parallel dependency shorthand arguments', () => {

    const spec = parser.parse('run-z dep1/-a/-b /-c,dep2 /-d, dep3');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: ['-a', '-b', '-c'] },
      { task: 'dep2', parallel: true, attrs: {}, args: ['-d'] },
      { task: 'dep3', parallel: true, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes package reference', () => {

    const spec = parser.parse('run-z dep1 ./path//selector dep2');

    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, attrs: {}, args: [] },
      { selector: './path//selector' },
      { task: 'dep2', parallel: false, attrs: {}, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes attributes', () => {

    const spec = parser.parse('run-z attr1=val1 attr2= =attr3 attr3=val3');

    expect(spec.attrs).toEqual({
      attr1: ['val1'],
      attr2: [''],
      attr3: ['', 'val3'],
    });
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('recognizes dependency attributes', () => {

    const spec = parser.parse('run-z attr1=val1 dep/attr2=/=attr3/arg1/--arg2=2/attr3=val3');

    expect(spec.deps).toEqual([
      {
        task: 'dep',
        parallel: false,
        attrs: { attr2: [''], attr3: ['', 'val3'] },
        args: ['arg1', '--arg2=2'],
      },
    ]);
    expect(spec.attrs).toEqual({ attr1: ['val1'] });
    expect(spec.action).toBe(ZTaskSpec.groupAction);
  });
  it('throws on arguments without dependency', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z   //-a//   task');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('//-a// task');
    expect(error.position).toBe(0);
  });
  it('throws on shorthand argument without dependency', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z   /-a   task');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('/-a task');
    expect(error.position).toBe(0);
  });
  it('throws on arguments after comma', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,  //-a//   task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1, //-a// task2');
    expect(error.position).toBe(7);
  });
  it('throws on shorthand argument after comma', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,  /-a   task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1, /-a task2');
    expect(error.position).toBe(7);
  });
  it('throws on arguments after comma within the same entry', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,//-a//   task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1,//-a// task2');
    expect(error.position).toBe(6);
  });
  it('throws on shorthand argument after comma within the same entry', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,/-a   task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1,/-a task2');
    expect(error.position).toBe(6);
  });
  it('throws on arguments after comma inside entry', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,//-a//task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1,//-a//task2');
    expect(error.position).toBe(6);
  });
  it('throws on shorthand argument after comma inside entry', () => {

    let error!: InvalidZTaskError;

    try {
      parser.parse('run-z  task1,/-a,task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1,/-a,task2');
    expect(error.position).toBe(6);
  });
});
