import { execZNoOp } from '@run-z/exec-z';
import { ZSetup } from '../setup';
import { ZShell } from './shell';

describe('ZShell', () => {
  describe('noop', () => {

    let shell: ZShell;

    beforeEach(() => {
      shell = ZShell.noop(new ZSetup());
    });

    describe('execCommand', () => {
      it('does nothing', () => {
        expect((shell as any).execCommand()).toBe(execZNoOp());
      });
    });
    describe('execScript', () => {
      it('does nothing', () => {
        expect((shell as any).execScript()).toBe(execZNoOp());
      });
    });
  });
});
