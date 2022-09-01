import { beforeEach, describe, expect, it } from '@jest/globals';
import { StandardZSetup } from '../../builtins';
import { TestPlan } from '../../spec';
import type { ZPackage, ZPackageTree } from '../packages';
import { ZBatcher } from './batcher';
import { ZDepsFirstBatches } from './deps-first-batches.rule';

describe('ZDepsFirstBatches', () => {
  let testPlan: TestPlan;
  let main: ZPackageTree;
  let nested1: ZPackage;
  let nested2: ZPackage;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  it('establishes dependencies-first order', async () => {
    await init();
    await testPlan.parse('run-z ./nested// test other');

    const test1 = await testPlan.callOf(nested1, 'test');
    const other1 = await testPlan.callOf(nested1, 'other');
    const test2 = await testPlan.callOf(nested2, 'test');
    const other2 = await testPlan.callOf(nested2, 'other');

    expect(test1.hasPrerequisite(test2.task)).toBe(false);
    expect(test1.hasPrerequisite(other1.task)).toBe(false);
    expect(test1.hasPrerequisite(other2.task)).toBe(false);

    expect(other1.hasPrerequisite(test1.task)).toBe(true);
    expect(other1.hasPrerequisite(test2.task)).toBe(true);
    expect(other1.hasPrerequisite(other2.task)).toBe(false);

    expect(test2.hasPrerequisite(test1.task)).toBe(true);
    expect(test2.hasPrerequisite(other1.task)).toBe(false);
    expect(test2.hasPrerequisite(other2.task)).toBe(false);

    expect(other2.hasPrerequisite(test1.task)).toBe(true);
    expect(other2.hasPrerequisite(test2.task)).toBe(true);
    expect(other2.hasPrerequisite(other1.task)).toBe(true);
  });
  it('does not orders task annexes', async () => {
    await init();
    await testPlan.parse('run-z ./nested// +test other');

    const test1 = await testPlan.callOf(nested1, 'test');
    const other1 = await testPlan.callOf(nested1, 'other');
    const test2 = await testPlan.callOf(nested2, 'test');
    const other2 = await testPlan.callOf(nested2, 'other');

    expect(test1.hasPrerequisite(test2.task)).toBe(false);
    expect(test1.hasPrerequisite(other1.task)).toBe(false);
    expect(test1.hasPrerequisite(other2.task)).toBe(false);

    expect(other1.hasPrerequisite(test1.task)).toBe(false);
    expect(other1.hasPrerequisite(test2.task)).toBe(false);
    expect(other1.hasPrerequisite(other2.task)).toBe(false);

    expect(test2.hasPrerequisite(test1.task)).toBe(false);
    expect(test2.hasPrerequisite(other1.task)).toBe(false);
    expect(test2.hasPrerequisite(other2.task)).toBe(false);

    expect(other2.hasPrerequisite(test1.task)).toBe(false);
    expect(other2.hasPrerequisite(test2.task)).toBe(false);
    expect(other2.hasPrerequisite(other1.task)).toBe(true);
  });
  it('establishes dependencies-first order between multi-batched tasks', async () => {
    testPlan = new TestPlan('root', {
      setup: new StandardZSetup({
        extensions: {
          options: {
            '--test-multi-batch'(option) {
              option.values(0);
              option.setBatching(
                option.batching.batchBy(async planner => {
                  await ZBatcher.batchTask(planner);
                  if (planner.taskName === 'test') {
                    // Batch `other` task along with `test` one
                    await ZBatcher.batchTask({ ...planner, taskName: 'other' });
                  }
                }),
              );
            },
          },
        },
      }),
    });

    await init();
    await testPlan.parse('run-z --test-multi-batch ./nested// test');

    const test1 = await testPlan.callOf(nested1, 'test');
    const other1 = await testPlan.callOf(nested1, 'other');
    const test2 = await testPlan.callOf(nested2, 'test');
    const other2 = await testPlan.callOf(nested2, 'other');

    expect(test1.hasPrerequisite(test2.task)).toBe(false);
    expect(test1.hasPrerequisite(other1.task)).toBe(false);
    expect(test1.hasPrerequisite(other2.task)).toBe(false);

    expect(other1.hasPrerequisite(test1.task)).toBe(false);
    expect(other1.hasPrerequisite(test2.task)).toBe(false);
    expect(other1.hasPrerequisite(other2.task)).toBe(false);

    expect(test2.hasPrerequisite(test1.task)).toBe(true);
    expect(test2.hasPrerequisite(other1.task)).toBe(true);
    expect(test2.hasPrerequisite(other2.task)).toBe(false);

    expect(other2.hasPrerequisite(test1.task)).toBe(true);
    expect(other2.hasPrerequisite(test2.task)).toBe(false);
    expect(other2.hasPrerequisite(other1.task)).toBe(true);
  });
  it('does not establish dependencies-first order between tasks in different batches', async () => {
    await init();
    await testPlan.parse('run-z ./nested/2 test ./nested/1 test');

    const test1 = await testPlan.callOf(nested1, 'test');
    const test2 = await testPlan.callOf(nested2, 'test');

    expect(test1.hasPrerequisite(test2.task)).toBe(true);
    expect(test2.hasPrerequisite(test1.task)).toBe(false);
  });
  it('does not establish dependencies-first order when disabled', async () => {
    testPlan = new TestPlan('root', {
      setup: new StandardZSetup({
        extensions: {
          options: {
            '--test-no-deps-first'(option) {
              option.values(0);
              option.setBatching(option.batching.rule(ZDepsFirstBatches).depsFirst(false));
            },
          },
        },
      }),
    });

    await init();
    await testPlan.parse('run-z --test-no-deps-first ./nested// test');

    const test1 = await testPlan.callOf(nested1, 'test');
    const test2 = await testPlan.callOf(nested2, 'test');

    expect(test1.hasPrerequisite(test2.task)).toBe(false);
    expect(test2.hasPrerequisite(test1.task)).toBe(false);
  });

  async function init(): Promise<void> {
    main = testPlan.addPackage('main', {
      packageJson: {
        name: 'main',
      },
    });

    testPlan.addPackage('main/nested/1', {
      packageJson: {
        name: 'nested1',
        scripts: {
          test: 'exec nested1',
          other: 'exec other1',
        },
      },
    });
    nested1 = await testPlan.target();

    testPlan.addPackage('main/nested/2', {
      packageJson: {
        name: 'nested2',
        dependencies: {
          nested1: '*',
        },
        scripts: {
          test: 'exec nested1',
          other: 'exec other2',
        },
      },
    });
    nested2 = await testPlan.target();

    await testPlan.target(main);
  }
});
