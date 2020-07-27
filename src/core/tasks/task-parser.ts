/**
 * @packageDocumentation
 * @module run-z
 */
import { noop } from '@proc7ts/primitives';
import { parse } from 'shell-quote';
import { ZOptionInput } from '../options';
import type { ZSetup } from '../setup';
import { recordZTaskAttr, ZTaskCLParser } from './task-cl-parser.impl';
import { ZTaskSpec } from './task-spec';

/**
 * A parser of command line containing {@link ZTaskSpec task specifier}.
 */
export class ZTaskParser {

  private _clParser?: ZTaskCLParser;

  /**
   * Constructs task parser.
   *
   * @param setup  Task execution setup.
   */
  constructor(readonly setup: ZSetup) {
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
    if (!ZOptionInput.isOptionName(value)) {

      const addAttr = typeof attrs === 'function' ? attrs : recordZTaskAttr.bind(undefined, attrs);
      const eqIdx = value.indexOf('=');

      if (eqIdx >= 0) {
        return addZTaskAttr(addAttr, value, eqIdx);
      }
    }

    return;
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
    if (!this._clParser) {
      this._clParser = new ZTaskCLParser(this.setup);
    }

    return this._clParser.parseTask(entries);
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
