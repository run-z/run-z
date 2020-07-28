/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * Base representation of command line option passed to its {@link ZOptionReader reader} in order to be recognized.
 *
 * A class implementing this interface along with any interface specific to the parser is created by
 * {@link ZOptionsParser.Config.optionClass} method.
 *
 * The {@link ZOptionReader reader} uses option methods to recognize and consume command line arguments. Once recognized
 * these arguments are consumed, and option reading continues from the next non-consumed argument.
 *
 * If multiple readers correspond to the same option key, they all consulted in order. Once one of them recognized the
 * option, the remaining and {@link defer deferred} ones receive an option instance representing already consumed
 * option. The latter can be read by readers, but can no longer be updated.
 */
export interface ZOption {

  /**
   * Option name.
   *
   * This is a command line {@link args argument} at {@link argIndex currently processed index}.
   */
  readonly name: string;

  /**
   * Option key used to find corresponding option readers.
   *
   * This may be the same as [name], or may be e.g. a wildcard key when no readers for the option name recognized it.
   * In any case, the option key is {@link ZOptionInput.key syntax-specific}.
   */
  readonly key: string;

  /**
   * Command line arguments the option is read from.
   *
   * These arguments may be updated by {@link ZOptionSyntax option syntax} between the read attempts.
   */
  readonly args: readonly string[];

  /**
   * An index of the first command line argument the reader should recognized.
   */
  readonly argIndex: number;

  /**
   * Reads up to the maximum number of values of the option.
   *
   * Values are command line options following the {@link argIndex currently processed one}. Their number depend on the
   * {@link ZOptionSyntax option syntax}. E.g. a `--name=value` syntax supports one value, while
   * `--name value1 value2 ...` syntax supports any number of them.
   *
   * Calling this method marks the option and value arguments as recognized. This can be changed by calling any
   * recognition method again.
   *
   * When called on already recognized option this method just returns the values returned to the reader that recognized
   * them.
   *
   * @param max  The maximum number of values to read.
   *
   * @returns Option values array.
   */
  values(max?: number): readonly string[];

  /**
   * Reads all of the remaining command line arguments and treat them as option values.
   *
   * Reads [values] and all command line arguments following them up to the end of command line.
   *
   * Calling this method marks all arguments read as recognized. This can be changed by calling any recognition method
   * again.
   *
   * When called on already recognized option this method just returns the values returned to the reader that recognized
   * them.
   *
   * @returns Command line arguments array.
   */
  rest(): readonly string[];

  /**
   * Defers the option processing until recognized by another reader available for the same option key.
   *
   * Calling this method marks arguments as unrecognized. This can be changed by calling any recognition method again.
   * The already registered callback will be unregistered on such call.
   *
   * @param whenRecognized  Optional callback function that will be called when option recognized by another reader.
   */
  defer(whenRecognized?: ZOptionReader<this>): void;

  /**
   * Allows to await for option recognition.
   *
   * Calling this method does not alter option recognition status in any way, unlike {@link defer recognition
   * deferring}. An unlike deferring, the callback registered by this method will be called when the option recognized
   * by any reader, not just the readers registered for the same option key.
   *
   * @param receiver
   */
  whenRecognized(receiver: (this: void, option: this) => void): void;

}

export namespace ZOption {

  /**
   * A class constructor implementing a command line option representation.
   *
   * This is a class to extend by {@link ZOptionsParser.Config.optionClass options parser}.
   *
   * @typeparam TArgs  A type of constructor arguments.
   */
  export interface BaseClass<TArgs extends any[]> {

    prototype: ZOption;

    new (...args: TArgs): ZOption;

  }

  /**
   * A class constructor representing a parser-specific implementation of the command line option.
   *
   * @typeparam TOption  Parser-specific command line option interface implemented by this class.
   * @typeparam TCtx  A type of option processing context required by parser.
   * @typeparam TArgs  A type of arguments to pass to the {@link BaseClass base constructor}.
   */
  export interface ImplClass<TOption extends ZOption, TCtx, TArgs extends any[]> {

    prototype: TOption;

    /**
     * Constructs command line option representation.
     *
     * @param context  Option processing context.
     * @param args  Arguments to pass to the {@link BaseClass base constructor}.
     */
    new (context: TCtx, ...args: TArgs): TOption;

  }

}

/**
 * Option reader signature.
 *
 * A reader accepts a {@link ZOption command line option} corresponding to the key the reader is
 * {@link SupportedZOptions.Map registered for} and tries to recognize it.
 *
 * @typeparam TOption  A type of command line option representation expected by reader.
 * @typeparam TThis  A type of `this` parameter.
 */
export type ZOptionReader<TOption extends ZOption, TThis = void> =
/**
 * @param option  Command line option to recognize.
 *
 * @returns Either nothing or promise-like instance resolved when the reader finishes option processing,
 * either recognized or not.
 */
    (this: TThis, option: TOption) => void | PromiseLike<unknown>;
