import { asis } from '@proc7ts/primitives';
import { TestPlan } from '../../spec';
import type { ZPackage, ZPackageTree } from '../packages';
import { ZTaskParams } from '../plan';
import { UnknownZTaskError } from '../unknown-task-error';

describe('ZBatcher', () => {

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
              'group/*': 'run-z test=main ./nested// +test',
              'group/other': 'run-z test=other ./nested/1 +other',
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
              other: 'exec other1',
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
  });

  describe('--all', () => {
    describe('called at top level', () => {
      // eslint-disable-next-line jest/expect-expect
      it('batches all tasks in named groups', async () => {
        await testPlan.target(main);
        await ensureTasksCalled();
      });
    });

    describe('called for nested target', () => {
      // eslint-disable-next-line jest/expect-expect
      it('batches all tasks in named groups', async () => {
        await testPlan.target(nested2.location);
        await ensureTasksCalled();
      });
    });

    it('prefers matching task group', async () => {
      await testPlan.parse('run-z --all other');

      expect((await testPlan.callOf(nested1, 'other')).params(ZTaskParams.newEvaluator()).attr('test')).toBe('other');
      expect(testPlan.findCallOf(nested1, 'test')).toBeUndefined();
      expect(testPlan.findCallOf(nested2, 'other')).toBeUndefined();
      expect(testPlan.findCallOf(nested2, 'test')).toBeUndefined();
    });

    it('falls back to default batcher if no named batches defined', async () => {
      testPlan = new TestPlan(
          'root',
          {
            packageJson: {
              name: 'main',
              scripts: {
                test: 'exec test',
              },
            },
          },
      );

      const call = await testPlan.parse('run-z --all test=main test');

      expect(call.plan.callOf(call.task).params(ZTaskParams.newEvaluator()).attr('test')).toBe('main');
    });

    it('processes recurrent named batches', async () => {
      testPlan.addPackage(
          'main/nested/3',
          {
            packageJson: {
              name: 'nested3',
              scripts: {
                '3rd/test': 'run-z ../../3rd//',
                'all/*': 'run-z ../../3rd//',
              },
            },
          },
      );

      testPlan.addPackage(
          'main/3rd/1',
          {
            packageJson: {
              name: '3rd1',
              scripts: {
                test: 'exec test',
              },
            },
          },
      );

      const third = await testPlan.target();

      await testPlan.parse('run-z --all test=main test');

      const call3 = await testPlan.callOf(third, 'test');

      expect(call3.params(ZTaskParams.newEvaluator()).attr('test')).toBe('main');
    });

    it('processes transient named batches', async () => {
      testPlan.addPackage(
          'main/nested/3',
          {
            packageJson: {
              name: 'nested3',
              scripts: {
                each: 'run-z .',
                'all/test': 'run-z +each/test',
                test: 'exec test3',
              },
            },
          },
      );

      const nested3 = await testPlan.target();

      await testPlan.parse('run-z --all test=main test');

      const call3 = await testPlan.callOf(nested3, 'test');

      expect(call3.params(ZTaskParams.newEvaluator()).attr('test')).toBe('main');
    });

    it('fails when named batch is not a group', async () => {
      testPlan = new TestPlan(
          'root',
          {
            packageJson: {
              name: 'main',
              scripts: {
                'all/*': 'exec all',
                test: 'exec test',
              },
            },
          },
      );

      const error = await testPlan.parse('run-z --all test=main test').catch(asis);

      expect(error).toBeInstanceOf(UnknownZTaskError);
    });
  });

  async function ensureTasksCalled(): Promise<void> {
    await testPlan.parse('run-z --all test');

    expect((await testPlan.callOf(nested1, 'test')).params(ZTaskParams.newEvaluator()).attr('test')).toBe('main');
    expect(testPlan.findCallOf(nested1, 'other')).toBeUndefined();
    expect((await testPlan.callOf(nested2, 'test')).params(ZTaskParams.newEvaluator()).attr('test')).toBe('main');
    expect(testPlan.findCallOf(nested2, 'other')).toBeUndefined();
  }
});
