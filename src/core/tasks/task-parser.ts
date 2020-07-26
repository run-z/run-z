/**
 * @packageDocumentation
 * @module run-z
 */
import { parse } from 'shell-quote';
import { InvalidZTaskError } from './invalid-task-error';
import { ZTaskSpec } from './task-spec';

/**
 * @internal
 */
const zTaskArgsSep = /\/\//;

/**
 * @internal
 */
const zTaskActionMap: { [name: string]: (args: readonly string[]) => ZTaskSpec.Action; } = {
  '--then': args => zTaskCommand(args, false),
  '--and': args => zTaskCommand(args, true),
};

/**
 * A parser of command line containing {@link ZTaskSpec task specifier}.
 */
export class ZTaskParser {

  /**
   * Checks whether the given string is package selector.
   *
   * @param value  A string value to check.
   *
   * @returns `true` if the given `value` is either `.` or `..`, or starts with either `./` or `.//`. `false` otherwise.
   */
  isPackageSelector(value: string): boolean {
    return value === '.' || value === '..' || value.startsWith('./') || value.startsWith('../');
  }

  /**
   * Checks whether the given string is an option.
   *
   * @param value  A string value to check.
   *
   * @returns `true` if the given `value` starts with `-`, or `false` otherwise.
   */
  isOption(value: string): boolean {
    return value.startsWith('-');
  }

  /**
   * Parses attribute and adds it to attributes collection.
   *
   * @param value  A string value potentially containing attribute.
   * @param attrs  Attributes collection to add attribute to, or a function that accepts attribute name and value
   * as parameters and returns `false` when attribute ignored.
   *
   * @returns `true` if attribute is added to target attributes collection, or `false` if the given string `value` does
   * not contain attribute specifier or it is ignored.
   */
  parseAttr(
      value: string,
      attrs: Record<string, string[]> | ((this: void, name: string, value: string) => boolean | void),
  ): boolean {
    if (!this.isOption(value)) {

      const addAttr = typeof attrs === 'function' ? attrs : recordZTaskAttr.bind(undefined, attrs);
      const eqIdx = value.indexOf('=');

      if (eqIdx >= 0) {
        return addZTaskAttr(addAttr, value, eqIdx);
      }
    }

    return false;
  }

  /**
   * Builds task specifier by its command line.
   *
   * @param commandLine  Task command line.
   *
   * @returns A promise resolved to parsed task specifier.
   */
  async parse(commandLine: string): Promise<ZTaskSpec> {

    const entries = parseZTaskEntries(commandLine);

    if (!entries) {
      return Promise.resolve(ZTaskSpec.script);
    }

    let e = 0;
    let entryIndex = 0;
    let entryPosition = 0;
    const pre: ZTaskSpec.Pre[] = [];
    const attrs: Record<string, [string, ...string[]]> = {};
    let preTask: string | undefined;
    let preParallel = false;
    let preArgs: string[] = [];
    let inPreArgs = false;

    const parseError = (message: string): never => {

      let position = 0;
      let reconstructedCmd = '';

      for (let i = 0; i < entries.length; ++i) {

        const entry = entries[i];

        if (i === entryIndex) {
          position = reconstructedCmd.length + entryPosition;
          if (entryPosition >= entry.length) {
            // The end of entry
            // Move to the start of the next one.
            ++position;
          }
        }
        if (reconstructedCmd) {
          reconstructedCmd += ' ';
        }

        reconstructedCmd += entry;
      }

      throw new InvalidZTaskError(message, reconstructedCmd, position);
    };
    const appendTask = (): void => {
      if (preTask) {
        // Finish the task.
        pre.push(createZTaskRef(this, preTask, preParallel, preArgs));
        preArgs = [];
        preParallel = false;
        preTask = undefined;
      } else if (preArgs.length) {
        parseError('Task arguments specified, but not the task');
      }
    };

    for (; e < entries.length; ++e) {

      const entry = entries[e];

      if (this.isOption(entry)) {
        break;
      }
      if (this.isPackageSelector(entry)) {
        // Package reference
        appendTask();
        entryIndex = e + 1;
        pre.push({ selector: entry });
        continue;
      }
      if (this.parseAttr(entry, (n, v) => !n.includes('/') && recordZTaskAttr(attrs, n, v))) {
        appendTask();
        entryIndex = e + 1;
        continue;
      }

      const parts = entry.split(zTaskArgsSep);

      for (let p = 0; p < parts.length; ++p) {

        const part = parts[p];

        if (part) {
          if (inPreArgs) {
            preArgs.push(part);
          } else {

            const tasks = part.split(',');

            for (let t = 0; t < tasks.length; ++t) {

              const [task, ...rest] = tasks[t].split('/');
              const args = rest.filter(arg => !!arg);

              if (!task) {
                // Just arg(s)
                if (args.length && t) {
                  ++entryPosition; // Comma
                  parseError('Task argument specified, but not the task');
                }
                preArgs.push(...args);
                if (tasks.length === 1) {
                  continue;
                }
              }

              appendTask();
              entryIndex = e;

              if (task) {
                preTask = task;
                preArgs = args;
              }

              if (t) {
                preParallel = true;
                ++entryPosition; // Comma
              }
              entryPosition += task.length;
            }
          }
        }

        if (p + 1 < parts.length) {
          inPreArgs = !inPreArgs;
        }
      }
    }

    appendTask();

    const actionIdx = entries.findIndex(arg => zTaskActionMap[arg], e);
    let args: readonly string[];
    let action: ZTaskSpec.Action;

    if (actionIdx >= 0) {
      args = entries.slice(e, actionIdx);
      action = zTaskActionMap[entries[actionIdx]](entries.slice(actionIdx + 1));
    } else {
      args = entries.slice(e);
      action = ZTaskSpec.groupAction;
    }

    return Promise.resolve({
      pre,
      attrs,
      args,
      action,
    });
  }

}

/**
 * @internal
 */
function parseZTaskEntries(commandLine: string): string[] | undefined {

  let withEnv = false;
  const detectEnv = (): undefined => {
    withEnv = true;
    return;
  };
  const entries = parse(commandLine, detectEnv);

  if (entries[0] !== 'run-z') {
    return; // Not a run-z script.
  }
  if (withEnv) {
    return; // Environment variable substitution supported in NPM scripts only.
  }
  if (entries.every(entry => typeof entry === 'string')) {
    return entries.slice(1) as string[];
  }

  return; // Special shell command present.
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
function addZTaskAttr(
    addAttr: (this: void, name: string, value: string) => boolean | void,
    arg: string,
    eqIdx: number,
): boolean {

  let name: string;
  let value: string;

  if (eqIdx) {
    name = arg.substr(0, eqIdx);
    value = arg.substr(eqIdx + 1);
  } else {
    name = arg.substr(1);
    value = 'on';
  }

  return addAttr(name, value) !== false;
}

/**
 * @internal
 */
function recordZTaskAttr(attrs: Record<string, string[]>, name: string, value: string): void {
  if (attrs[name]) {
    attrs[name].push(value);
  } else {
    attrs[name] = [value];
  }
}

/**
 * @internal
 */
function zTaskCommand([command, ...args]: readonly string[], parallel: boolean): ZTaskSpec.Command | ZTaskSpec.Group {
  return command
      ? {
        type: 'command',
        command,
        parallel,
        args,
      }
      : ZTaskSpec.groupAction;
}
