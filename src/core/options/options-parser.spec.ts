import { asis, noop, valueProvider } from '@proc7ts/primitives';
import type { ZOption, ZOptionReader } from './option';
import { ZOptionSyntax } from './option-syntax';
import { parseZOptions } from './parse-options';
import { SimpleZOptionsParser, simpleZOptionsParser } from './simple-options-parser';
import type { SupportedZOptions } from './supported-options';
import { UnknownZOptionError } from './unknown-option-error';

describe('ZOptionsParser', () => {

  it('recognizes option without values', async () => {

    let values: readonly string[] | undefined;

    const parser = simpleZOptionsParser({
      options: {
        '--test': option => {
          values = option.values();
        },
      },
    });

    const recognized = await parser(['--test']);

    expect(values).toHaveLength(0);
    expect(recognized).toEqual({
      '--test': [],
    });
  });
  it('recognizes option with value', async () => {

    let values: readonly string[] | undefined;

    const parser = simpleZOptionsParser({
      options: {
        '--test': option => {
          values = option.values();
        },
      },
    });

    const recognized = await parser(['--test', 'val']);

    expect(values).toEqual(['val']);
    expect(recognized).toEqual({
      '--test': ['val'],
    });
  });
  it('recognizes option with multiple values', async () => {

    let values: readonly string[] | undefined;
    let rest: readonly string[] | undefined;
    const parser = simpleZOptionsParser({
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

    const recognized = await parser(['--test', 'val1', 'val2', '--end']);

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
    const parser = simpleZOptionsParser({
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

    const recognized = await parser(['--test', 'val1', 'val2', '--end']);

    expect(values).toEqual(['val1', 'val2']);
    expect(rest).toEqual(['val1', 'val2', '--end']);
    expect(recognized).toEqual({
      '--test': ['val1', 'val2'],
      '--end': [],
    });
  });
  it('throws on unrecognized option', async () => {

    const parser = simpleZOptionsParser({ options: {} });
    const error = await parser(['--option']).catch(asis);

    expect(error).toBeInstanceOf(UnknownZOptionError);
    expect(error.optionName).toBe('--option');
  });
  it('accepts supported options provider', async () => {

    let values: readonly string[] | undefined;

    const parser = simpleZOptionsParser({
      options: valueProvider({
        '--test': option => {
          values = option.values();
        },
      }),
    });

    const recognized = await parser(['--test', 'val']);

    expect(values).toEqual(['val']);
    expect(recognized).toEqual({
      '--test': ['val'],
    });
  });
  it('ignores undefined option reader', async () => {

    let values: readonly string[] | undefined;

    const parser = simpleZOptionsParser({
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

    const recognized = await parser(['--test', 'val']);

    expect(values).toEqual(['val']);
    expect(recognized).toEqual({
      '--test': ['val'],
    });
  });
  it('defers option recognition', async () => {

    let deferred: readonly string[] | undefined;
    let restDeferred: readonly string[] | undefined;
    let values: readonly string[] | undefined;
    const parser = simpleZOptionsParser({
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

    const recognized = await parser(['--test', 'val', 'end']);

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
    const parser = simpleZOptionsParser({
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

    const recognized = await parser(['--test', 'val', 'end']);

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
    const parser = simpleZOptionsParser({
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

    const recognized = await parser(['--test', 'val', 'end']);

    expect(values).toEqual(['val', 'end']);
    expect(firstDeferred).toEqual(['val']);
    expect(allDeferred).toEqual(['val', 'end']);
    expect(recognized).toEqual({
      '--test': ['val', 'end'],
    });
  });
  it('throws when option recognition deferred, but not complete', async () => {

    const parser = simpleZOptionsParser({
      options: {
        '--test': option => {
          option.defer(noop);
        },
      },
    });
    const error = await parser(['--test']).catch(asis);

    expect(error).toBeInstanceOf(UnknownZOptionError);
    expect(error.optionName).toBe('--test');
  });
  it('throws when option reader does nothing', async () => {

    const parser = simpleZOptionsParser({
      options: {
        '--test': noop,
      },
    });
    const error = await parser(['--test']).catch(asis);

    expect(error).toBeInstanceOf(UnknownZOptionError);
    expect(error.optionName).toBe('--test');
  });
  it('does not throw when option reader does nothing before option recognition', async () => {

    const parser = simpleZOptionsParser({
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

    const recognized = await parser(['--test', '1', '2']);

    expect(recognized).toEqual({
      '--test': ['1', '2'],
    });
  });
  it('does not throw when option reader does nothing after option recognition', async () => {

    const parser = simpleZOptionsParser({
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

    const recognized = await parser(['--test', '1', '2']);

    expect(recognized).toEqual({
      '--test': ['1', '2'],
    });
  });

  describe('simple', () => {
    it('recognizes all options by default', async () => {

      const recognized = await parseZOptions(['some', '--test', 'val1', 'val2', '-tVALUE', '--test', 'val3']);

      expect(recognized).toEqual({
        some: [],
        '--test': ['val1', 'val2', 'val3'],
        '-tVALUE': [],
      });
    });
  });

  describe('syntax', () => {
    it('retries replacement processing', async () => {

      const parser = simpleZOptionsParser({
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
        syntax: [
          ([name]) => name === '--test' ? [{ name: '--replaced', retry: true }] : [],
          ZOptionSyntax.longOptions,
        ],
      });

      const recognized = await parser(['--test', '1', '2']);

      expect(recognized).toEqual({
        '--replaced': [],
      });
    });
    it('retries replacement args processing', async () => {

      const parser = simpleZOptionsParser({
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
        syntax: [
          ([name]) => name === '--test' ? [{ name: '--replaced', values: ['r'], tail: ['t'], retry: true }] : [],
          ZOptionSyntax.longOptions,
        ],
      });

      const recognized = await parser(['--test', '1', '2']);

      expect(recognized).toEqual({
        '--replaced': ['r', 't'],
      });
    });
    it('prevents processing retry after option recognition', async () => {

      const parser = simpleZOptionsParser({
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
        syntax: [
            ZOptionSyntax.longOptions,
            () => [{ name: '--replaced', retry: true }],
        ],
      });

      const recognized = await parser(['--test', '1', '2']);

      expect(recognized).toEqual({
        '--test': ['1', '2'],
      });
    });
  });

  describe('fallback reader', () => {

    let readShort: jest.Mock<ReturnType<ZOptionReader<ZOption>>, Parameters<ZOptionReader<ZOption>>>;
    let defaultShort: string | undefined;

    let readLong: jest.Mock<ReturnType<ZOptionReader<ZOption>>, Parameters<ZOptionReader<ZOption>>>;
    let defaultLong: string | undefined;

    let readPositional: jest.Mock<ReturnType<ZOptionReader<ZOption>>, Parameters<ZOptionReader<ZOption>>>;
    let defaultPositional: string | undefined;

    let fallbackKey: string | undefined;

    function newParser(options: SupportedZOptions.Map<ZOption> = {}): SimpleZOptionsParser {
      return simpleZOptionsParser({
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
        fallbackKey = option.key;
        option.values();
      });
      defaultLong = undefined;

      readShort = jest.fn(option => {
        defaultShort = option.name;
        fallbackKey = option.key;
        option.values();
      });
      defaultShort = undefined;

      readPositional = jest.fn(option => {
        defaultPositional = option.name;
        fallbackKey = option.key;
        option.values();
      });
      defaultPositional = undefined;

      fallbackKey = undefined;
    });

    it('reads unrecognized long option with fallback reader', async () => {

      const parser = newParser();

      await parser(['--test']);

      expect(fallbackKey).toBe('--*');

      expect(readLong).toHaveBeenCalledTimes(1);
      expect(defaultLong).toBe('--test');

      expect(readShort).not.toHaveBeenCalled();

      expect(readPositional).not.toHaveBeenCalled();
      expect(defaultPositional).toBeUndefined();
    });
    it('reads unrecognized short option with fallback reader', async () => {

      const parser = newParser();

      await parser(['-t']);

      expect(fallbackKey).toBe('-*');

      expect(readShort).toHaveBeenCalledTimes(1);
      expect(defaultShort).toBe('-t');

      expect(readLong).not.toHaveBeenCalled();

      expect(readPositional).not.toHaveBeenCalled();
      expect(defaultPositional).toBeUndefined();
    });
    it('reads unrecognized positional option with fallback reader', async () => {

      const parser = newParser();

      await parser(['test']);

      expect(fallbackKey).toBe('*');

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

      await parser(['--test']);

      expect(fallbackKey).toBe('*');

      expect(readShort).not.toHaveBeenCalled();

      expect(readLong).toHaveBeenCalledTimes(1);
      expect(defaultLong).toBe('--test');

      expect(readPositional).toHaveBeenCalledTimes(1);
      expect(defaultPositional).toBe('--test');
    });
    it('does not fallback if option read', async () => {

      let recognizedName: string | undefined;
      const parser = newParser({
        '--test': option => {
          option.rest();
          recognizedName = option.name;
        },
      });

      await parser(['--test']);

      expect(fallbackKey).toBeUndefined();
      expect(recognizedName).toBe('--test');
      expect(defaultShort).toBeUndefined();
      expect(defaultLong).toBeUndefined();
      expect(defaultPositional).toBeUndefined();
    });
  });

  describe('long option', () => {
    it('recognizes `--name=value` format', async () => {

      const parser = simpleZOptionsParser({
        options: {
          '--test'(option) {
            option.values();
          },
          '*'(option) {
            option.rest();
          },
        },
      });

      const recognized = await parser(['--test=value', 'rest']);

      expect(recognized).toEqual({
        '--test': ['value'],
        rest: [],
      });
    });
  });

  describe('short option', () => {
    it('recognizes one-letter option without parameter', async () => {

      const parser = simpleZOptionsParser({
        options: {
          '-t'(option) {
            option.values();
          },
          '*'(option) {
            option.rest();
          },
        },
      });

      const recognized = await parser(['-test']);

      expect(recognized).toEqual({
        '-t': [],
        '-est': [],
      });
    });
    it('prefers one-letter option with parameter', async () => {

      const parser = simpleZOptionsParser({
        options: {
          '-t'(option) {
            option.values();
          },
          '-t*'(option) {
            option.values();
          },
        },
      });

      const recognized = await parser(['-test']);

      expect(recognized).toEqual({
        '-t': ['est'],
      });
    });
    it('recognizes one-letter flags following each other', async () => {

      const parser = simpleZOptionsParser({
        options: {
          '-m'(option) {
            option.values();
          },
          '-n'(option) {
            option.values();
          },
          '-t'(option) {
            option.values();
          },
        },
      });

      const recognized = await parser(['-mnt', 'VALUE']);

      expect(recognized).toEqual({
        '-m': [],
        '-n': [],
        '-t': ['VALUE'],
      });
    });
    it('prefers one-letter fallback', async () => {

      const parser = simpleZOptionsParser({
        options: {
          '-?'(option) {
            option.values();
          },
          '-*'(option) {
            option.values();
          },
        },
      });

      const recognized = await parser(['-test', 'some']);

      expect(recognized).toEqual({
        '-t': ['some'],
        '-e': [],
        '-s': [],
      });
    });
    it('prefers multi-letter option with parameter', async () => {

      const parser = simpleZOptionsParser({
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

      const recognized = await parser(['-test', 'some']);

      expect(recognized).toEqual({
        '-test': ['some'],
      });
    });
    it('recognizes `-name=VALUE` format', async () => {

      const parser = simpleZOptionsParser({
        options: {
          '-test'(option) {
            option.values();
          },
        },
      });

      const recognized = await parser(['-test=some']);

      expect(recognized).toEqual({
        '-test': ['some'],
      });
    });
    it('falls back to `-?` key for `-n=VALUE` format', async () => {

      const parser = simpleZOptionsParser({
        options: {
          '-?'(option) {
            option.values();
          },
          '-*'(option) {
            option.values(0);
          },
        },
      });

      const recognized = await parser(['-t=some']);

      expect(recognized).toEqual({
        '-t': ['some'],
      });
    });
  });
});
