import type { ZPackage } from '../../core';
import { ZTaskParams } from '../../core';
import { TestPlan } from '../../spec';

describe('ZDepGraphBatches', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  let main: ZPackage;
  let nested1: ZPackage;
  let nested2: ZPackage;
  let nested3: ZPackage;

  describe('--with-deps', () => {
    it('batches in target along with its dependencies', async () => {
      await init();

      const call = await testPlan.parse('run-z --with-deps test');

      const all = await testPlan.callOf(main, 'all/*');
      const test1 = await testPlan.callOf(nested1, 'test');
      const test2 = await testPlan.callOf(nested2, 'test');
      const test3 = await testPlan.callOf(nested3, 'test');

      expect(call.hasPrerequisite(all.task)).toBe(true);
      expect(call.hasPrerequisite(test1.task)).toBe(true);
      expect(call.hasPrerequisite(test2.task)).toBe(true);
      expect(call.hasPrerequisite(test3.task)).toBe(true);

      expect(test2.hasPrerequisite(all.task)).toBe(true);
      expect(test2.hasPrerequisite(test1.task)).toBe(true);
      expect(test3.hasPrerequisite(test2.task)).toBe(true);

      expect(call.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(false);
      expect(all.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(false);
      expect(test1.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(false);
      expect(test2.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(false);
      expect(test3.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(true);
      expect(test3.params(ZTaskParams.newEvaluator()).attr('skip')).toBe('with-dependencies');
    });
  });
  describe('--only-deps', () => {
    it('batches in dependencies only', async () => {
      await init();
      await testPlan.parse('run-z --only-deps test');

      const test1 = await testPlan.callOf(nested1, 'test');
      const test2 = await testPlan.callOf(nested2, 'test');
      const test3 = await testPlan.callOf(nested3, 'test');

      expect(test1.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(false);
      expect(test2.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(true);
      expect(test2.params(ZTaskParams.newEvaluator()).attr('skip')).toBe('only-dependencies');
      expect(test3.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(true);
      expect(test3.params(ZTaskParams.newEvaluator()).attr('skip')).toBe('only-dependencies');
    });
  });
  describe('--with-dependants', () => {
    it('batches in target along with its dependants', async () => {
      await init();
      await testPlan.parse('run-z --with-dependants test');

      const test1 = await testPlan.callOf(nested1, 'test');
      const test2 = await testPlan.callOf(nested2, 'test');
      const test3 = await testPlan.callOf(nested3, 'test');

      expect(test1.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(true);
      expect(test1.params(ZTaskParams.newEvaluator()).attr('skip')).toBe('with-dependants');
      expect(test2.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(false);
      expect(test3.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(false);
    });
  });
  describe('--only-dependants', () => {
    it('batches in dependants only', async () => {
      await init();
      await testPlan.parse('run-z --only-dependants test');

      const test1 = await testPlan.callOf(nested1, 'test');
      const test2 = await testPlan.callOf(nested2, 'test');
      const test3 = await testPlan.callOf(nested3, 'test');

      expect(test1.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(true);
      expect(test1.params(ZTaskParams.newEvaluator()).attr('skip')).toBe('only-dependants');
      expect(test2.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(true);
      expect(test2.params(ZTaskParams.newEvaluator()).attr('skip')).toBe('only-dependants');
      expect(test3.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(false);
    });
  });
  describe('--all', () => {
    it('batches all', async () => {
      await init();
      await testPlan.parse('run-z --only-deps --all test');

      const test1 = await testPlan.callOf(nested1, 'test');
      const test2 = await testPlan.callOf(nested2, 'test');
      const test3 = await testPlan.callOf(nested3, 'test');

      expect(test1.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(false);
      expect(test2.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(false);
      expect(test3.params(ZTaskParams.newEvaluator()).flag('skip')).toBe(false);
    });
  });

  async function init(): Promise<void> {

    const mainLocation = testPlan.addPackage(
        'main',
        {
          packageJson: {
            name: 'main',
            scripts: {
              'all/*': 'run-z group=all ./nested//',
            },
          },
        },
    );

    testPlan.addPackage(
        'main/nested/1',
        {
          packageJson: {
            name: 'nested1',
            scripts: {
              test: 'exec nested1',
            },
          },
        },
    );
    nested1 = await testPlan.target();

    testPlan.addPackage(
        'main/nested/2',
        {
          packageJson: {
            name: 'nested2',
            dependencies: {
              nested1: '*',
            },
            scripts: {
              test: 'exec nested2',
            },
          },
        },
    );
    nested2 = await testPlan.target();

    testPlan.addPackage(
        'main/nested/3',
        {
          packageJson: {
            name: 'nested3',
            dependencies: {
              nested2: '*',
            },
            scripts: {
              test: 'exec nested3',
            },
          },
        },
    );
    nested3 = await testPlan.target();

    main = await testPlan.target(mainLocation);

    await testPlan.target(nested2.location);
  }
});
