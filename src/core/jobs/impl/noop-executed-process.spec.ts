import { noop } from '@proc7ts/primitives';
import { immediateResolution } from '../../../spec';
import { noopZExecutedProcess } from './noop-executed-process';

describe('noopExecutedProcess', () => {
  describe('whenDone', () => {
    it('resolves immediately', async () => {
      expect(await immediateResolution(noopZExecutedProcess.whenDone())).toEqual([undefined]);
    });
  });
  describe('abort', () => {
    it('is noop', () => {
      expect(noopZExecutedProcess.abort).toBe(noop);
    });
  });
});
