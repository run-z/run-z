import { stripControlChars } from './strip-control-chars';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chalk = require('chalk');

describe('stripControlChars', () => {
  it('strips control chars and terminal escape sequences', () => {
    expect(stripControlChars(chalk.green('text\tto\0test'))).toEqual('texttotest');
  });
});
