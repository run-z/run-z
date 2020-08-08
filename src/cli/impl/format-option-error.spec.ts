import { ZOptionError, ZOptionLocation } from '@run-z/optionz';
import { formatZOptionError } from './format-option-error';

describe('formatZOptionError', () => {

  let args: readonly string[];
  let message: string;

  beforeEach(() => {
    args = ['node', 'yarn', 'run-z', 'test', '--option'];
    message = 'Error message';
  });

  it('underlines invalid option', () => {
    expect(format({ args, index: 3 })).toEqual([
      message,
      'run-z test --option',
      '______^^^^',
    ]);
  });
  it('underlines part of invalid option', () => {
    expect(format({ args, index: 4, offset: 2, endOffset: 5 })).toEqual([
      message,
      'run-z test --option',
      '_____________^^^',
    ]);
  });
  it('underlines several options', () => {
    expect(format({ args, index: 3, endIndex: 5, offset: 2, endOffset: 2 })).toEqual([
      message,
      'run-z test --option',
      '________^^^^^',
    ]);
  });

  function format(location: ZOptionLocation): readonly string[] {
    return formatZOptionError(new ZOptionError(location, message));
  }

});
