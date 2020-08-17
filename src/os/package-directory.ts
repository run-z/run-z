/**
 * @packageDocumentation
 * @module run-z
 */
import { filterIt, flatMapIt, mapIt } from '@proc7ts/a-iterable';
import { isPresent, valueProvider } from '@proc7ts/primitives';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL, URL } from 'url';
import { ZPackageJson, ZPackageLocation } from '../core';
import { isRootURL, urlBaseName, urlOfFile } from './url.impl';

/**
 * A file system directory potentially containing NPM package.
 */
export class ZPackageDirectory extends ZPackageLocation {

  /**
   * Opens NPM package directory.
   *
   * @param url  URL of directory without.
   * @param rootURL  Root URL containing all packages.
   *
   * @returns New NPM package directory instance.
   */
  static open(
      {
        url = pathToFileURL(process.cwd()),
        rootURL = new URL('file:///'),
      }: {
        url?: URL;
        rootURL?: URL;
      } = {},
  ): ZPackageDirectory {
    url = urlOfFile(url);
    rootURL = urlOfFile(rootURL);
    if (!isRootURL(rootURL, url)) {
      throw new TypeError(`${url} is not inside ${rootURL}`);
    }
    return new ZPackageDirectory(url, rootURL);
  }

  /**
   * URL of package directory without trailing `/`
   */
  readonly url: URL;

  /**
   * URL of package directory with trailing `/`
   */
  readonly dirURL: URL;

  /**
   * Root URL containing all NPM packages.
   */
  readonly rootURL: URL;

  private _parent?: ZPackageDirectory | null | undefined = null;

  private constructor(url: URL, rootURL: URL) {
    super();
    this.url = urlOfFile(url);
    this.dirURL = new URL(this.url.pathname + '/', url);
    this.rootURL = rootURL;
  }

  get path(): string {
    return fileURLToPath(this.url);
  }

  get parent(): ZPackageDirectory | undefined {
    if (this._parent !== null) {
      return this._parent;
    }

    const parentURL = new URL('..', this.dirURL);

    if (parentURL.pathname === this.url.pathname || !isRootURL(this.rootURL, parentURL)) {
      return this._parent = undefined;
    }

    return this._parent = new ZPackageDirectory(parentURL, this.rootURL);
  }

  get baseName(): string {
    return urlBaseName(this.url);
  }

  relative(path: string): ZPackageDirectory | undefined {

    const url = new URL(path, this.dirURL);

    return isRootURL(this.rootURL, url) ? new ZPackageDirectory(url, this.rootURL) : undefined;
  }

  nested(): Promise<Iterable<ZPackageDirectory>> {
    return nestedZPackageDirs(this, dir => zPackageJsonPath(dir).then(isPresent));
  }

  async deeplyNested(): Promise<Iterable<ZPackageDirectory>> {

    const result: Iterable<Promise<Iterable<ZPackageDirectory>>> = mapIt(
        await nestedZPackageDirs(this),
        async nested => {

          const deeper = await nested.deeplyNested();

          if (await zPackageJsonPath(nested)) {
            return flatMapIt([[nested], deeper]);
          }

          return deeper;
        },
    );

    return flatMapIt(await Promise.all(result));
  }

  async load(): Promise<ZPackageJson | undefined> {

    const packageJsonPath = await zPackageJsonPath(this);

    return packageJsonPath && JSON.parse((await fs.promises.readFile(packageJsonPath)).toString());
  }

  toString(): string {
    return this.url.toString();
  }

}

/**
 * @internal
 */
async function nestedZPackageDirs(
    dir: ZPackageDirectory,
    test: (dir: ZPackageDirectory) => PromiseLike<boolean> | boolean = valueProvider(true),
): Promise<Iterable<ZPackageDirectory>> {

  const entries = await fs.promises.readdir(fileURLToPath(dir.url), { withFileTypes: true });
  const dirs: Iterable<Promise<ZPackageDirectory | null>> = mapIt(
      entries,
      async entry => {

        const { name } = entry;

        if (!entry.isDirectory() || name === 'node_modules' || name.startsWith('.')) {
          // Skip hidden directories and `node_modules`
          return null;
        }

        const nested = dir.relative(encodeURIComponent(name))!;

        return await test(nested) ? nested : null;
      },
  );

  return filterIt<ZPackageDirectory | null, ZPackageDirectory>(
      await Promise.all(dirs),
      isPresent,
  );
}

/**
 * @internal
 */
async function zPackageJsonPath(dir: ZPackageDirectory): Promise<string | undefined> {

  const packageJsonPath = path.join(fileURLToPath(dir.url), 'package.json');
  const packageJsonExists = await fs.promises.access(
      packageJsonPath,
      fs.constants.R_OK,
  ).then(
      valueProvider(true),
      valueProvider(false),
  );

  return packageJsonExists ? packageJsonPath : undefined;
}
