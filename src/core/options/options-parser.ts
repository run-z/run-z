/**
 * @packageDocumentation
 * @module run-z
 */
import { lazyValue, noop } from '@proc7ts/primitives';
import type { ZSetup } from '../setup';
import type { SupportedZOptions, ZOptionReader, ZOptionsMap, ZOptionsSupport } from './option';
import { ZOptionSource } from './option';
import { UnknownZOptionError } from './unknown-option-error';

export abstract class ZOptionsParser<TCtx, TSrc extends ZOptionSource> {

  private readonly _optionsSupport: ZOptionsSupport<TCtx, TSrc>;

  protected constructor(
      readonly setup: ZSetup,
      supportedOptions: SupportedZOptions<TCtx, TSrc>[],
  ) {
    this._optionsSupport = context => supportedZOptionsMap(context, supportedOptions);
  }

  async parseOptions(context: TCtx, args: readonly string[]): Promise<void> {

    const readers = await this._optionsSupport(context);
    const recognitions = new Map<string, ZOptionRecognition<TSrc>>();

    for (let optionIndex = 0; optionIndex < args.length;) {

      let recognizedUpto!: number;
      let whenRecognized: ZOptionReader<TSrc> | undefined;
      let source: TSrc; // eslint-disable-line prefer-const

      const [baseClass, done] = baseZOptionSource(
          this.setup,
          args,
          optionIndex,
          {
            recognize(upto) {
              recognizedUpto = upto;
              whenRecognized = undefined;
            },
            skip(when) {
              source.values(); // Mark all arguments recognized
              whenRecognized = when as ZOptionReader<any>;
            },
          },
      );
      const sourceClass = this.sourceClass(baseClass);

      source = new sourceClass(context);

      const { option } = source;

      if (!readers[option]) {
        throw new UnknownZOptionError(option);
      }

      source.values(); // Recognize all arguments by default

      await readers[option]!(source);

      let recognition = recognitions.get(option);

      if (!recognition) {
        recognition = new ZOptionRecognition();
        recognitions.set(option, recognition);
      }

      if (whenRecognized) {
        recognition.whenRead.then(whenRecognized, noop);
      } else {
        done(args.slice(optionIndex + 1, recognizedUpto));
        recognition.set(Promise.resolve(source));
      }

      optionIndex = recognizedUpto;
    }
  }

  abstract sourceClass(base: typeof ZOptionSource): new (context: TCtx) => TSrc;

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
function baseZOptionSource(
    { taskParser }: ZSetup,
    args: readonly string[],
    optionIndex: number,
    {
      recognize,
      skip,
    }: {
      recognize(upto: number): void;
      skip<TSrc extends ZOptionSource>(reader: ZOptionReader<TSrc>): void;
    },
): [typeof ZOptionSource, (values: readonly string[]) => void] {

  const firstValueIndex = optionIndex + 1;
  const option = args[optionIndex];
  const numValues = lazyValue(() => {

    let i = firstValueIndex;

    while (i < args.length) {
      if (taskParser.isOption(args[i])) {
        break;
      }
      ++i;
    }

    return i - firstValueIndex;
  });

  let recognized: readonly string[] | undefined;
  let done = (values: readonly string[]): void => {
    recognized = values;
  };

  class BaseZOptionSource extends ZOptionSource {

    constructor() {
      super();

      const prevDone = done;

      done = values => {
        prevDone(values);
        this.recognized(values);
        done = noop;
      };
    }

    get option(): string {
      return option;
    }

    values(numArgs?: number): readonly string[] {
      if (recognized) {
        return recognized;
      }

      if (numArgs == null || numArgs < 0) {
        numArgs = numValues();
      }

      recognize(firstValueIndex + numArgs);

      return args.slice(firstValueIndex, firstValueIndex);
    }

    rest(): readonly string[] {
      if (recognized) {
        return recognized;
      }

      recognize(args.length);

      return args.slice(firstValueIndex);
    }

    skip(whenRecognized: ZOptionReader<this> = noop): void {
      skip(whenRecognized);
    }

  }

  return [BaseZOptionSource, done];
}

/**
 * @internal
 */
async function supportedZOptionsMap<TCtx, TSrc extends ZOptionSource>(
    context: TCtx,
    supportedOptions: SupportedZOptions<TCtx, TSrc>[],
): Promise<ZOptionsMap<TSrc>> {

  const result: Partial<Record<string, ZOptionReader<TSrc, any>>> = {};

  for (const supported of supportedOptions) {

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
