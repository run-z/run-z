import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { ttyColumns } from './tty-columns.js';

describe('ttyColumns', () => {
  let prevColumns: number;
  let prevEnv: string | undefined;

  beforeEach(() => {
    prevColumns = process.stdout.columns;
    prevEnv = process.env.COLUMNS;
  });
  afterEach(() => {
    process.stdout.columns = prevColumns;
    if (prevEnv != null) {
      process.env.COLUMNS = prevEnv;
    } else {
      delete process.env.COLUMNS;
    }
  });

  it('detects the number of columns in stdout', () => {
    process.stdout.columns = 123;
    expect(ttyColumns()).toBe(123);
  });
  it('detects the number of columns by COLUMNS environment variable', () => {
    process.stdout.columns = 0;
    process.env.COLUMNS = '213';
    expect(ttyColumns()).toBe(213);
  });
  it('falls back to 80', () => {
    process.stdout.columns = 0;
    delete process.env.COLUMNS;
    expect(ttyColumns()).toBe(80);
  });
});
