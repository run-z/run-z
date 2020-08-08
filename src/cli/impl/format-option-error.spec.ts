import { ZOptionError, ZOptionLocation } from '@run-z/optionz';
import { formatZOptionError } from './format-option-error';

describe('formatZOptionError', () => {

  let args: readonly string[];
  let commandLine: string;
  let message: string;

  beforeEach(() => {
    args = ['node', 'yarn', 'run-z', 'test', '--option'];
    commandLine = args.slice(2).join(' ');
    message = 'Error message';
  });

  it('underlines invalid option', () => {
    expect(format({ args, index: 3 })).toEqual([
        message,
        commandLine,
        '_'.repeat(6) + '^'.repeat(4),
    ]);
  });
  it('underlines part of invalid option', () => {
    expect(format({ args, index: 4, offset: 2 })).toEqual([
      message,
      commandLine,
      '_'.repeat(13) + '^'.repeat(6),
    ]);
  });
  it('underlines several options', () => {
    expect(format({ args, index: 3, endIndex: 5, offset: 2, endOffset: 2 })).toEqual([
      message,
      commandLine,
      '_'.repeat(8) + '^'.repeat(5),
    ]);
  });

  function format(location: ZOptionLocation): readonly string[] {
    return formatZOptionError(new ZOptionError(location, message));
  }

});
