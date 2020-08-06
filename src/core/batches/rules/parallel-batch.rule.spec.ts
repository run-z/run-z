import { TestPlan } from '../../../spec';
import type { ZPackage, ZPackageTree } from '../../packages';
import { ZSetup } from '../../setup';
import { ZTaskParser } from '../../tasks';
import { ParallelZBatch } from './parallel-batch.rule';

describe('ParallelZBatch', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  let main: ZPackageTree;
  let nested1: ZPackage;
  let nested2: ZPackage;

  describe('--parallel-batch', () => {
    it('executes tasks in parallel', async () => {
      await init();
      await testPlan.parse('run-z ./nested// --parallel-batch test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(true);
    });
    it('executes tasks in parallel when specified after `--sequential-batch`', async () => {
      await init();
      await testPlan.parse('run-z ./nested// --sequential-batch --parallel-batch test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(true);
    });
    it('is ignored by transient prerequisites', async () => {
      await init();
      await testPlan.parse('run-z --all --parallel-batch test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(false);
    });
  });

  describe('--sequential-batch', () => {
    it('executes tasks sequentially', async () => {
      await init();
      await testPlan.parse('run-z ./nested// --sequential-batch test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(false);
    });
    it('executes tasks sequentially when specified after `--parallel-batch`', async () => {
      await init();
      await testPlan.parse('run-z ./nested// --parallel-batch --sequential-batch test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(false);
    });
    it('is ignored by transient prerequisites', async () => {
      await init('run-z test=main ./nested// --parallel-batch');
      await testPlan.parse('run-z --all --sequential-batch test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(true);
    });
  });

  it('may be set by custom option', async () => {

    const setup = new ZSetup({
      taskParser: new ZTaskParser({
        options: {
          '--test-parallel'(option) {
            option.setBatching(option.batching.rule(ParallelZBatch).makeParallel());
            option.values(0);
          },
        },
      }),
    });

    testPlan = new TestPlan('root', { setup });

    await init('run-z test=main ./nested// --test-parallel');
    await testPlan.parse('run-z --all test');

    const call1 = await testPlan.callOf(nested1, 'test');
    const call2 = await testPlan.callOf(nested2, 'test');

    expect(call1.isParallelTo(call2.task)).toBe(true);
  });

  async function init(script = 'run-z test=main ./nested//'): Promise<void> {
    main = testPlan.addPackage(
        'main',
        {
          packageJson: {
            scripts: {
              'group/*': script,
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
  }

});
