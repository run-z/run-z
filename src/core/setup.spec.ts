import { valueProvider } from '@proc7ts/primitives';
import { ZPackageResolver } from './packages';
import { ZSetup } from './setup';
import { ZTaskFactory, ZTaskParser } from './tasks';

describe('ZSetup', () => {
  describe('taskParser', () => {
    it('is constructed by default', () => {

      const setup = new ZSetup({});

      expect(setup.taskParser).toBeInstanceOf(ZTaskParser);
      expect(setup.taskParser).toBe(setup.taskParser);
    });
    it('is taken from config', () => {

      const taskParser = new ZTaskParser();
      const setup = new ZSetup({ taskParser });

      expect(setup.taskParser).toBe(taskParser);
      expect(setup.taskParser).toBe(taskParser);
    });
    it('is built by config', () => {

      const taskParser = new ZTaskParser();
      const setup = new ZSetup({ taskParser: valueProvider(taskParser) });

      expect(setup.taskParser).toBe(taskParser);
      expect(setup.taskParser).toBe(taskParser);
    });
  });

  describe('taskFactory', () => {
    it('is constructed by default', () => {

      const setup = new ZSetup();

      expect(setup.taskFactory).toBeInstanceOf(ZTaskFactory);
      expect(setup.taskFactory).toBe(setup.taskFactory);
    });
    it('is taken from config', () => {

      const taskFactory = new ZTaskFactory();
      const setup = new ZSetup({ taskFactory });

      expect(setup.taskFactory).toBe(taskFactory);
      expect(setup.taskFactory).toBe(taskFactory);
    });
    it('is built by config', () => {

      const taskFactory = new ZTaskFactory();
      const setup = new ZSetup({ taskFactory: valueProvider(taskFactory) });

      expect(setup.taskFactory).toBe(taskFactory);
      expect(setup.taskFactory).toBe(taskFactory);
    });
  });

  describe('packageResolver', () => {
    it('is constructed by default', () => {

      const setup = new ZSetup();

      expect(setup.packageResolver).toBeInstanceOf(ZPackageResolver);
      expect(setup.packageResolver).toBe(setup.packageResolver);
    });
    it('is built by config', () => {

      let packageResolver!: ZPackageResolver;
      const setup = new ZSetup({ packageResolver: s => packageResolver = new ZPackageResolver(s) });

      expect(setup.packageResolver).toBe(packageResolver);
      expect(packageResolver).toBeDefined();
      expect(setup.packageResolver).toBe(packageResolver);
    });
  });
});
