/**
 * @packageDocumentation
 * @module run-z
 */
import { arrayOfElements, lazyValue, noop } from '@proc7ts/primitives';
import type { SupportedZOptions, ZOption, ZOptionReader } from './option';
import { UnknownZOptionError } from './unknown-option-error';

/**
 * @internal
 */
export abstract class ZOptionsParser<TCtx, TOption extends ZOption> {

  private readonly _options: (this: void, context: TCtx) => Promise<Map<string, ZOptionReader<TOption>[]>>;
  readonly isOptionName: (this: void, arg: string) => boolean;
  private readonly _optionClass: ZOptionImplClass<TOption, TCtx, [ZOptionImpl<TCtx, TOption>]>;

  constructor(config: ZOptionsConfig<TCtx, TOption>) {

    const { options, isOptionName } = config;

    this._options = context => supportedZOptionsMap(context, options);
    this.isOptionName = isOptionName
        ? isOptionName.bind(config)
        : arg => arg.startsWith('-');
    this._optionClass = this.optionClass(ZOptionBase as ZOptionBaseClass<any>);
  }

  async parseOptions(
      context: TCtx,
      args: readonly string[],
      fromIndex = 0,
  ): Promise<void> {

    const options = await this._options(context);

    for (let argIndex = Math.max(0, fromIndex); argIndex < args.length;) {

      const impl = new ZOptionImpl(this, args, argIndex);
      const { name } = impl;
      const allReaders: ZOptionReader<TOption>[][] = [
          options.get(name) || [],
          this.isOptionName(name) && options.get('--*') || [],
          options.get('*') || [],
      ];

      const option = new this._optionClass(context, impl);

      for (const readers of allReaders) {
        for (const reader of readers) {
          await impl.read(option, reader);
        }
        if (impl.recognized) {
          break;
        }
      }

      argIndex = await impl.done(option);
    }
  }

  abstract optionClass<TArgs extends any[]>(
      base: ZOptionBaseClass<TArgs>,
  ): ZOptionImplClass<TOption, TCtx, TArgs>;

}

/**
 * @internal
 */
async function supportedZOptionsMap<TCtx, TOption extends ZOption>(
    context: TCtx,
    supportedOptions: SupportedZOptions<TCtx, TOption>,
): Promise<Map<string, ZOptionReader<TOption>[]>> {

  const result = new Map<string, ZOptionReader<TOption>[]>();

  for (const supported of arrayOfElements(supportedOptions)) {

    const map: SupportedZOptions.Map<TOption> = typeof supported === 'function'
        ? await supported(context)
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
export interface ZOptionsConfig<TCtx, TOption extends ZOption> {

  readonly options: SupportedZOptions<TCtx, TOption>;

  isOptionName?(arg: string): boolean;

}

/**
 * @internal
 */
export interface ZOptionBaseClass<TArgs extends any[]> {
  prototype: ZOption;
  new (...args: TArgs): ZOption;
}

/**
 * @internal
 */
export interface ZOptionImplClass<TOption extends ZOption, TCtx, TArgs extends any[]> {
  prototype: TOption;
  new (context: TCtx, ...args: TArgs): TOption;
}

/**
 * @internal
 */
class ZOptionImpl<TCtx, TOption extends ZOption> {

  readonly name: string;
  private readonly _valueIndex: number;
  private readonly _numValues: () => number;

  private _recognizedUpto!: number;
  private _deferred?: ZOptionReader<TOption>;
  private readonly _allDeferred: ZOptionReader<TOption>[] = [];

  recognized?: readonly string[];
  private _whenRecognized: (values: readonly string[]) => void = noop;

  constructor(
      parser: ZOptionsParser<TCtx, TOption>,
      readonly args: readonly string[],
      readonly argIndex: number,
  ) {
    this.name = args[argIndex];
    this._valueIndex = argIndex + 1;

    const { isOptionName } = parser;

    this._numValues = lazyValue(() => {

      let i = this._valueIndex;

      while (i < args.length) {
        if (isOptionName(args[i])) {
          break;
        }
        ++i;
      }

      return i - this._valueIndex;
    });
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
      this.recognized = this.args.slice(this._valueIndex, this._recognizedUpto);
    }
  }

  async done(option: TOption): Promise<number> {
    for (const deferred of this._allDeferred) {
      await deferred(option);
    }
    if (this.recognized) {
      this._whenRecognized(this.recognized);
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

    const numValues = this._numValues();

    if (max == null || max < 0) {
      max = numValues;
    } else if (!rest && max > numValues) {
      max = numValues;
    }

    this._recognize(this._valueIndex + max);

    return this.args.slice(this._valueIndex, this._valueIndex + max);
  }

  private _recognize(upto: number): void {
    this._recognizedUpto = upto;
    this._deferred = undefined;
  }

  defer(whenRecognized?: ZOptionReader<TOption>): void {
    this._deferred = whenRecognized;
  }

  whenRecognized(receiver: (values: readonly string[]) => void): void {

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
class ZOptionBase<TCtx, TOption extends ZOption> implements ZOption {

  constructor(private readonly _impl: ZOptionImpl<TCtx, TOption>) {
  }

  get name(): string {
    return this._impl.name;
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

  whenRecognized(receiver: (this: void, values: readonly string[]) => void): void {
    this._impl.whenRecognized(receiver);
  }

}
