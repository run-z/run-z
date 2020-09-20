import { asis } from '@proc7ts/primitives';
import { ZOptionError } from '@run-z/optionz';
import type { ZPackageJson } from 'run-z';
import type { ZPackage } from '../core';
import { TestPlan } from '../spec';

describe('NamedZBatchesBuiltin', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  let first: ZPackage;
  let second: ZPackage;
  let third: ZPackage;

  describe.each([['--only='], ['-y='], ['-y']])('%s', option => {
    it('limits batches', async () => {
      await init();
      await testPlan.parse(`run-z ${option}first,third build`);

      expect(await testPlan.callOf(first, 'build')).toBeDefined();
      expect(await testPlan.callOf(second, 'build').catch(asis)).toBeInstanceOf(TypeError);
      expect(await testPlan.callOf(third, 'build')).toBeDefined();
    });
    it('overrides batch selection', async () => {
      await init();
      await testPlan.parse(`run-z --only second ${option}first,third build`);

      expect(await testPlan.callOf(first, 'build')).toBeDefined();
      expect(await testPlan.callOf(second, 'build').catch(asis)).toBeInstanceOf(TypeError);
      expect(await testPlan.callOf(third, 'build')).toBeDefined();
    });
    it('fails when no batches specified', async () => {
      await init();
      expect(await testPlan.parse(`run-z ${option}`).catch(asis)).toBeInstanceOf(ZOptionError);
    });

    describe('on nested inclusions', () => {
      it('is ignored when no matches found', async () => {
        await init(
            {
              'all/*': 'run-z ./first',
            },
            {
              build: 'exec first',
              'third/*': 'run-z ../third',
            },
        );

        await testPlan.parse(`run-z ${option}all build`);

        expect(await testPlan.callOf(first, 'build').catch(asis)).toBeInstanceOf(TypeError);
        expect(await testPlan.callOf(second, 'build').catch(asis)).toBeInstanceOf(TypeError);
        expect(await testPlan.callOf(third, 'build')).toBeDefined();
      });
      it('is applied when match found', async () => {
        await init(
            {
              'all/*': 'run-z ./first',
            },
            {
              'third/*': 'run-z ../third',
              'all/*': 'run-z ../second',
            },
        );

        await testPlan.parse(`run-z ${option}all build`);

        expect(await testPlan.callOf(first, 'build').catch(asis)).toBeInstanceOf(TypeError);
        expect(await testPlan.callOf(second, 'build')).toBeDefined();
        expect(await testPlan.callOf(third, 'build').catch(asis)).toBeInstanceOf(TypeError);
      });
    });
  });

  describe.each([['--except'], ['-x']])('%s', option => {
    it('excludes batches', async () => {
      await init();
      await testPlan.parse(`run-z ${option} second build`);

      expect(await testPlan.callOf(first, 'build')).toBeDefined();
      expect(await testPlan.callOf(second, 'build').catch(asis)).toBeInstanceOf(TypeError);
      expect(await testPlan.callOf(third, 'build')).toBeDefined();
    });
    it('excludes batches even though they present in --only', async () => {
      await init();
      await testPlan.parse(`run-z ${option} second --only first,second build`);

      expect(await testPlan.callOf(first, 'build')).toBeDefined();
      expect(await testPlan.callOf(second, 'build').catch(asis)).toBeInstanceOf(TypeError);
      expect(await testPlan.callOf(third, 'build').catch(asis)).toBeInstanceOf(TypeError);
    });
    it('extends exclusion', async () => {
      await init();
      await testPlan.parse(`run-z --except third ${option} second build`);

      expect(await testPlan.callOf(first, 'build')).toBeDefined();
      expect(await testPlan.callOf(second, 'build').catch(asis)).toBeInstanceOf(TypeError);
      expect(await testPlan.callOf(third, 'build').catch(asis)).toBeInstanceOf(TypeError);
    });
    // eslint-disable-next-line jest/no-identical-title
    it('fails when no batches specified', async () => {
      await init();
      expect(await testPlan.parse(`run-z ${option}`).catch(asis)).toBeInstanceOf(ZOptionError);
    });
  });

  describe.each([['--with'], ['-w']])('%s', option => {
    it('selects additional batches', async () => {
      await init({
        'first/*': 'run-z ./first',
        '+second/*': 'run-z ./second',
        '+third/*': 'run-z ./third',
      });
      await testPlan.parse(`run-z ${option} second build`);

      expect(await testPlan.callOf(first, 'build')).toBeDefined();
      expect(await testPlan.callOf(second, 'build')).toBeDefined();
      expect(await testPlan.callOf(third, 'build').catch(asis)).toBeInstanceOf(TypeError);
    });
    it('extends selection', async () => {
      await init({
        '+first/*': 'run-z ./first',
        '+second/*': 'run-z ./second',
        '+third/*': 'run-z ./third',
      });
      await testPlan.parse(`run-z --with third ${option} second build`);

      expect(await testPlan.callOf(first, 'build').catch(asis)).toBeInstanceOf(TypeError);
      expect(await testPlan.callOf(second, 'build')).toBeDefined();
      expect(await testPlan.callOf(third, 'build')).toBeDefined();
    });
    // eslint-disable-next-line jest/no-identical-title
    it('fails when no batches specified', async () => {
      await init();
      expect(await testPlan.parse(`run-z ${option}`).catch(asis)).toBeInstanceOf(ZOptionError);
    });
  });

  async function init(
      scripts: ZPackageJson['scripts'] = {
        'first/*': 'run-z ./first',
        'second/*': 'run-z ./second',
        'third/*': 'run-z ./third',
      },
      scripts1: ZPackageJson['scripts'] = {
        build: 'exec first',
      },
  ): Promise<void> {
    testPlan.addPackage(
        'main',
        {
          packageJson: {
            name: 'main',
            scripts,
          },
        },
    );

    testPlan.addPackage(
        'main/first',
        {
          packageJson: {
            name: 'first',
            scripts: scripts1,
          },
        },
    );
    first = await testPlan.target();

    testPlan.addPackage(
        'main/second',
        {
          packageJson: {
            name: 'second',
            scripts: {
              build: 'exec second',
            },
          },
        },
    );
    second = await testPlan.target();

    testPlan.addPackage(
        'main/third',
        {
          packageJson: {
            name: 'third',
            scripts: {
              build: 'exec third',
            },
          },
        },
    );
    third = await testPlan.target();
  }
});
