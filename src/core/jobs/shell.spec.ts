import { beforeEach, describe, expect, it } from '@jest/globals';
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
        expect(shell.execCommand(null!, null!)).toBe(execZNoOp());
      });
    });
    describe('execScript', () => {
      it('does nothing', () => {
        expect(shell.execScript(null!, null!)).toBe(execZNoOp());
      });
    });
  });
});
