/**
 * @packageDocumentation
 * @module run-z
 */

/**
 * `package.json` file contents.
 */
export interface ZPackageJson {

  readonly name?: string;
  readonly version?: string;
  readonly scripts?: {
    readonly [name: string]: string;
  }
  readonly [key: string]: any;

}
