import { execZNoOp } from '@run-z/exec-z';
import { ZShell } from './shell';

describe('ZShell', () => {
  describe('noop', () => {
    describe('execCommand', () => {
      it('does nothing', () => {
        expect((ZShell.noop as any).execCommand()).toBe(execZNoOp());
      });
    });
    describe('execScript', () => {
      it('does nothing', () => {
        expect((ZShell.noop as any).execScript()).toBe(execZNoOp());
      });
    });
  });
});
