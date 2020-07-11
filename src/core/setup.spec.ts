import { valueProvider } from '@proc7ts/primitives';
import type { ZPackageLocation } from './packages';
import { ZPackageResolver, ZPackageTree } from './packages';
import { ZSetup } from './setup';
import { ZTaskParser } from './tasks';

describe('ZSetup', () => {

  let currentLocation: ZPackageLocation;

  beforeEach(() => {
    currentLocation = new ZPackageTree('root', { name: 'root' });
  });

  describe('taskParser', () => {
    it('is constructed by default', () => {

      const setup = new ZSetup({ currentLocation });

      expect(setup.taskParser).toBeInstanceOf(ZTaskParser);
      expect(setup.taskParser).toBe(setup.taskParser);
    });
    it('is taken from config', () => {

      const taskParser = new ZTaskParser();
      const setup = new ZSetup({ currentLocation, taskParser });

      expect(setup.taskParser).toBe(taskParser);
      expect(setup.taskParser).toBe(taskParser);
    });
    it('is built by config', () => {

      const taskParser = new ZTaskParser();
      const setup = new ZSetup({ currentLocation, taskParser: valueProvider(taskParser) });

      expect(setup.taskParser).toBe(taskParser);
      expect(setup.taskParser).toBe(taskParser);
    });
  });

  describe('packageResolver', () => {
    it('is constructed by default', () => {

      const setup = new ZSetup({ currentLocation });

      expect(setup.packageResolver).toBeInstanceOf(ZPackageResolver);
      expect(setup.packageResolver).toBe(setup.packageResolver);
    });
    it('is built by config', () => {

      let packageResolver!: ZPackageResolver;
      const setup = new ZSetup({
        currentLocation,
        packageResolver: s => packageResolver = new ZPackageResolver(s),
      });

      expect(setup.packageResolver).toBe(packageResolver);
      expect(packageResolver).toBeDefined();
      expect(setup.packageResolver).toBe(packageResolver);
    });
  });
});
