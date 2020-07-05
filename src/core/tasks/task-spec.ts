/**
 * @packageDocumentation
 * @module run-z
 */
import { parse } from 'shell-quote';
import { InvalidZTaskError } from './invalid-task-error';

/**
 * Task specifier.
 */
export interface ZTaskSpec {

  /**
   * Whether this is a native task.
   *
   * `true` when this is no a `run-z` command
   */
  readonly isNative: boolean;

  /**
   * Task dependencies.
   *
   * I.e. other tasks to run before this one.
   */
  readonly deps: readonly ZTaskSpec.Dep[];

  /**
   * Command line arguments to the script this task executes.
   */
  readonly args: readonly string[];

}

export namespace ZTaskSpec {

  /**
   * Task dependency.
   *
   * Either task or scope reference.
   */
  export type Dep = HostRef | TaskRef;

  /**
   * Task host reference.
   *
   * When present among {@link ZTaskSpec.deps task dependencies} the subsequent tasks are form the given host package.
   */
  export interface HostRef {

    readonly task?: undefined;

    /**
     * Relative {@link ZTaskSpec.isPackagePath path to package}.
     */
    readonly host: string;

  }

  /**
   * Task reference.
   */
  export interface TaskRef {

    /**
     * Task name.
     */
    readonly task: string;

    readonly host?: undefined;

    /**
     * Whether this task can be executed in parallel with preceding one.
     */
    readonly parallel: boolean;

    /**
     * Command line arguments.
     */
    readonly args: readonly string[];

  }

}

/**
 * @internal
 */
const nativeZTask: ZTaskSpec = {
  isNative: true,
  deps: [],
  args: [],
};

/**
 * @internal
 */
const zTaskArgsSep = /\/\//;

export const ZTaskSpec = {

  /**
   * Checks whether the given name is relative package path.
   *
   * @param name  The name to check.
   *
   * @returns `true` is the given `name` is either `.` or `..`, or starts with either `./` or `.//`. `false` otherwise.
   */
  isPackagePath(this: void, name: string): boolean {
    return name === '.' || name === '..' || name.startsWith('./') || name.startsWith('../');
  },

  /**
   * Builds task specifier by its command line.
   *
   * @param commandLine  Task command line.
   *
   * @returns Parsed task specifier.
   */
  parse(this: void, commandLine: string): ZTaskSpec {

    const entries = parseZTaskEntries(commandLine);

    if (!entries) {
      return nativeZTask;
    }

    let e = 0;
    let entryIndex = 0;
    let entryPosition = 0;
    const deps: ZTaskSpec.Dep[] = [];
    let depTask: string | undefined;
    let depParallel = false;
    let depArgs: string[] = [];
    let inDepArgs = false;

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
      if (depTask) {
        // Finish the task.
        deps.push({ task: depTask, parallel: depParallel, args: depArgs });
        depArgs = [];
        depParallel = false;
        depTask = undefined;
      } else if (depArgs.length) {
        parseError('Task arguments specified, but not the task');
      }
    };

    for (; e < entries.length; ++e) {

      const entry = entries[e];

      if (entry.startsWith('-')) {
        break;
      }
      if (ZTaskSpec.isPackagePath(entry)) {
        appendTask();
        entryIndex = e + 1;
        deps.push({ host: entry });
        continue;
      }

      const parts = entry.split(zTaskArgsSep);

      for (let p = 0; p < parts.length; ++p) {

        const part = parts[p];

        if (part) {
          if (inDepArgs) {
            depArgs.push(part);
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
                depArgs.push(...args);
                if (tasks.length === 1) {
                  continue;
                }
              }

              appendTask();
              entryIndex = e;

              if (task) {
                depTask = task;
                depArgs = args;
              }

              if (t) {
                depParallel = true;
                ++entryPosition; // Comma
              }
              entryPosition += task.length;
            }
          }
        }

        if (p + 1 < parts.length) {
          inDepArgs = !inDepArgs;
        }
      }
    }

    appendTask();
    return {
      isNative: false,
      deps,
      args: entries.slice(e),
    };
  },

};

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
    return; // Environment variable substitution supported in native scripts only.
  }
  if (entries.every(entry => typeof entry === 'string')) {
    return entries.slice(1) as string[];
  }

  return; // Special shell command present.
}
