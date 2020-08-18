import { execZNoop } from '../../internals';
import { ZShell } from './shell';

describe('ZShell', () => {
  describe('noop', () => {
    describe('execCommand', () => {
      it('does nothing', () => {
        expect((ZShell.noop as any).execCommand()).toBe(execZNoop());
      });
    });
    describe('execScript', () => {
      it('does nothing', () => {
        expect((ZShell.noop as any).execScript()).toBe(execZNoop());
      });
    });
  });
});
