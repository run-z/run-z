import type { ZOptionsParser } from '@run-z/optionz';
import { customZOptionsParser } from '@run-z/optionz';
import { ZTaskParser } from '../../task-parser.js';
import { ZSetup } from '../../../setup.js';
import { ZTaskBuilder } from '../../task-builder.js';
import { ZTaskOption } from '../../task-option.js';
import { DraftZTask } from './draft-task.js';
import { zTaskSpecOptions } from './task-spec-options.js';
import { zTaskSpecSyntax } from './task-spec-syntax.js';
import { zTaskSpecOptionClass } from './task-spec-option-class.js';

/**
 * @internal
 */
export function zTaskSpecParser(
  setup: ZSetup,
  { options }: ZTaskParser.Config,
): (
  this: void,
  builder: ZTaskBuilder,
  entries: readonly string[],
  opts?: ZOptionsParser.Opts<ZTaskOption, DraftZTask>,
) => Promise<ZTaskBuilder> {
  const parser: ZOptionsParser<ZTaskOption, DraftZTask> = customZOptionsParser({
    options: zTaskSpecOptions(setup, options),
    syntax: zTaskSpecSyntax(setup),
    optionClass: zTaskSpecOptionClass,
  });

  return (builder, entries, opts) => parser(new DraftZTask(builder), entries, opts).then(builder => builder.done());
}
