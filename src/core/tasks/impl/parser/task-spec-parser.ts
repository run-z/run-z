import type { ZOptionsParser } from '@run-z/optionz';
import { customZOptionsParser } from '@run-z/optionz';
import type { ZSetup } from '../../../setup';
import type { ZTaskBuilder } from '../../task-builder';
import type { ZTaskOption } from '../../task-option';
import type { ZTaskParser } from '../../task-parser';
import { DraftZTask } from './draft-task';
import { zTaskSpecOptionClass } from './task-spec-option-class';
import { zTaskSpecOptions } from './task-spec-options';
import { zTaskSpecSyntax } from './task-spec-syntax';

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

  return (builder, entries, opts) => parser(
      new DraftZTask(builder),
      entries,
      opts,
  ).then(builder => builder.done());
}
