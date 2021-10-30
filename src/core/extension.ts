import type { ZTaskParser } from './tasks';

/**
 * Task execution functionality extension.
 */
export interface ZExtension {

  /**
   * Additional options supported by this extension.
   */
  readonly options?: ZTaskParser.SupportedOptions | undefined;

  /**
   * Additional shell options supported by this extension.
   *
   * In contrast to [options], the shell ones can only be specified for `run-z` command, but not for arbitrary task.
   */
  readonly shellOptions?: ZTaskParser.SupportedOptions | undefined;

}
