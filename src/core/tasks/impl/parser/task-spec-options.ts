import { arrayOfElements, valueByRecipe } from '@proc7ts/primitives';
import type { SupportedZOptions } from '@run-z/optionz';
import { ParallelZBatch, ZBatcher } from '../../../batches';
import type { ZTaskOption } from '../../task-option';
import type { ZTaskParser } from '../../task-parser';
import type { DraftZTask } from './draft-task';

/**
 * @internal
 */
const defaultZTaskSpecOptions: SupportedZOptions.Map<ZTaskOption> = {

  '--all'(option) {
    option.setBatching(option.batching.batchBy(ZBatcher.topmost()));
    option.values(0);
  },

  '--parallel-batch': readParallelZBatch.bind(undefined, true),
  '--pbatch': readParallelZBatch.bind(undefined, true),
  '--sequential-batch': readParallelZBatch.bind(undefined, false),
  '--sbatch': readParallelZBatch.bind(undefined, false),

  '--*=*': readNameValueZTaskArg,
  '-*=*': readNameValueZTaskArg,

  '--*': readNamedZTaskArg,
  '-*': readNamedZTaskArg,

  './*'(option) {
    option.pre.nextTarget({ selector: option.name });
    option.values(0);
  },

  '*=*'(option) {

    const { name, taskTarget: { setup: { taskParser } } } = option;

    if (taskParser.parseAttr(name, (n, v) => !n.includes('/') && !!option.addAttr(n, v))) {
      option.values(0);
    }
  },

  '/*'(option) {

    const { name } = option;
    const preOption = name.substr(1);

    if (preOption) {
      option.pre.addOption(preOption);
    }
    option.values(0);
  },

  '//*'(option) {
    option.values().slice(0, -1).forEach(preOption => option.pre.addOption(preOption));
  },

  ','(option) {
    option.pre.parallelToNext();
    option.values(0);
  },

  '*'(option) {

    const { name } = option;

    if (name) {
      option.pre.start(name);
    }
    option.values(0);
  },

};

/**
 * @internal
 */
export function zTaskSpecOptions(
    options?: ZTaskParser.SupportedOptions,
): SupportedZOptions<ZTaskOption, DraftZTask> {

  const providers: SupportedZOptions.Provider<ZTaskOption, DraftZTask>[] = arrayOfElements(options)
      .map(o => ({ builder }) => valueByRecipe(o, builder));

  return [defaultZTaskSpecOptions, ...providers];
}

/**
 * @internal
 */
function readParallelZBatch(parallel: boolean, option: ZTaskOption): void {
  option.setBatching(option.batching.rule(ParallelZBatch).makeParallel(parallel));
  option.values(0);
}

/**
 * @internal
 */
function readNamedZTaskArg(option: ZTaskOption): void {
  if (option.pre.isStarted) {
    option.pre.addArg(option.name);
  } else {
    option.addArg(option.name);
  }
  option.values(0);
}

/**
 * @internal
 */
function readNameValueZTaskArg(option: ZTaskOption): void {

  const [value] = option.values(1);
  const arg = `${option.name}=${value}`;

  if (option.pre.isStarted) {
    option.pre.addArg(arg);
  } else {
    option.addArg(arg);
  }
}


