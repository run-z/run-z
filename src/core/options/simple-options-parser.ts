/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZOption } from './option';
import type { ZOptionSyntax } from './option-syntax';
import { customZOptionsParser, ZOptionsParser } from './options-parser';
import type { SupportedZOptions } from './supported-options';

/**
 * Simple command line options parser signature.
 */
export type SimpleZOptionsParser =
/**
 * @param args  Array of command line arguments
 * @param fromIndex  An index of command line argument to start processing from.
 *
 * @returns A promise resolved to parse result.
 */
    (
        this: void,
        args: readonly string[],
        fromIndex?: number,
    ) => Promise<SimpleZOptionsParser.Result>;

export namespace SimpleZOptionsParser {

  /**
   * Simple command line options parser configuration.
   */
  export interface Config {

    /**
     * Supported command line options.
     *
     * Recognizes all options by default.
     */
    readonly options?: SupportedZOptions;

    /**
     * Supported command line syntax.
     *
     * @default {@link ZOptionSyntax.default}
     */
    readonly syntax?: ZOptionSyntax | readonly ZOptionSyntax[];

  }

  /**
   * A result returned by simple command line option parser.
   */
  export interface Result {

    /**
     * Maps recognized option name to array of its values.
     */
    readonly [name: string]: readonly string[];

  }

}

/**
 * @internal
 */
const defaultSimpleZOptions: SupportedZOptions.Map = {
  '*'(option) {
    option.values();
  },
};

/**
 * Builds a simple command line options parser.
 *
 * @param config  Parser configuration.
 *
 * @returns New options parser.
 */
export function simpleZOptionsParser(config: SimpleZOptionsParser.Config = {}): SimpleZOptionsParser {

  const { options = defaultSimpleZOptions } = config;
  const parser: ZOptionsParser<Record<string, string[]>> = customZOptionsParser({
    ...config,
    options,
    optionClass<TArgs extends any[]>(
        base: ZOption.BaseClass<TArgs>,
    ): ZOption.ImplClass<ZOption, Record<string, string[]>, TArgs> {

      class SimpleZOption extends base {

        constructor(recognized: Record<string, string[]>, ...args: TArgs) {
          super(...args);
          this.whenRecognized(option => {
            if (recognized[this.name]) {
              recognized[this.name].push(...option.values());
            } else {
              recognized[this.name] = [...option.values()];
            }
          });
        }

      }

      return SimpleZOption;
    },
  });

  return (args, fromIndex) => parser({}, args, fromIndex);
}
