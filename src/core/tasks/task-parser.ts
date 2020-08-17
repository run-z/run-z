/**
 * @packageDocumentation
 * @module run-z
 */
import { noop } from '@proc7ts/primitives';
import { SupportedZOptions, ZOptionInput } from '@run-z/optionz';
import type { ZOptionsParser } from '@run-z/optionz/d.ts/options-parser';
import { parse } from 'shell-quote';
import { zTaskSpecParser } from './impl/parser';
import type { ZTaskBuilder } from './task-builder';
import type { ZTaskOption } from './task-option';

/**
 * A parser of command line containing {@link ZTaskSpec task specifier}.
 */
export class ZTaskParser {

  /**
   * @internal
   */
  private _specParser?: ReturnType<typeof zTaskSpecParser>;

  /**
   * @internal
   */
  private readonly _config: ZTaskParser.Config;

  /**
   * Constructs task parser.
   *
   * @param config  Task parser configuration.
   */
  constructor(config: ZTaskParser.Config = {}) {
    this._config = config;
  }

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
   * Parses attribute and adds it to attributes collection.
   *
   * @param value  A string value potentially containing attribute.
   * @param onAttr  A function that accepts attribute name and value as parameters and returns `false` when attribute
   * ignored.
   *
   * @returns `true` if attribute is added to target attributes collection, or `false` if the given string `value` does
   * not contain attribute specifier or it is ignored.
   */
  parseAttr(
      value: string,
      onAttr: (this: void, name: string, value: string) => boolean | void = noop,
  ): readonly [string, string] | undefined {
    if (ZOptionInput.isOptionValue(value)) {

      const eqIdx = value.indexOf('=');

      if (eqIdx >= 0) {
        return extractZTaskAttr(value, eqIdx, onAttr);
      }
    }

    return;
  }

  /**
   * Tries to parse a command line such as NPM package script.
   *
   * The command line can not be parsed properly when it contains a special shell sequence such as glob pattern,
   * environment variable substitution, or comment.
   *
   * @param commandLine  A command line to parse.
   *
   * @returns Either parsed command line arguments, or `undefined` if target script can not be parsed.
   */
  parseCommandLine(commandLine: string): readonly string[] | undefined {

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
      return entries as string[];
    }

    return; // Special shell command present.
  }

  /**
   * Recognized options from command line arguments and applies them to the task.
   *
   * @param builder  Target task builder to apply recognized task options with.
   * @param args  Arguments to apply.
   * @param opts  Parser options.
   *
   * @returns A promise resolved to task builder when command line options applied.
   */
  applyOptions(
      builder: ZTaskBuilder,
      args: readonly string[],
      opts?: ZOptionsParser.Opts<ZTaskOption>,
  ): Promise<ZTaskBuilder> {
    if (!this._specParser) {
      this._specParser = zTaskSpecParser(builder.taskTarget.setup, this._config);
    }
    return this._specParser(builder, args, opts);
  }

}

export namespace ZTaskParser {

  /**
   * A set of supported task options.
   */
  export type SupportedOptions = SupportedZOptions<ZTaskOption>;

  /**
   * {@link ZTaskParser Task parser} configuration.
   */
  export interface Config {

    /**
     * Additional task options to support.
     */
    readonly options?: SupportedOptions;

  }

}

/**
 * @internal
 */
function extractZTaskAttr(
    arg: string,
    eqIdx: number,
    onAttr: (this: void, name: string, value: string) => boolean | void,
): readonly [string, string] | undefined {

  let name: string;
  let value: string;

  if (eqIdx) {
    name = arg.substr(0, eqIdx);
    value = arg.substr(eqIdx + 1);
  } else {
    name = arg.substr(1);
    value = 'on';
  }

  return onAttr(name, value) !== false ? [name, value] : undefined;
}
