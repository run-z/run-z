import { noopZExecutedProcess } from './impl';
import { ZShell } from './shell';

describe('ZShell', () => {
  describe('noop', () => {
    describe('execCommand', () => {
      it('does nothing', () => {
        expect((ZShell.noop as any).execCommand()).toBe(noopZExecutedProcess);
      });
    });
    describe('execScript', () => {
      it('does nothing', () => {
        expect((ZShell.noop as any).execScript()).toBe(noopZExecutedProcess);
      });
    });
  });
});
