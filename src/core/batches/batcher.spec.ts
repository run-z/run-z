import { asis } from '@proc7ts/primitives';
import { TestPlan } from '../../spec';
import type { ZPackage, ZPackageTree } from '../packages';
import type { ZCall } from '../plan';

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
              'group/*': 'run-z test=main ./nested//',
              'group/other': 'run-z test=other ./nested/1',
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

      const call = await testPlan.parse('run-z --all other');

      expect((await callOf(call, nested1, 'other')).params().attr('test')).toBe('other');
      expect(await noCallOf(call, nested1, 'test')).toBeInstanceOf(TypeError);
      expect(await noCallOf(call, nested2, 'other')).toBeInstanceOf(TypeError);
      expect(await noCallOf(call, nested2, 'test')).toBeInstanceOf(TypeError);
    });

    it('falls back to default batcher if no package sets defined', async () => {
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

      expect(call.plan.callOf(call.task).params().attr('test')).toBe('main');
    });
  });

  async function callOf(call: ZCall, target: ZPackage, taskName: string): Promise<ZCall> {
    return call.plan.callOf(await target.task(taskName));
  }

  function noCallOf(call: ZCall, target: ZPackage, taskName: string): Promise<any> {
    return callOf(call, target, taskName).catch(asis);
  }

  async function ensureTasksCalled(): Promise<void> {

    const call = await testPlan.parse('run-z --all test');

    expect((await callOf(call, nested1, 'test')).params().attr('test')).toBe('main');
    expect(await noCallOf(call, nested1, 'other')).toBeInstanceOf(TypeError);
    expect((await callOf(call, nested2, 'test')).params().attr('test')).toBe('main');
    expect(await noCallOf(call, nested2, 'other')).toBeInstanceOf(TypeError);
  }
});
