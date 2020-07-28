import { arrayOfElements, noop } from '@proc7ts/primitives';
import type { ZOption, ZOptionReader } from './option';
import type { ZOptionInput } from './option-input';
import { ZOptionSyntax } from './option-syntax';
import type { ZOptionsParser } from './options-parser';
import type { SupportedZOptions } from './supported-options';
import { UnknownZOptionError } from './unknown-option-error';

/**
 * Command line options parser.
 *
 * @internal
 * @typeparam TCtx  A type of option processing context required by parser.
 * @typeparam TOption  A type of option representation.
 */
export class ZOptionsParser$<TOption extends ZOption, TCtx> {

  private readonly _config: ZOptionsParser.Config<TOption, TCtx>;
  private _options?: (this: void, context: TCtx) => Map<string, ZOptionReader<TOption>[]>;
  private _syntax?: ZOptionSyntax;
  private _optionClass?: ZOption.ImplClass<TOption, TCtx, [ZOptionImpl<TOption>]>;

  /**
   * Constructs command line options parser.
   *
   * @param config  Command line options configuration.
   */
  constructor(config: ZOptionsParser.Config<TOption, TCtx>) {
    this._config = config;
  }

  private get options(): (this: void, context: TCtx) => Map<string, readonly ZOptionReader<TOption>[]> {
    if (this._options) {
      return this._options;
    }
    return this._options = context => supportedZOptionsMap(context, this._config.options);
  }

  /**
   * Command line option representation class constructor.
   */
  get optionClass(): ZOption.ImplClass<TOption, TCtx, [ZOptionImpl<TOption>]> {
    if (this._optionClass) {
      return this._optionClass;
    }
    return this._optionClass = this._config.optionClass(ZOptionBase as ZOption.BaseClass<any>);
  }

  /**
   * Command line options syntax.
   */
  get syntax(): ZOptionSyntax {
    if (this._syntax) {
      return this._syntax;
    }

    const { syntax } = this._config;

    return this._syntax = syntax ? ZOptionSyntax.by(syntax) : ZOptionSyntax.default;
  }

  /**
   * Parses command line options.
   *
   * @param context  Options processing context. This context is supposed to receive the processing results.
   * @param args  Array of command line arguments
   * @param fromIndex  An index of command line argument to start processing from.
   *
   * @returns A promise resolved to processing context when parsing completes.
   */
  async parseOptions(
      context: TCtx,
      args: readonly string[],
      fromIndex = 0,
  ): Promise<TCtx> {

    const options = this.options(context);
    const optionClass = this.optionClass;
    const syntax = this.syntax;

    for (let argIndex = Math.max(0, fromIndex); argIndex < args.length;) {

      const impl = new ZOptionImpl<TOption>(args, argIndex);
      const option = new optionClass(context, impl);

      let retry: boolean;

      do {
        retry = false;
        for (const input of syntax(impl.tail)) {
          args = impl.setInput(input);

          if (input.retry) {
            retry = true;
            break; // Apply replacement
          }

          const { key = input.name } = input;
          const readers = options.get(key) || [];

          for (const reader of readers) {
            await impl.read(option, reader);
          }
          if (impl.recognized) {
            break;
          }
        }
      } while (retry);

      argIndex = await impl.done(option);
    }

    return context;
  }

}

/**
 * @internal
 */
function supportedZOptionsMap<TOption extends ZOption, TCtx>(
    context: TCtx,
    supportedOptions: SupportedZOptions<TOption, TCtx>,
): Map<string, ZOptionReader<TOption>[]> {

  const result = new Map<string, ZOptionReader<TOption>[]>();

  for (const supported of arrayOfElements(supportedOptions)) {

    const map: SupportedZOptions.Map<TOption> = typeof supported === 'function'
        ? supported(context)
        : supported;

    for (const [option, reader] of Object.entries(map)) {
      if (!reader) {
        continue;
      }

      const r = reader.bind(map);
      const readers = result.get(option);

      if (readers) {
        readers.push(r);
      } else {
        result.set(option, [r]);
      }
    }
  }

  return result;
}

/**
 * @internal
 */
class ZOptionImpl<TOption extends ZOption> {

  private readonly _head: readonly string[];
  private _name!: string;
  private _key!: string;
  private _values!: readonly string[];

  private _recognizedUpto!: number;
  private _deferred?: ZOptionReader<TOption>;
  private readonly _allDeferred: ZOptionReader<TOption>[] = [];

  recognized?: readonly string[];
  private _whenRecognized: (option: TOption) => void = noop;

  constructor(private _args: readonly string[], readonly argIndex: number) {
    this._head = _args.slice(0, argIndex);
  }

  get args(): readonly string[] {
    return this._args;
  }

  get name(): string {
    return this._name;
  }

  get key(): string {
    return this._key;
  }

  get tail(): readonly [string, ...string[]] {
    return this.args.slice(this.argIndex) as readonly string[] as readonly [string, ...string[]];
  }

  setInput(input: ZOptionInput): readonly string[] {

    const { name, key = name, values = [], tail = [] } = input;

    this._name = name;
    this._key = key;
    this._values = values;

    return this._args = [...this._head, name, ...values, ...tail];
  }

  async read(option: TOption, reader: ZOptionReader<TOption>): Promise<void> {
    if (!this.recognized) {
      this._recognizedUpto = -1;
      this._deferred = undefined;
    }

    await reader(option);

    if (this._deferred) {
      this._allDeferred.push(this._deferred);
    } else if (!this.recognized && this._recognizedUpto >= 0) {
      this.recognized = this.args.slice(this.argIndex + 1, this._recognizedUpto);
    }
  }

  async done(option: TOption): Promise<number> {
    for (const deferred of this._allDeferred) {
      await deferred(option);
    }

    if (this.recognized) {
      this._whenRecognized(option);
    } else {
      throw new UnknownZOptionError(this.name);
    }

    return this._recognizedUpto;
  }

  values(rest: boolean, max?: number): readonly string[] {
    if (this.recognized) {
      return max != null && max < this.recognized.length
          ? this.recognized.slice(0, max)
          : this.recognized;
    }

    const numValues = this._values.length;

    if (max == null || max < 0 || !rest && max > numValues) {
      max = numValues;
    }

    const valueIndex = this.argIndex + 1;

    this._recognize(valueIndex + max);

    return this.args.slice(valueIndex, valueIndex + max);
  }

  private _recognize(upto: number): void {
    this._recognizedUpto = upto;
    this._deferred = undefined;
  }

  defer(whenRecognized?: ZOptionReader<TOption>): void {
    this._deferred = whenRecognized;
  }

  whenRecognized(receiver: (option: TOption) => void): void {

    const prevReceiver = this._whenRecognized;

    this._whenRecognized = values => {
      prevReceiver(values);
      receiver(values);
    };
  }

}

/**
 * @internal
 */
class ZOptionBase<TOption extends ZOption> implements ZOption {

  constructor(private readonly _impl: ZOptionImpl<TOption>) {
  }

  get name(): string {
    return this._impl.name;
  }

  get key(): string {
    return this._impl.key;
  }

  get args(): readonly string[] {
    return this._impl.args;
  }

  get argIndex(): number {
    return this._impl.argIndex;
  }

  values(max?: number): readonly string[] {
    return this._impl.values(false, max);
  }

  rest(): readonly string[] {
    return this._impl.values(true, this._impl.args.length);
  }

  defer(whenRecognized?: ZOptionReader<this>): void {
    this._impl.defer(whenRecognized as ZOptionReader<any>);
  }

  whenRecognized(receiver: (this: void, option: this) => void): void {
    this._impl.whenRecognized(receiver as (option: any) => void);
  }

}
