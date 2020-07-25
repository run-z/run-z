/**
 * @packageDocumentation
 * @module run-z
 */
import { arrayOfElements, lazyValue, noop } from '@proc7ts/primitives';
import type { ZSetup } from '../setup';
import type { SupportedZOptions, ZOptionReader, ZOptionsMap, ZOptionsSupport } from './option';
import { ZOptionSource } from './option';
import { UnknownZOptionError } from './unknown-option-error';

export interface ZOptionSourceBaseClass<TArgs extends any[]> {
  prototype: ZOptionSource;
  new (...args: TArgs): ZOptionSource;
}

export interface ZOptionSourceImplClass<TSrc extends ZOptionSource, TCtx, TArgs extends any[]> {
  prototype: TSrc;
  new (context: TCtx, ...args: TArgs): TSrc;
}


export abstract class ZOptionsParser<TCtx, TSrc extends ZOptionSource> {

  private readonly _optionsSupport: ZOptionsSupport<TCtx, TSrc>;
  private readonly _sourceClass: ZOptionSourceImplClass<TSrc, TCtx, [ZOptionSourceImpl<TSrc>]>;

  protected constructor(
      readonly setup: ZSetup,
      supportedOptions: SupportedZOptions<TCtx, TSrc>,
  ) {
    this._optionsSupport = context => supportedZOptionsMap(context, supportedOptions);
    this._sourceClass = this.sourceClass(ZOptionSourceBase as ZOptionSourceBaseClass<any>);
  }

  async parseOptions(context: TCtx, args: readonly string[]): Promise<void> {

    const readers = await this._optionsSupport(context);
    const recognitions = new Map<string, ZOptionRecognition<TSrc>>();

    for (let argIndex = 0; argIndex < args.length;) {

      const impl = new ZOptionSourceImpl<TSrc>(this.setup, args, argIndex);
      const { option } = impl;

      if (!readers[option]) {
        throw new UnknownZOptionError(option);
      }

      const source = new this._sourceClass(context, impl);

      source.values(); // Recognize all arguments by default

      await readers[option]!(source);

      argIndex = impl.done(source, recognitions);
    }
  }

  abstract sourceClass<TArgs extends any[]>(
      base: ZOptionSourceBaseClass<TArgs>,
  ): ZOptionSourceImplClass<TSrc, TCtx, TArgs>;

}

/**
 * @internal
 */
class ZOptionRecognition<TSrc extends ZOptionSource> {

  readonly whenRead: Promise<TSrc>;
  readonly set: (by: Promise<TSrc>) => void;

  constructor() {

    let set: (by: Promise<TSrc>) => void;

    this.whenRead = new Promise<TSrc>(
        (resolve, reject) => set = by => by.then(resolve, reject),
    );

    this.set = set!;
  }

}

/**
 * @internal
 */
class ZOptionSourceImpl<TSrc extends ZOptionSource> {

  readonly option: string;
  private _recognizedUpto!: number;
  private _whenRecognized?: ZOptionReader<TSrc>;
  private _recognized?: readonly string[];
  private _whenDone: (values: readonly string[]) => void = noop;
  readonly numValues: () => number;

  constructor(
      readonly setup: ZSetup,
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
    this._whenRecognized = undefined;
  }

  skip(whenRecognized?: ZOptionReader<TSrc>): void {
    this.values(); // Mark all arguments recognized
    this._whenRecognized = whenRecognized;
  }

  whenDone(done: (values: readonly string[]) => void): void {
    this._whenDone = done;
  }

  done(source: TSrc, recognitions: Map<string, ZOptionRecognition<TSrc>>): number {

    let recognition = recognitions.get(this.option);

    if (!recognition) {
      recognition = new ZOptionRecognition();
      recognitions.set(this.option, recognition);
    }

    if (this._whenRecognized) {
      recognition.whenRead.then(this._whenRecognized, noop);
    } else {
      this._recognized = this.args.slice(this.argIndex + 1, this._recognizedUpto);
      this._whenDone(this._recognized);
      recognition.set(Promise.resolve(source));
    }

    return this._recognizedUpto;
  }

}

/**
 * @internal
 */
class ZOptionSourceBase<TSrc extends ZOptionSource> extends ZOptionSource {

  constructor(private readonly _impl: ZOptionSourceImpl<TSrc>) {
    super();
    _impl.whenDone(values => this.recognized(values));
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

  skip(whenRecognized?: ZOptionReader<this>): void {
    this._impl.skip(whenRecognized as ZOptionReader<any>);
  }

}

/**
 * @internal
 */
async function supportedZOptionsMap<TCtx, TSrc extends ZOptionSource>(
    context: TCtx,
    supportedOptions: SupportedZOptions<TCtx, TSrc>,
): Promise<ZOptionsMap<TSrc>> {

  const result: Partial<Record<string, ZOptionReader<TSrc, any>>> = {};

  for (const supported of arrayOfElements(supportedOptions)) {

    const map: ZOptionsMap<TSrc> = typeof supported === 'function'
        ? await supported(context)
        : supported;

    for (const [option, reader] of Object.entries(map)) {
      if (!reader) {
        continue;
      }

      const existing = result[option];

      result[option] = existing
          ? mergeZOptionReaders(existing, reader.bind(map))
          : reader;
    }
  }

  return result;
}

/**
 * @internal
 */
function mergeZOptionReaders<TSrc extends ZOptionSource>(
    first: ZOptionReader<TSrc>,
    second: ZOptionReader<TSrc>,
): ZOptionReader<TSrc> | undefined {
  return async source => {
    await first(source);
    await second(source);
  };
}
