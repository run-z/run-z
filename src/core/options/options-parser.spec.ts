import { asis, noop, valueProvider } from '@proc7ts/primitives';
import type { ZOptionSource } from './option';
import { ZOptionSourceBaseClass, ZOptionSourceImplClass, ZOptionsParser } from './options-parser.impl';
import { UnknownZOptionError } from './unknown-option-error';

describe('ZOptionsParser', () => {

  let recognized: Record<string, readonly string[]>;

  type TestSource = ZOptionSource;

  class TestParser extends ZOptionsParser<null, TestSource> {

    sourceClass<TArgs extends any[]>(
        base: ZOptionSourceBaseClass<TArgs>,
    ): ZOptionSourceImplClass<TestSource, null, TArgs> {

      class TestSourceImpl extends base implements TestSource {

        constructor(_context: null, ...args: TArgs) {
          super(...args);
          this.whenRecognized(values => {
            recognized[this.option] = values;
          });
        }

      }

      return TestSourceImpl;
    }

  }

  beforeEach(() => {
    recognized = {};
  });

  it('recognizes option without values', async () => {

    let values: readonly string[] | undefined;

    const parser = new TestParser({
      '--test': source => {
        values = source.values();
      },
    });

    await parser.parseOptions(null, ['--test']);

    expect(values).toHaveLength(0);
    expect(recognized).toEqual({
      '--test': [],
    });
  });
  it('recognizes option with value', async () => {

    let values: readonly string[] | undefined;

    const parser = new TestParser({
      '--test': source => {
        values = source.values();
      },
    });

    await parser.parseOptions(null, ['--test', 'val']);

    expect(values).toEqual(['val']);
    expect(recognized).toEqual({
      '--test': ['val'],
    });
  });
  it('recognizes option with multiple values', async () => {

    let values: readonly string[] | undefined;
    let rest: readonly string[] | undefined;
    const parser = new TestParser({
      '--test': source => {
        rest = source.rest();
        values = source.values();
      },
      '--end': source => {
        source.rest();
      },
    });

    await parser.parseOptions(null, ['--test', 'val1', 'val2', '--end']);

    expect(values).toEqual(['val1', 'val2']);
    expect(rest).toEqual(['val1', 'val2', '--end']);
    expect(recognized).toEqual({
      '--test': ['val1', 'val2'],
      '--end': [],
    });
  });
  it('recognizes option with up to the max values', async () => {

    let values: readonly string[] | undefined;
    let rest: readonly string[] | undefined;
    const parser = new TestParser({
      '--test': source => {
        rest = source.rest();
        values = source.values(13);
      },
      '--end': source => {
        source.rest();
      },
    });

    await parser.parseOptions(null, ['--test', 'val1', 'val2', '--end']);

    expect(values).toEqual(['val1', 'val2']);
    expect(rest).toEqual(['val1', 'val2', '--end']);
    expect(recognized).toEqual({
      '--test': ['val1', 'val2'],
      '--end': [],
    });
  });
  it('throws on unrecognized option', async () => {

    const parser = new TestParser({});
    const error = await parser.parseOptions(null, ['--option']).catch(asis);

    expect(error).toBeInstanceOf(UnknownZOptionError);
    expect(error.optionName).toBe('--option');
    expect(recognized).toEqual({});
  });
  it('accepts supported options provider', async () => {

    let values: readonly string[] | undefined;

    const parser = new TestParser(valueProvider({
      '--test': source => {
        values = source.values();
      },
    }));

    await parser.parseOptions(null, ['--test', 'val']);

    expect(values).toEqual(['val']);
    expect(recognized).toEqual({
      '--test': ['val'],
    });
  });
  it('ignores undefined option reader', async () => {

    let values: readonly string[] | undefined;

    const parser = new TestParser([
      {
        '--test': source => {
          values = source.values();
        },
      },
      {
        '--test': undefined,
      },
    ]);

    await parser.parseOptions(null, ['--test', 'val']);

    expect(values).toEqual(['val']);
    expect(recognized).toEqual({
      '--test': ['val'],
    });
  });
  it('defers option recognition', async () => {

    let deferred: readonly string[] | undefined;
    let restDeferred: readonly string[] | undefined;
    let values: readonly string[] | undefined;
    const parser = new TestParser([
      {
        '--test': source => {
          source.defer(d => {
            deferred = d.values();
            restDeferred = d.rest();
          });
        },
      },
      {
        '--test': source => {
          values = source.values(1);
        },
        end: source => {
          source.rest();
        },
      },
    ]);

    await parser.parseOptions(null, ['--test', 'val', 'end']);

    expect(values).toEqual(['val']);
    expect(deferred).toEqual(['val']);
    expect(restDeferred).toEqual(['val']);
    expect(recognized).toEqual({
      '--test': ['val'],
      end: [],
    });
  });
  it('accepts already recognized option', async () => {

    let values: readonly string[] | undefined;
    let deferred: readonly string[] | undefined;
    let restDeferred: readonly string[] | undefined;
    let accepted: readonly string[] | undefined;
    const parser = new TestParser([
      {
        '--test': source => {
          values = source.values(1);
        },
        end: source => {
          source.rest();
        },
      },
      {
        '--test': source => {
          accepted = source.values();
          source.defer(d => {
            deferred = d.values();
            restDeferred = d.rest();
          });
        },
      },
    ]);

    await parser.parseOptions(null, ['--test', 'val', 'end']);

    expect(values).toEqual(['val']);
    expect(accepted).toEqual(['val']);
    expect(deferred).toEqual(['val']);
    expect(restDeferred).toEqual(['val']);
    expect(recognized).toEqual({
      '--test': ['val'],
      end: [],
    });
  });
  it('defers the rest-valued option recognition', async () => {

    let firstDeferred: readonly string[] | undefined;
    let allDeferred: readonly string[] | undefined;
    let values: readonly string[] | undefined;
    const parser = new TestParser([
      {
        '--test': source => {
          source.defer(d => {
            allDeferred = d.values();
            firstDeferred = d.values(1);
          });
        },
      },
      {
        '--test': source => {
          values = source.rest();
        },
        end: noop,
      },
    ]);

    await parser.parseOptions(null, ['--test', 'val', 'end']);

    expect(values).toEqual(['val', 'end']);
    expect(firstDeferred).toEqual(['val']);
    expect(allDeferred).toEqual(['val', 'end']);
    expect(recognized).toEqual({
      '--test': ['val', 'end'],
    });
  });
  it('throws when option recognition deferred, but not complete', async () => {

    const parser = new TestParser({
      '--test': source => {
        source.defer(noop);
      },
    });
    const error = await parser.parseOptions(null, ['--test']).catch(asis);

    expect(error).toBeInstanceOf(UnknownZOptionError);
    expect(error.optionName).toBe('--test');
  });
  it('throws when option reader does nothing', async () => {

    const parser = new TestParser({
      '--test': noop,
    });
    const error = await parser.parseOptions(null, ['--test']).catch(asis);

    expect(error).toBeInstanceOf(UnknownZOptionError);
    expect(error.optionName).toBe('--test');
  });
  it('does not throws when option reader does nothing after option recognition', async () => {

    const parser = new TestParser([
      {
        '--test': source => {
          source.rest();
        },
      },
      {
        '--test': noop,
      },
    ]);

    await parser.parseOptions(null, ['--test', '1', '2']);

    expect(recognized).toEqual({
      '--test': ['1', '2'],
    });
  });
});
