/**
 * @packageDocumentation
 * @module run-z/internals
 */
import type { Chalk } from 'chalk';
import * as chalk from 'chalk';

export const clz = {

  get option(): Chalk {
    return chalk.green;
  },

  param(name: string): string {
    return clz.sign('\u276c') + chalk.cyan.bold(name) + clz.sign('\u276d');
  },

  get sign(): Chalk {
    return chalk.dim.white;
  },

  get bullet(): string {
    return chalk.hidden('- ') + '*';
  },

  optional(text: string): string {
    return clz.sign('[') + text + clz.sign(']');
  },

};
