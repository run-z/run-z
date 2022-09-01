import type { ZExtension } from './extension';
import type { ZPackageResolver } from './packages';
import type { ZPlanner } from './plan';
import type { ZSetup } from './setup';
import type { ZTaskFactory, ZTaskParser } from './tasks';

/**
 * Task execution configuration.
 *
 * Configures {@link ZSetup task execution setup} by providing services to use.
 */
export interface ZConfig {
  /**
   * Task specifier parser to use.
   *
   * @default New {@link ZTaskParser} instance.
   */
  readonly taskParser?: ZTaskParser | ((this: void, setup: ZSetup) => ZTaskParser) | undefined;

  /**
   * Task factory to use.
   *
   * @default New {@link ZTaskFactory} instance.
   */
  readonly taskFactory?: ZTaskFactory | ((this: void, setup: ZSetup) => ZTaskFactory) | undefined;

  /**
   * A resolver of all discovered {@link ZPackage NPM packages} to use.
   *
   * @default New {@link ZPackageResolver} instance.
   */
  readonly packageResolver?:
    | ZPackageResolver
    | ((this: void, setup: ZSetup) => ZPackageResolver)
    | undefined;

  /**
   * Task execution planner to use.
   *
   * @default New {@lin ZPlanner} instance.
   */
  readonly planner?: ZPlanner | ((this: void, setup: ZSetup) => ZPlanner) | undefined;

  /**
   * Task execution functionality extensions.
   */
  readonly extensions?: ZExtension | readonly ZExtension[] | undefined;
}
