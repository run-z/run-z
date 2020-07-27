import { asis, noop, valueProvider } from '@proc7ts/primitives';
import type { SupportedZOptions, ZOption, ZOptionReader } from './option';
import { ZOptionPuller } from './option-puller';
import { ZOptionBaseClass, ZOptionImplClass, ZOptionsParser } from './options-parser.impl';
import { UnknownZOptionError } from './unknown-option-error';

describe('ZOptionsParser', () => {

  let recognized: Record<string, string[]>;

  type TestOption = ZOption;

  class TestParser extends ZOptionsParser<null, TestOption> {

    optionClass<TArgs extends any[]>(
        base: ZOptionBaseClass<TArgs>,
    ): ZOptionImplClass<TestOption, null, TArgs> {

      class TestSourceImpl extends base implements TestOption {

        constructor(_context: null, ...args: TArgs) {
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

      return TestSourceImpl;
    }

  }

  beforeEach(() => {
    recognized = {};
  });

  it('recognizes option without values', async () => {

    let values: readonly string[] | undefined;

    const parser = new TestParser({
      options: {
        '--test': option => {
          values = option.values();
        },
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
      options: {
        '--test': option => {
          values = option.values();
        },
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
      options: {
        '--test': option => {
          rest = option.rest();
          values = option.values();
        },
        '--end': option => {
          option.rest();
        },
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
      options: {
        '--test': option => {
          rest = option.rest();
          values = option.values(13);
        },
        '--end': option => {
          option.rest();
        },
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

    const parser = new TestParser({ options: {} });
    const error = await parser.parseOptions(null, ['--option']).catch(asis);

    expect(error).toBeInstanceOf(UnknownZOptionError);
    expect(error.optionName).toBe('--option');
    expect(recognized).toEqual({});
  });
  it('accepts supported options provider', async () => {

    let values: readonly string[] | undefined;

    const parser = new TestParser({
      options: valueProvider({
        '--test': option => {
          values = option.values();
        },
      }),
    });

    await parser.parseOptions(null, ['--test', 'val']);

    expect(values).toEqual(['val']);
    expect(recognized).toEqual({
      '--test': ['val'],
    });
  });
  it('ignores undefined option reader', async () => {

    let values: readonly string[] | undefined;

    const parser = new TestParser({
      options: [
        {
          '--test': option => {
            values = option.values();
          },
        },
        {
          '--test': undefined,
        },
      ],
    });

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
    const parser = new TestParser({
      options: [
        {
          '--test': option => {
            option.defer(d => {
              deferred = d.values();
              restDeferred = d.rest();
            });
          },
        },
        {
          '--test': option => {
            values = option.values(1);
          },
          end: option => {
            option.rest();
          },
        },
      ],
    });

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
    const parser = new TestParser({
      options: [
        {
          '--test': option => {
            values = option.values(1);
          },
          end: option => {
            option.rest();
          },
        },
        {
          '--test': option => {
            accepted = option.values();
            option.defer(d => {
              deferred = d.values();
              restDeferred = d.rest();
            });
          },
        },
      ],
    });

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
    const parser = new TestParser({
      options: [
        {
          '--test': option => {
            option.defer(d => {
              allDeferred = d.values();
              firstDeferred = d.values(1);
            });
          },
        },
        {
          '--test': option => {
            values = option.rest();
          },
          end: noop,
        },
      ],
    });

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
      options: {
        '--test': option => {
          option.defer(noop);
        },
      },
    });
    const error = await parser.parseOptions(null, ['--test']).catch(asis);

    expect(error).toBeInstanceOf(UnknownZOptionError);
    expect(error.optionName).toBe('--test');
  });
  it('throws when option reader does nothing', async () => {

    const parser = new TestParser({
      options: {
        '--test': noop,
      },
    });
    const error = await parser.parseOptions(null, ['--test']).catch(asis);

    expect(error).toBeInstanceOf(UnknownZOptionError);
    expect(error.optionName).toBe('--test');
  });
  it('does not throw when option reader does nothing before option recognition', async () => {

    const parser = new TestParser({
      options: [
        {
          '--test': noop,
        },
        {
          '--test': option => {
            option.rest();
          },
        },
      ],
    });

    await parser.parseOptions(null, ['--test', '1', '2']);

    expect(recognized).toEqual({
      '--test': ['1', '2'],
    });
  });
  it('does not throw when option reader does nothing after option recognition', async () => {

    const parser = new TestParser({
      options: [
        {
          '--test': option => {
            option.rest();
          },
        },
        {
          '--test': noop,
        },
      ],
    });

    await parser.parseOptions(null, ['--test', '1', '2']);

    expect(recognized).toEqual({
      '--test': ['1', '2'],
    });
  });

  describe('pulling', () => {
    it('retries pulling with a replacement', async () => {

      const parser = new TestParser({
        options: [
          {
            '--test': option => {
              option.rest();
            },
            '--*': option => {
              option.values();
            },
          },
        ],
        puller: [
          ([name]) => name === '--test' ? [{ name: '--replaced', retry: true }] : [],
          ZOptionPuller.long,
        ],
      });

      await parser.parseOptions(null, ['--test', '1', '2']);

      expect(recognized).toEqual({
        '--replaced': [],
      });
    });
    it('retries pulling with replacement args', async () => {

      const parser = new TestParser({
        options: [
          {
            '--test': option => {
              option.rest();
            },
            '--*': option => {
              option.values();
            },
          },
        ],
        puller: [
          ([name]) => name === '--test' ? [{ name: '--replaced', values: ['r'], tail: ['t'], retry: true }] : [],
          ZOptionPuller.long,
        ],
      });

      await parser.parseOptions(null, ['--test', '1', '2']);

      expect(recognized).toEqual({
        '--replaced': ['r', 't'],
      });
    });
    it('prevents retry pulling retry after option recognition', async () => {

      const parser = new TestParser({
        options: [
          {
            '--test': option => {
              option.rest();
            },
            '--*': option => {
              option.rest();
            },
          },
        ],
        puller: [
            ZOptionPuller.long,
            () => [{ name: '--replaced', retry: true }],
        ],
      });

      await parser.parseOptions(null, ['--test', '1', '2']);

      expect(recognized).toEqual({
        '--test': ['1', '2'],
      });
    });
  });

  describe('fallback reader', () => {

    let readShort: jest.Mock<ReturnType<ZOptionReader<TestOption>>, Parameters<ZOptionReader<TestOption>>>;
    let defaultShort: string | undefined;

    let readLong: jest.Mock<ReturnType<ZOptionReader<TestOption>>, Parameters<ZOptionReader<TestOption>>>;
    let defaultLong: string | undefined;

    let readPositional: jest.Mock<ReturnType<ZOptionReader<TestOption>>, Parameters<ZOptionReader<TestOption>>>;
    let defaultPositional: string | undefined;

    function newParser(options: SupportedZOptions.Map<TestOption> = {}): TestParser {
      return new TestParser({
        options: {
          ...options,
          '--*': readLong,
          '-*': readShort,
          '*': readPositional,
        },
      });
    }

    beforeEach(() => {
      readLong = jest.fn(option => {
        defaultLong = option.name;
        option.values();
      });
      defaultLong = undefined;

      readShort = jest.fn(option => {
        defaultShort = option.name;
        option.values();
      });
      defaultShort = undefined;

      readPositional = jest.fn(option => {
        defaultPositional = option.name;
        option.values();
      });
      defaultPositional = undefined;
    });

    it('reads unrecognized long option with fallback reader', async () => {

      const parser = newParser();

      await parser.parseOptions(null, ['--test']);

      expect(readLong).toHaveBeenCalledTimes(1);
      expect(defaultLong).toBe('--test');

      expect(readShort).not.toHaveBeenCalled();

      expect(readPositional).not.toHaveBeenCalled();
      expect(defaultPositional).toBeUndefined();
    });
    it('reads unrecognized short option with fallback reader', async () => {

      const parser = newParser();

      await parser.parseOptions(null, ['-t']);

      expect(readShort).toHaveBeenCalledTimes(1);
      expect(defaultShort).toBe('-t');

      expect(readLong).not.toHaveBeenCalled();

      expect(readPositional).not.toHaveBeenCalled();
      expect(defaultPositional).toBeUndefined();
    });
    it('reads unrecognized positional option with fallback reader', async () => {

      const parser = newParser();

      await parser.parseOptions(null, ['test']);

      expect(readShort).not.toHaveBeenCalled();

      expect(readLong).not.toHaveBeenCalled();
      expect(defaultLong).toBeUndefined();

      expect(readPositional).toHaveBeenCalledTimes(1);
      expect(defaultPositional).toBe('test');
    });
    it('reads unrecognized long option with positional fallback reader if long one defers', async () => {
      readLong.mockImplementation(option => {
        option.defer(({ name }) => {
          defaultLong = name;
        });
      });

      const parser = newParser();

      await parser.parseOptions(null, ['--test']);

      expect(readShort).not.toHaveBeenCalled();

      expect(readLong).toHaveBeenCalledTimes(1);
      expect(defaultLong).toBe('--test');

      expect(readPositional).toHaveBeenCalledTimes(1);
      expect(defaultPositional).toBe('--test');
    });
    it('does not fallback if option read', async () => {

      let recognized: string | undefined;
      const parser = newParser({
        '--test': option => {
          option.rest();
          recognized = option.name;
        },
      });

      await parser.parseOptions(null, ['--test']);

      expect(recognized).toBe('--test');
      expect(defaultLong).toBeUndefined();
      expect(defaultPositional).toBeUndefined();
    });
  });

  describe('long option', () => {
    it('recognizes `--name=value` format', async () => {

      const parser = new TestParser({
        options: {
          '--test'(option) {
            option.values();
          },
          '*'(option) {
            option.rest();
          },
        },
      });

      await parser.parseOptions(null, ['--test=value', 'rest']);

      expect(recognized).toEqual({
        '--test': ['value'],
        rest: [],
      });
    });
  });

  describe('short option', () => {
    it('recognizes one-letter option without parameter', async () => {

      const parser = new TestParser({
        options: {
          '-t'(option) {
            option.values();
          },
          '*'(option) {
            option.rest();
          },
        },
      });

      await parser.parseOptions(null, ['-test']);

      expect(recognized).toEqual({
        '-t': [],
        '-est': [],
      });
    });
    it('prefers one-letter option with parameter', async () => {

      const parser = new TestParser({
        options: {
          '-t'(option) {
            option.values();
          },
          '-t*'(option) {
            option.values();
          },
        },
      });

      await parser.parseOptions(null, ['-test']);

      expect(recognized).toEqual({
        '-t': ['est'],
      });
    });
    it('prefers multi-letter option with parameter', async () => {

      const parser = new TestParser({
        options: {
          '-t*'(option) {
            option.values();
          },
          '-t'(option) {
            option.values();
          },
          '-test'(option) {
            option.values();
          },
        },
      });

      await parser.parseOptions(null, ['-test', 'some']);

      expect(recognized).toEqual({
        '-test': ['some'],
      });
    });
  });
});
