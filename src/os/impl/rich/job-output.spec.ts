import { beforeEach, describe, expect, it } from '@jest/globals';
import { ZJobOutput } from './job-output';

describe('ZJobOutput', () => {

  let output: ZJobOutput;

  beforeEach(() => {
    output = new ZJobOutput();
  });

  describe('add', () => {
    it('collects full lines', () => {
      output.add('output line\n');
      output.add('error line\n', 1);
      expect([...output.lines()]).toEqual([
        ['output line', 0],
        ['error line', 1],
      ]);
    });
    it('collects line continuations', () => {
      output.add('output\n\nline');
      output.add(' continuation1');
      output.add(' continuation2\n');
      expect([...output.lines()]).toEqual([
        ['output', 0],
        ['', 0],
        ['line continuation1 continuation2', 0],
      ]);
    });
  });

  describe('status', () => {
    it('is predefined initially', () => {
      expect(output.status).toBe('');
    });
    it('is equal to the last non-blank line', () => {
      output.add('line1\nline2\n\n\n');
      expect(output.status).toBe('line2');
    });
    it('is predefined if all lines are blank', () => {
      output.add('  \n \n\n\n');
      expect(output.status).toBe('');
    });
  });

  describe('clear', () => {
    it('clears output', () => {
      output.add('line');
      output.clear();
      output.add('line2');
      expect([...output.lines()]).toEqual([
        ['line2', 0],
      ]);
    });
  });
});
