/**
 * @packageDocumentation
 * @module run-z
 */
import { valueByRecipe } from '@proc7ts/primitives';
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
  private _taskParser?: ZTaskParser;

  /**
   * @internal
   */
  private _taskFactory?: ZTaskFactory;

  /**
   * @internal
   */
  private _packageResolver?: ZPackageResolver;

  /**
   * @internal
   */
  private _planner?: ZPlanner;

  /**
   * Constructs setup instance.
   *
   * @param config  Task execution configuration.
   */
  constructor(config: ZConfig = {}) {
    this._config = config;
  }

  /**
   * Task specifier parser.
   */
  get taskParser(): ZTaskParser {
    return this._taskParser || (
        this._taskParser = this._config.taskParser
            ? valueByRecipe(this._config.taskParser, this)
            : new ZTaskParser()
    );
  }

  /**
   * Task factory.
   */
  get taskFactory(): ZTaskFactory {
    return this._taskFactory || (
        this._taskFactory = this._config.taskFactory
            ? valueByRecipe(this._config.taskFactory, this)
            : new ZTaskFactory()
    );
  }

  /**
   * A resolver of all discovered {@link ZPackage NPM packages}.
   */
  get packageResolver(): ZPackageResolver {
    return this._packageResolver || (
        this._packageResolver = this._config.packageResolver
            ? valueByRecipe(this._config.packageResolver, this)
            : new ZPackageResolver(this)
    );
  }

  /**
   * Task execution planner.
   */
  get planner(): ZPlanner {
    return this._planner || (
        this._planner = this._config.planner
            ? valueByRecipe(this._config.planner, this)
            : new ZPlanner(this)
    );
  }

}

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
  readonly taskParser?: ZTaskParser | ((this: void, setup: ZSetup) => ZTaskParser);

  /**
   * Task factory to use.
   *
   * @default New {@link ZTaskFactory} instance.
   */
  readonly taskFactory?: ZTaskFactory | ((this: void, setup: ZSetup) => ZTaskFactory);

  /**
   * A resolver of all discovered {@link ZPackage NPM packages} to use.
   *
   * @default New {@link ZPackageResolver} instance.
   */
  readonly packageResolver?: ZPackageResolver | ((this: void, setup: ZSetup) => ZPackageResolver);

  /**
   * Task execution planner to use.
   *
   * @default New {@lin ZPlanner} instance.
   */
  readonly planner?: ZPlanner | ((this: void, setup: ZSetup) => ZPlanner);

}
