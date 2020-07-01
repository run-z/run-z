import { InvalidZTaskError } from './invalid-task-error';
import { ZTaskSpec } from './task-spec';

describe('ZTaskSpec', () => {
  it('recognizes native task', () => {

    const spec = new ZTaskSpec('some command');

    expect(spec.isNative).toBe(true);
    expect(spec.deps).toHaveLength(0);
    expect(spec.args).toHaveLength(0);
  });
  it('treats task with comment as native', () => {

    const spec = new ZTaskSpec('run-z command #comment');

    expect(spec.isNative).toBe(true);
    expect(spec.deps).toHaveLength(0);
    expect(spec.args).toHaveLength(0);
  });
  it('treats task with shell commands as native', () => {

    const spec = new ZTaskSpec('run-z command > out');

    expect(spec.isNative).toBe(true);
    expect(spec.deps).toHaveLength(0);
    expect(spec.args).toHaveLength(0);
  });
  it('treats task with environment variable substitution as native', () => {

    const spec = new ZTaskSpec('run-z comm${some_env}');

    expect(spec.isNative).toBe(true);
    expect(spec.deps).toHaveLength(0);
    expect(spec.args).toHaveLength(0);
  });
  it('recognizes dependencies', () => {

    const spec = new ZTaskSpec('run-z dep1 dep2 dep3');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
        { task: 'dep1', parallel: false, args: [] },
        { task: 'dep2', parallel: false, args: [] },
        { task: 'dep3', parallel: false, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
  });
  it('recognizes arguments', () => {

    const spec = new ZTaskSpec('run-z dep1 dep2 dep3 --then command');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, args: [] },
      { task: 'dep2', parallel: false, args: [] },
      { task: 'dep3', parallel: false, args: [] },
    ]);
    expect(spec.args).toEqual(['--then', 'command']);
  });
  it('recognizes dependency argument', () => {

    const spec = new ZTaskSpec('run-z dep1 dep2...-a ...dep3 --then command');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, args: [] },
      { task: 'dep2', parallel: false, args: ['-a'] },
      { task: 'dep3', parallel: false, args: [] },
    ]);
    expect(spec.args).toEqual(['--then', 'command']);
  });
  it('recognizes multiple dependency arguments', () => {

    const spec = new ZTaskSpec('run-z dep1 dep2...-a... ...-b... ...-c...dep3 --then command');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, args: [] },
      { task: 'dep2', parallel: false, args: ['-a', '-b', '-c'] },
      { task: 'dep3', parallel: false, args: [] },
    ]);
    expect(spec.args).toEqual(['--then', 'command']);
  });
  it('ignores empty dependency arguments', () => {

    const spec = new ZTaskSpec('run-z dep1 dep2 ...... dep3 --then command');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, args: [] },
      { task: 'dep2', parallel: false, args: [] },
      { task: 'dep3', parallel: false, args: [] },
    ]);
    expect(spec.args).toEqual(['--then', 'command']);
  });
  it('recognizes parallel dependencies', () => {

    const spec = new ZTaskSpec('run-z dep1,dep2, dep3 dep4');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, args: [] },
      { task: 'dep2', parallel: true, args: [] },
      { task: 'dep3', parallel: true, args: [] },
      { task: 'dep4', parallel: false, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
  });
  it('recognizes parallel dependency arguments', () => {

    const spec = new ZTaskSpec('run-z dep1...-a...,dep2 ...-b..., dep3');

    expect(spec.isNative).toBe(false);
    expect(spec.deps).toEqual([
      { task: 'dep1', parallel: false, args: ['-a'] },
      { task: 'dep2', parallel: true, args: ['-b'] },
      { task: 'dep3', parallel: true, args: [] },
    ]);
    expect(spec.args).toHaveLength(0);
  });
  it('throws on arguments without dependency', () => {

    let error!: InvalidZTaskError;

    try {
      new ZTaskSpec('run-z   ...-a...   task');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('...-a... task');
    expect(error.position).toBe(0);
  });
  it('throws on arguments after comma', () => {

    let error!: InvalidZTaskError;

    try {
      new ZTaskSpec('run-z  task1,  ...-a...   task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1, ...-a... task2');
    expect(error.position).toBe(7);
  });
  it('throws on arguments after comma within the same entry', () => {

    let error!: InvalidZTaskError;

    try {
      new ZTaskSpec('run-z  task1,...-a...   task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1,...-a... task2');
    expect(error.position).toBe(6);
  });
  it('throws on arguments after comma inside entry', () => {

    let error!: InvalidZTaskError;

    try {
      new ZTaskSpec('run-z  task1,...-a...task2');
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(InvalidZTaskError);
    expect(error.commandLine).toBe('task1,...-a...task2');
    expect(error.position).toBe(6);
  });
});
