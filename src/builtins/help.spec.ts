import { noop } from '@proc7ts/primitives';
import { TestPlan } from '../spec';

describe('ZHelpBuiltin', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log');
    logSpy.mockImplementation(noop);
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('-h', () => {
    it('displays brief help', async () => {

      const call = await testPlan.parse('run-z -h');

      await call.exec().whenDone();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('-h'));
    });
  });

  describe('--help', () => {
    it('displays full help', async () => {

      const call = await testPlan.parse('run-z -h');

      await call.exec().whenDone();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('--help'));
    });
  });
});
