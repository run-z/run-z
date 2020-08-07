import type { ZPackage, ZPackageTree } from '../../core';
import { ZSetup } from '../../core';
import { TestPlan } from '../../spec';
import { ZAllBatchBuiltin } from '../all-batch.builtin';
import { ZParallelBatches } from './parallel-batches.rule';

describe('ZParallelBatches', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  let main: ZPackageTree;
  let nested1: ZPackage;
  let nested2: ZPackage;

  describe('--batch-parallel', () => {
    it('executes tasks in parallel', async () => {
      await init();
      await testPlan.parse('run-z ./nested// --batch-parallel test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(true);
    });
    it('executes tasks in parallel when specified after `--batch-sequential`', async () => {
      await init();
      await testPlan.parse('run-z ./nested// --batch-sequential --batch-parallel test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(true);
    });
    it('is ignored by transient prerequisites', async () => {
      await init();
      await testPlan.parse('run-z --all --batch-parallel test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(false);
    });
  });

  describe('--bap', () => {
    it('executes tasks in parallel', async () => {
      await init();
      await testPlan.parse('run-z ./nested// --bap test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(true);
    });
  });

  describe('--batch-sequential', () => {
    it('executes tasks sequentially', async () => {
      await init();
      await testPlan.parse('run-z ./nested// --batch-sequential test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(false);
    });
    it('executes tasks sequentially when specified after `--batch-parallel`', async () => {
      await init();
      await testPlan.parse('run-z ./nested// --batch-parallel --batch-sequential test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(false);
    });
    it('is ignored by transient prerequisites', async () => {
      await init('run-z test=main ./nested// --batch-parallel');
      await testPlan.parse('run-z --all --batch-sequential test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(true);
    });
  });

  describe('--bas', () => {
    it('executes tasks sequentially', async () => {
      await init();
      await testPlan.parse('run-z ./nested// --bap --bas test');

      const call1 = await testPlan.callOf(nested1, 'test');
      const call2 = await testPlan.callOf(nested2, 'test');

      expect(call1.isParallelTo(call2.task)).toBe(false);
    });
  });

  it('may be set by custom option', async () => {

    const setup = new ZSetup({
      extensions: [
        ZAllBatchBuiltin,
        {
          options: {
            '--test-parallel'(option) {
              option.setBatching(option.batching.rule(ZParallelBatches).makeParallel());
              option.values(0);
            },
          },
        },
      ],
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
