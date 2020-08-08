import { noop } from '@proc7ts/primitives';
import { immediateResolution } from '../../../spec';
import { execNoopZProcess } from './exec-noop-process';

describe('execNoopZProcess', () => {
  describe('whenDone', () => {
    it('resolves immediately', async () => {
      expect(await immediateResolution(execNoopZProcess().whenDone())).toEqual([undefined]);
    });
  });
  describe('abort', () => {
    it('is noop', () => {
      expect(execNoopZProcess().abort).toBe(noop);
    });
  });
});
