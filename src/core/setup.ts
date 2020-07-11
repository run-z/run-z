/**
 * @packageDocumentation
 * @module run-z
 */
import { valueByRecipe } from '@proc7ts/primitives';
import { ZPackageLocation, ZPackageResolver } from './packages';
import { ZTaskParser } from './tasks';

/**
 * `run-z` setup.
 *
 * Provides access to other services.
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
  private _packageResolver?: ZPackageResolver;

  /**
   * Constructs setup instance.
   *
   * @param config  `run-z` configuration.
   */
  constructor(config: ZConfig) {
    this._config = config;
  }

  /**
   * Current location to start package discovery from.
   */
  get currentLocation(): ZPackageLocation {
    return this._config.currentLocation;
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
   * A resolver of all discovered {@link ZPackage NPM packages}.
   */
  get packageResolver(): ZPackageResolver {
    return this._packageResolver || (
        this._packageResolver = this._config.packageResolver
            ? valueByRecipe(this._config.packageResolver, this)
            : new ZPackageResolver(this)
    );
  }

}

/**
 * `run-z` configuration.
 *
 * Configures {@link ZSetup setup} by providing services to use.
 */
export interface ZConfig {

  /**
   * Current location to start package discovery from.
   */
  readonly currentLocation: ZPackageLocation;

  /**
   * Task specifier parser to use.
   *
   * @default New {@link ZTaskParser} instance.
   */
  readonly taskParser?: ZTaskParser | ((this: void, setup: ZSetup) => ZTaskParser);

  /**
   * A resolver of all discovered {@link ZPackage NPM packages} to use.
   *
   * @default New {@link ZPackageResolver} instance.
   */
  readonly packageResolver?: ZPackageResolver | ((this: void, setup: ZSetup) => ZPackageResolver);

}
