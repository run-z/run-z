import { TestPlan } from '../../spec';

describe('ZBatcher', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  describe('batchOverSets', () => {
    it('batches all tasks in named groups', async () => {

      const main = testPlan.addPackage(
          'main',
          {
            packageJson: {
              scripts: {
                'group1/*': 'run-z test=main ./nested//',
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

      const nested1 = await testPlan.target();

      testPlan.addPackage(
          'main/nested/2',
          {
            packageJson: {
              name: 'nested2',
              scripts: {
                test: 'exec nested1',
                other: 'exec other2',
              },
            },
          },
      );

      const nested2 = await testPlan.target();

      await testPlan.target(main);

      const call = await testPlan.parse('run-z --all test');

      expect(call.plan.callOf(await nested1.task('test')).params().attr('test')).toBe('main');
      expect(call.plan.callOf(await nested2.task('test')).params().attr('test')).toBe('main');

      expect(Array.from(call.plan.calls())).toContain(call);
    });
  });

});
