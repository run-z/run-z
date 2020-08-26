import chalk from 'chalk';
import { stripControlChars } from './strip-control-chars';

describe('stripControlChars', () => {
  it('strips control chars and terminal escape sequences', () => {
    expect(stripControlChars(chalk.green('text\tto\0test'))).toEqual('texttotest');
  });
});
