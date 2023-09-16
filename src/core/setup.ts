import { asArray, valueByRecipe } from '@proc7ts/primitives';
import type { ZConfig } from './config';
import type { ZExtension } from './extension';
import { ZPackageResolver } from './packages';
import { ZPlanner } from './plan';
import { ZTaskFactory, ZTaskParser } from './tasks';

/**
 * Task execution setup.
 *
 * Provides access to all task execution services.
 */
export class ZSetup {

  /**
   * @internal
   */
  private readonly _config: ZConfig;

  /**
   * @internal
   */
  private _taskParser?: ZTaskParser | undefined;

  /**
   * @internal
   */
  private _taskFactory?: ZTaskFactory | undefined;

  /**
   * @internal
   */
  private _packageResolver?: ZPackageResolver | undefined;

  /**
   * @internal
   */
  private _planner?: ZPlanner | undefined;

  /**
   * Constructs setup instance.
   *
   * @param config - Task execution configuration.
   */
  constructor(config: ZConfig = {}) {
    this._config = config;
  }

  /**
   * Task specifier parser.
   */
  get taskParser(): ZTaskParser {
    return (
      this._taskParser
      || (this._taskParser = this._config.taskParser
        ? valueByRecipe(this._config.taskParser, this)
        : new ZTaskParser({
            options: this.extensions.flatMap(extension => asArray(extension.options)),
          }))
    );
  }

  /**
   * Task factory.
   */
  get taskFactory(): ZTaskFactory {
    return (
      this._taskFactory
      || (this._taskFactory = this._config.taskFactory
        ? valueByRecipe(this._config.taskFactory, this)
        : new ZTaskFactory())
    );
  }

  /**
   * A resolver of all discovered {@link ZPackage NPM packages}.
   */
  get packageResolver(): ZPackageResolver {
    return (
      this._packageResolver
      || (this._packageResolver = this._config.packageResolver
        ? valueByRecipe(this._config.packageResolver, this)
        : new ZPackageResolver(this))
    );
  }

  /**
   * Task execution planner.
   */
  get planner(): ZPlanner {
    return (
      this._planner
      || (this._planner = this._config.planner
        ? valueByRecipe(this._config.planner, this)
        : new ZPlanner(this))
    );
  }

  /**
   * Task execution functionality extensions.
   */
  get extensions(): readonly ZExtension[] {
    return asArray(this._config.extensions);
  }

}
