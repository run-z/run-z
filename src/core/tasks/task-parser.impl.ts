import { ZOptionBaseClass, ZOptionImplClass, ZOptionsParser } from '../options/options-parser.impl';
import type { ZSetup } from '../setup';
import { InvalidZTaskError } from './invalid-task-error';
import type { ZTaskOption } from './task-option';
import type { ZTaskParser } from './task-parser';
import { ZTaskSpec } from './task-spec';

/**
 * @internal
 */
const zTaskArgsSep = /\/\//;

/**
 * @internal
 */
export class ZTaskCLParser extends ZOptionsParser<ZTaskCLData, ZTaskCLOption> {

  constructor(readonly setup: ZSetup) {
    super({
      options: ({ clParser }) => ({
        '--and': clParser.readCommand.bind(clParser, true),
        '--then': clParser.readCommand.bind(clParser, false),
        '--*': clParser.readNamed.bind(clParser),
        '*': clParser.readPositional.bind(clParser),
      }),
      isOptionName: setup.taskParser.isOption.bind(setup.taskParser),
    });
  }

  async parseTask(entries: readonly string[]): Promise<ZTaskSpec> {

    const data = new ZTaskCLData(this, entries);

    await this.parseOptions(data, entries);

    data.appendTask();

    return {
      pre: data.pre,
      attrs: data.attrs,
      args: data.args,
      action: data.action || ZTaskSpec.groupAction,
    };
  }

  optionClass<TArgs extends any[]>(
      base: ZOptionBaseClass<TArgs>,
  ): ZOptionImplClass<ZTaskCLOption, ZTaskCLData, TArgs> {

    const setup = this.setup;

    class TaskOption extends base implements ZTaskCLOption {

      constructor(readonly data: ZTaskCLData, ...args: TArgs) {
        super(...args);
      }

      get setup(): ZSetup {
        return setup;
      }

      get taskParser(): ZTaskParser {
        return setup.taskParser;
      }

      addPre(pre: ZTaskSpec.Pre): void {
        this.data.pre.push(pre);
      }

      addAttr(name: string, value: string): void {
        recordZTaskAttr(this.data.attrs, name, value);
      }

      addArg(arg: string): void {
        this.data.args.push(arg);
      }

      setAction(action: ZTaskSpec.Action): void {
        this.data.action = action;
      }

    }

    return TaskOption;
  }

  private readNamed(option: ZTaskCLOption): void {
    option.addArg(option.name);
    for (const arg of option.values()) {
      option.addArg(arg);
    }
  }

  private readPositional(option: ZTaskCLOption): void {

    const { taskParser, data, name: entry } = option;

    if (taskParser.isPackageSelector(entry)) {
      // Package reference
      data.appendTask();
      data.entryIndex = option.argIndex + 1;
      option.addPre({ selector: entry });
      option.values(0);
      return;
    }

    if (taskParser.parseAttr(entry, (n, v) => !n.includes('/') && option.addAttr(n, v))) {
      data.appendTask();
      data.entryIndex = option.argIndex + 1;
      option.values(0);
      return;
    }

    const parts = entry.split(zTaskArgsSep);

    for (let p = 0; p < parts.length; ++p) {

      const part = parts[p];

      if (part) {
        if (data.inPreArgs) {
          data.preArgs.push(part);
        } else {

          const tasks = part.split(',');

          for (let t = 0; t < tasks.length; ++t) {

            const [task, ...rest] = tasks[t].split('/');
            const args = rest.filter(arg => !!arg);

            if (!task) {
              // Just arg(s)
              if (args.length && t) {
                ++data.position; // Comma
                data.parseError('Task argument specified, but not the task');
              }
              data.preArgs.push(...args);
              if (tasks.length === 1) {
                continue;
              }
            }

            data.appendTask();
            data.entryIndex = option.argIndex;

            if (task) {
              data.preTask = task;
              data.preArgs = args;
            }

            if (t) {
              data.preParallel = true;
              ++data.position; // Comma
            }
            data.position += task.length;
          }
        }
      }

      if (p + 1 < parts.length) {
        data.inPreArgs = !data.inPreArgs;
      }
    }

    option.values(0);
  }

  readCommand(parallel: boolean, option: ZTaskCLOption): void {

    const [command, ...args] = option.rest();

    if (command) {
      option.setAction({
        type: 'command',
        command,
        parallel,
        args,
      });
    }
  }

}

/**
 * @internal
 */
export class ZTaskCLData {

  entryIndex = 0;
  position = 0;
  readonly pre: ZTaskSpec.Pre[] = [];
  readonly attrs: Record<string, [string, ...string[]]> = {};
  readonly args: string[] = [];
  action?: ZTaskSpec.Action;
  preTask: string | undefined;
  preParallel = false;
  preArgs: string[] = [];
  inPreArgs = false;

  constructor(
      readonly clParser: ZTaskCLParser,
      readonly entries: readonly string[],
  ) {
  }

  appendTask(): void {
    if (this.preTask) {
      // Finish the task.
      this.pre.push(createZTaskRef(
          this.clParser.setup.taskParser,
          this.preTask,
          this.preParallel,
          this.preArgs,
      ));
      this.preArgs = [];
      this.preParallel = false;
      this.preTask = undefined;
    } else if (this.preArgs.length) {
      this.parseError('Task arguments specified, but not the task');
    }
  }

  parseError(message: string): never {

    const { entries } = this;
    const { entryIndex } = this;
    let position = 0;
    let reconstructedCmd = '';

    for (let i = 0; i < entries.length; ++i) {

      const arg = entries[i];

      if (i === entryIndex) {
        position = reconstructedCmd.length + this.position;
        if (this.position >= arg.length) {
          // The end of argument
          // Move to the start of the next one.
          ++position;
        }
      }
      if (reconstructedCmd) {
        reconstructedCmd += ' ';
      }

      reconstructedCmd += arg;
    }

    throw new InvalidZTaskError(message, reconstructedCmd, position);
  }

}

interface ZTaskCLOption extends ZTaskOption {

  readonly taskParser: ZTaskParser;

  readonly data: ZTaskCLData;

}

/**
 * @internal
 */
function createZTaskRef(
    parser: ZTaskParser,
    task: string,
    parallel: boolean,
    allArgs: string[],
): ZTaskSpec.TaskRef {

  const attrs: Record<string, [string, ...string[]]> = {};
  const args: string[] = [];

  for (const arg of allArgs) {
    if (!parser.parseAttr(arg, attrs)) {
      args.push(arg);
    }
  }

  return {
    task,
    parallel,
    attrs,
    args,
  };
}

/**
 * @internal
 */
export function recordZTaskAttr(attrs: Record<string, string[]>, name: string, value: string): void {
  if (attrs[name]) {
    attrs[name].push(value);
  } else {
    attrs[name] = [value];
  }
}
