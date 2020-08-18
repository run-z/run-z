import { noop } from '@proc7ts/primitives';
import { immediateResolution } from '../../spec';
import { execZNoop } from './exec-noop';

describe('execZNoop', () => {
  describe('whenDone', () => {
    it('resolves immediately', async () => {
      expect(await immediateResolution(execZNoop().whenDone())).toEqual([undefined]);
    });
  });
  describe('abort', () => {
    it('is noop', () => {
      expect(execZNoop().abort).toBe(noop);
    });
  });
});
