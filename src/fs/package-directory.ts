/**
 * @packageDocumentation
 * @module run-z
 */
import { valueProvider } from '@proc7ts/primitives';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL, URL } from 'url';
import type { ZPackageJson, ZPackageLocation } from '../core';
import { isRootURL, urlBaseName, urlOfFile } from './url.impl';

/**
 * A file system directory potentially containing NPM package.
 */
export class ZPackageDirectory implements ZPackageLocation {

  /**
   * Constructs NPM package directory.
   *
   * @param url  URL of directory without.
   * @param rootURL  Root URL containing all packages.
   */
  static create(
      url: URL = pathToFileURL(process.cwd()),
      rootURL: URL = new URL('file:///'),
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
    this.url = urlOfFile(url);
    this.dirURL = new URL(this.url.pathname + '/', url);
    this.rootURL = rootURL;
  }

  get path(): string {
    return this.url.pathname;
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

  async load(): Promise<ZPackageJson | undefined> {

    const packageJsonPath = path.join(fileURLToPath(this.url), 'package.json');
    const packageJsonExists = await fs.promises.access(
        packageJsonPath,
        fs.constants.R_OK,
    ).then(
        valueProvider(true),
        valueProvider(false),
    );

    if (!packageJsonExists) {
      return;
    }

    return JSON.parse((await fs.promises.readFile(packageJsonPath)).toString());
  }

  toString(): string {
    return this.url.toString();
  }

}
