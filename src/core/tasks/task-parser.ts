/**
 * @packageDocumentation
 * @module run-z
 */
import { noop } from '@proc7ts/primitives';
import { SupportedZOptions, ZOptionInput } from '@run-z/optionz';
import { parse } from 'shell-quote';
import { recordZTaskAttr, zTaskSpecParser } from './impl/task-spec-parser';
import type { ZTaskBuilder } from './task-builder';
import type { ZTaskOption } from './task-option';
import { ZTaskSpec } from './task-spec';

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
   * @param attrs  Attributes collection to add attribute to, or a function that accepts attribute name and value
   * as parameters and returns `false` when attribute ignored.
   *
   * @returns `true` if attribute is added to target attributes collection, or `false` if the given string `value` does
   * not contain attribute specifier or it is ignored.
   */
  parseAttr(
      value: string,
      attrs: Record<string, string[]> | ((this: void, name: string, value: string) => boolean | void) = noop,
  ): readonly [string, string] | undefined {
    if (ZOptionInput.isOptionValue(value)) {

      const addAttr = typeof attrs === 'function' ? attrs : recordZTaskAttr.bind(undefined, attrs);
      const eqIdx = value.indexOf('=');

      if (eqIdx >= 0) {
        return addZTaskAttr(addAttr, value, eqIdx);
      }
    }

    return;
  }

  /**
   * Parses a command line and applies recognized options to the task.
   *
   * @param builder  Target task builder to apply recognized task options with.
   * @param commandLine  Task command line to parse.
   *
   * @returns A promise resolved to task builder when command line parsed.
   */
  async parse(builder: ZTaskBuilder, commandLine: string): Promise<ZTaskBuilder> {

    const args = parseZTaskEntries(commandLine);

    if (!args) {
      return builder.setAction(ZTaskSpec.scriptAction);
    }

    return this.applyOptions(builder, args, 1);
  }

  /**
   * Recognized options from command line arguments and applies them to the task.
   *
   * @param builder  Target task builder to apply recognized task options with.
   * @param args  Arguments to apply.
   * @param fromIndex  An index of command line argument to start processing from. `0` by default.
   *
   * @returns A promise resolved to task builder when command line options applied.
   */
  applyOptions(builder: ZTaskBuilder, args: readonly string[], fromIndex?: number): Promise<ZTaskBuilder> {
    if (!this._specParser) {
      this._specParser = zTaskSpecParser(builder.target.setup, this._config);
    }
    return this._specParser(builder, args, fromIndex);
  }

}

export namespace ZTaskParser {

  /**
   * A set of supported task options.
   */
  export type SupportedOptions = SupportedZOptions<ZTaskOption, ZTaskBuilder>;

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
    return entries as string[];
  }

  return; // Special shell command present.
}

/**
 * @internal
 */
function addZTaskAttr(
    addAttr: (this: void, name: string, value: string) => boolean | void,
    arg: string,
    eqIdx: number,
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

  return addAttr(name, value) !== false ? [name, value] : undefined;
}
