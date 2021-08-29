/**
 * `package.json` file contents.
 */
export interface ZPackageJson {

  readonly name?: string | undefined;
  readonly version?: string | undefined;
  readonly peerDependencies?: {
    readonly [name: string]: string;
  } | undefined;
  readonly dependencies?: {
    readonly [name: string]: string;
  } | undefined;
  readonly devDependencies?: {
    readonly [name: string]: string;
  } | undefined;
  readonly scripts?: {
    readonly [name: string]: string;
  } | undefined;
  readonly [key: string]: any | undefined;

}
