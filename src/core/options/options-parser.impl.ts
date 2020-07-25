/**
 * @packageDocumentation
 * @module run-z
 */
import { arrayOfElements, lazyValue, noop } from '@proc7ts/primitives';
import type { SupportedZOptions, ZOptionReader, ZOptionSource } from './option';
import { UnknownZOptionError } from './unknown-option-error';

/**
 * @internal
 */
export abstract class ZOptionsParser<TCtx, TSrc extends ZOptionSource> {

  private readonly _options: (this: void, context: TCtx) => Promise<Map<string, ZOptionReader<TSrc>[]>>;
  private readonly _sourceClass: ZOptionSourceImplClass<TSrc, TCtx, [ZOptionSourceImpl<TSrc>]>;

  constructor(supportedOptions: SupportedZOptions<TCtx, TSrc>) {
    this._options = context => supportedZOptionsMap(context, supportedOptions);
    this._sourceClass = this.sourceClass(ZOptionSourceBase$ as ZOptionSourceBaseClass<any>);
  }

  async parseOptions(
      context: TCtx,
      args: readonly string[],
      fromIndex = 0,
  ): Promise<void> {

    const options = await this._options(context);

    for (let argIndex = Math.max(0, fromIndex); argIndex < args.length;) {

      const impl = new ZOptionSourceImpl<TSrc>(args, argIndex);
      const { option } = impl;
      const readers = options.get(option);

      if (!readers) {
        throw new UnknownZOptionError(option);
      }

      const source = new this._sourceClass(context, impl);

      source.values(); // Recognize all arguments by default

      for (const reader of readers) {
        await impl.read(source, reader);
      }

      argIndex = await impl.done(source);
    }
  }

  abstract sourceClass<TArgs extends any[]>(
      base: ZOptionSourceBaseClass<TArgs>,
  ): ZOptionSourceImplClass<TSrc, TCtx, TArgs>;

}

/**
 * @internal
 */
class ZOptionSourceImpl<TSrc extends ZOptionSource> {

  readonly option: string;
  private _recognizedUpto!: number;
  private _deferred?: ZOptionReader<TSrc>;
  private readonly _allDeferred: ZOptionReader<TSrc>[] = [];
  private _recognized?: readonly string[];
  private _whenRecognized: (values: readonly string[]) => void = noop;
  readonly numValues: () => number;

  constructor(
      readonly args: readonly string[],
      readonly argIndex: number,
  ) {
    this.option = args[argIndex];

    const firstValueIndex = argIndex + 1;

    this.numValues = lazyValue(() => {

      let i = firstValueIndex;

      while (i < args.length) {
        if (args[i].startsWith('-')) {
          break;
        }
        ++i;
      }

      return i - firstValueIndex;
    });
  }

  async read(source: TSrc, reader: ZOptionReader<TSrc>): Promise<void> {
    await reader(source);

    const deferred = this._deferred;

    if (deferred) {
      this._allDeferred.push(deferred);
    } else if (!this._recognized) {
      this._recognized = this.args.slice(this.argIndex + 1, this._recognizedUpto);
    }
  }

  async done(source: TSrc): Promise<number> {
    for (const deferred of this._allDeferred) {
      await deferred(source);
    }
    if (this._recognized) {
      this._whenRecognized(this._recognized);
    }
    return this._recognizedUpto;
  }

  values(numArgs?: number): readonly string[] {
    if (this._recognized) {
      return this._recognized;
    }

    if (numArgs == null || numArgs < 0) {
      numArgs = this.numValues();
    }

    const firstValueIndex = this.argIndex + 1;

    this.recognize(firstValueIndex + numArgs);

    return this.args.slice(firstValueIndex, firstValueIndex + numArgs);
  }

  recognize(upto: number): void {
    this._recognizedUpto = upto;
    this._deferred = undefined;
  }

  defer(whenRecognized?: ZOptionReader<TSrc>): void {
    this.values(); // Mark all arguments recognized
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
async function supportedZOptionsMap<TCtx, TSrc extends ZOptionSource>(
    context: TCtx,
    supportedOptions: SupportedZOptions<TCtx, TSrc>,
): Promise<Map<string, ZOptionReader<TSrc>[]>> {

  const result = new Map<string, ZOptionReader<TSrc>[]>();

  for (const supported of arrayOfElements(supportedOptions)) {

    const map: SupportedZOptions.Map<TSrc> = typeof supported === 'function'
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
export interface ZOptionSourceBaseClass<TArgs extends any[]> {
  prototype: ZOptionSource;
  new (...args: TArgs): ZOptionSource;
}

export interface ZOptionSourceImplClass<TSrc extends ZOptionSource, TCtx, TArgs extends any[]> {
  prototype: TSrc;
  new (context: TCtx, ...args: TArgs): TSrc;
}

/**
 * @internal
 */
class ZOptionSourceBase$<TSrc extends ZOptionSource> implements ZOptionSource {

  constructor(private readonly _impl: ZOptionSourceImpl<TSrc>) {
  }

  get option(): string {
    return this._impl.option;
  }

  values(numArgs?: number): readonly string[] {
    return this._impl.values(numArgs);
  }

  rest(): readonly string[] {
    return this.values(this._impl.args.length);
  }

  defer(whenRecognized?: ZOptionReader<this>): void {
    this._impl.defer(whenRecognized as ZOptionReader<any>);
  }

  whenRecognized(receiver: (this: void, values: readonly string[]) => void): void {
    this._impl.whenRecognized(receiver);
  }

}
