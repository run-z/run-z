/**
 * @packageDocumentation
 * @module run-z
 */
import { arrayOfElements, noop } from '@proc7ts/primitives';
import type { SupportedZOptions, ZOption, ZOptionReader } from './option';
import type { ZOptionInput } from './option-input';
import { ZOptionPuller } from './option-puller';
import { UnknownZOptionError } from './unknown-option-error';

/**
 * @internal
 */
export abstract class ZOptionsParser<TCtx, TOption extends ZOption> {

  private readonly _config: ZOptionsConfig<TCtx, TOption>;
  private _options?: (this: void, context: TCtx) => Promise<Map<string, ZOptionReader<TOption>[]>>;
  private _puller?: ZOptionPuller;
  private _optClass?: ZOptionImplClass<TOption, TCtx, [ZOptionImpl<TOption>]>;

  constructor(config: ZOptionsConfig<TCtx, TOption>) {
    this._config = config;
  }

  private get options(): (this: void, context: TCtx) => Promise<Map<string, ZOptionReader<TOption>[]>> {
    if (this._options) {
      return this._options;
    }
    return this._options = context => supportedZOptionsMap(context, this._config.options);
  }

  private get optClass(): ZOptionImplClass<TOption, TCtx, [ZOptionImpl<TOption>]> {
    if (this._optClass) {
      return this._optClass;
    }
    return this._optClass = this.optionClass(ZOptionBase as ZOptionBaseClass<any>);
  }

  private get puller(): ZOptionPuller {
    if (this._puller) {
      return this._puller;
    }

    const { puller } = this._config;

    return this._puller = puller ? ZOptionPuller.by(puller) : ZOptionPuller.default;
  }

  async parseOptions(
      context: TCtx,
      args: readonly string[],
      fromIndex = 0,
  ): Promise<void> {

    const options = await this.options(context);
    const optionClass = this.optClass;
    const puller = this.puller;

    for (let argIndex = Math.max(0, fromIndex); argIndex < args.length;) {

      const impl = new ZOptionImpl<TOption>(args, argIndex);
      const option = new optionClass(context, impl);
      const inputs = puller(impl.tail);

      for (const input of inputs) {
        args = impl.setInput(input);

        const { key = input.name } = input;
        const readers: ZOptionReader<TOption>[] = options.get(key) || [];

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

  readonly puller?: ZOptionPuller | readonly ZOptionPuller[];

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
class ZOptionImpl<TOption extends ZOption> {

  private readonly _head: readonly string[];
  private _name!: string;
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

  get tail(): readonly [string, ...string[]] {
    return this.args.slice(this.argIndex) as readonly string[] as readonly [string, ...string[]];
  }

  setInput(input: ZOptionInput): readonly string[] {

    const { name, values = [], tail = [] } = input;

    this._name = name;
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
