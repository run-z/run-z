import type { ZOptionError } from '@run-z/optionz';

/**
 * @internal
 */
export function formatZOptionError(
    {
      message,
      optionLocation: {
        args,
        index,
        endIndex,
        offset,
        endOffset,
      },
    }: ZOptionError,
    fromIndex = 2,
): readonly string[] {
  args = args.slice(fromIndex);
  index -= 2;
  endIndex -= 2;

  let commandLine = '';
  let underline = '';

  for (let i = 0; i < args.length; ++i) {

    const arg = args[i];

    if (commandLine) {
      commandLine += ' ';
      if (i <= index) {
        underline += '_';
      } else if (i < endIndex) {
        underline += '^';
      }
    }

    commandLine += arg;

    if (i < index) {
      underline += '_'.repeat(arg.length);
    } else if (i === index) {
      underline += '_'.repeat(offset);
      if (i === endIndex - 1) {
        underline += '^'.repeat(endOffset - offset);
      } else {
        underline += '^'.repeat(arg.length - offset);
      }
    } else if (i === endIndex - 1) {
      underline += '^'.repeat(endOffset);
    }
  }

  return [message, commandLine, underline];
}
