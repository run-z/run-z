import { TestPlan } from '../../../spec';
import type { ZPackage, ZPackageTree } from '../../packages';

describe('ParallelZBatch', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  let main: ZPackageTree;
  let nested1: ZPackage;
  let nested2: ZPackage;

  beforeEach(async () => {
    main = testPlan.addPackage(
        'main',
        {
          packageJson: {
            scripts: {
              'group/*': 'run-z test=main ./nested//',
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
            scripts: {
              test: 'exec nested1',
            },
          },
        },
    );
    nested2 = await testPlan.target();

    await testPlan.target(main);
  });

  describe('--parallel-batch', () => {
    it('executes tasks in parallel', async () => {
      await testPlan.parse('run-z --all --parallel-batch test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(true);
    });
  });

  describe('--sequential-batch', () => {
    it('executes tasks in parallel', async () => {
      await testPlan.parse('run-z --all --sequential-batch test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(false);
    });
  });

});
