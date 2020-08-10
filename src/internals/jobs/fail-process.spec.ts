import { noop } from '@proc7ts/primitives';
import { immediateResolution } from '../../spec';
import { failZProcess } from './fail-process';

describe('failZProcess', () => {
  describe('whenDone', () => {
    it('rejects immediately', async () => {

      const reason = new Error('test');

      expect(await immediateResolution(failZProcess(reason).whenDone())).toEqual([undefined, reason]);
    });
  });
  describe('abort', () => {
    it('is noop', async () => {

      const process = failZProcess('test');

      expect(process.abort).toBe(noop);

      // Await for promise rejection
      expect(await immediateResolution(process.whenDone())).toEqual([undefined, 'test']);
    });
  });
});
