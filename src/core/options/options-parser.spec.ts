import { asis, noop } from '@proc7ts/primitives';
import { ZOptionSource } from './option';
import { ZOptionSourceBase, ZOptionsParser } from './options-parser.impl';
import { UnknownZOptionError } from './unknown-option-error';

describe('ZOptionsParser', () => {

  let recognized: Record<string, readonly string[]>;

  abstract class TestSource extends ZOptionSource {
  }

  class TestParser extends ZOptionsParser<null, TestSource> {

    sourceClass<TArgs extends any[]>(
        base: ZOptionSourceBase.Class<TArgs>,
    ): ZOptionSourceBase.ImplClass<TestSource, null, TArgs> {

      class TestSourceImpl extends base {

        constructor(_context: null, ...args: TArgs) {
          super(...args);
        }

        recognized(values: readonly string[]): void {
          recognized[this.option] = values;
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
    const parser = new TestParser({
      '--test': source => {
        values = source.values();
      },
      '--end': noop,
    });

    await parser.parseOptions(null, ['--test', 'val1', 'val2', '--end']);

    expect(values).toEqual(['val1', 'val2']);
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
  it('defers option recognition', async () => {

    let deferred: readonly string[] | undefined;
    let values: readonly string[] | undefined;
    const parser = new TestParser([
      {
        '--test': source => {
          source.defer(d => {
            deferred = d.values();
          });
        },
      },
      {
        '--test': source => {
          values = source.values(1);
        },
        end: noop,
      },
    ]);

    await parser.parseOptions(null, ['--test', 'val', 'end']);

    expect(values).toEqual(['val']);
    expect(deferred).toEqual(['val']);
    expect(recognized).toEqual({
      '--test': ['val'],
      end: [],
    });
  });
  it('accepts already recognized option', async () => {

    let values: readonly string[] | undefined;
    let deferred: readonly string[] | undefined;
    let accepted: readonly string[] | undefined;
    const parser = new TestParser([
      {
        '--test': source => {
          values = source.values(1);
        },
        end: noop,
      },
      {
        '--test': source => {
          accepted = source.values();
          source.defer(d => {
            deferred = d.values();
          });
        },
      },
    ]);

    await parser.parseOptions(null, ['--test', 'val', 'end']);

    expect(values).toEqual(['val']);
    expect(accepted).toEqual(['val']);
    expect(deferred).toEqual(['val']);
    expect(recognized).toEqual({
      '--test': ['val'],
      end: [],
    });
  });
});
