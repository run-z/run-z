import { beforeEach, describe, expect, it } from '@jest/globals';
import * as path from 'path';
import { fileURLToPath, pathToFileURL, URL } from 'url';
import { ZPackageDirectory } from './package-directory';

describe('ZPackageDirectory', () => {

  let rootURL: URL;

  beforeEach(() => {
    rootURL = pathToFileURL('/root/');
  });

  describe('open', () => {
    it('throws when not inside root URL', () => {
      expect(() => ZPackageDirectory.open({
        url: pathToFileURL('/other'),
        rootURL,
      })).toThrow(new TypeError('file:///other is not inside file:///root'));
    });
  });

  describe('rootURL', () => {
    it('defaults to root file system URL', () => {

      const dir = ZPackageDirectory.open();

      expect(dir.rootURL.href).toBe(pathToFileURL('/').href);
    });
    it('has path without trailing `/`', () => {

      const dir = ZPackageDirectory.open({
        url: new URL('other/', rootURL),
        rootURL,
      });

      expect(dir.rootURL.pathname).toBe(pathToFileURL('/root').pathname);
    });
  });

  describe('url', () => {
    it('defaults to current dir', () => {

      const dir = ZPackageDirectory.open();

      expect(dir.url.href).toBe(pathToFileURL(process.cwd()).href);
      expect(dir.toString()).toBe(pathToFileURL(process.cwd()).href);
    });
    it('has path without trailing `/`', () => {

      const dir = ZPackageDirectory.open({
        url: new URL('other/', rootURL),
        rootURL,
      });

      expect(dir.url.pathname).toBe(pathToFileURL('/root/other').pathname);
      expect(dir.url.toString()).toBe(pathToFileURL('/root/other').toString());
    });
  });

  describe('dirURL', () => {
    it('has path with trailing `/`', () => {

      const dir = ZPackageDirectory.open({
        url: new URL('other/', rootURL),
        rootURL,
      });

      expect(dir.dirURL.pathname).toBe(pathToFileURL('/root/other/').pathname);
    });
  });

  describe('parent', () => {
    it('resolves to parent', () => {

      const dir = ZPackageDirectory.open({
        url: new URL('nested/deeply', rootURL),
        rootURL,
      });

      expect(dir.parent?.path).toBe(fileURLToPath(pathToFileURL('/root/nested')));
    });
    it('does not resolve to parent outside root', () => {

      const dir = ZPackageDirectory.open({
        url: rootURL,
        rootURL,
      });

      expect(dir.parent).toBeUndefined();
      expect(dir.parent).toBeUndefined();
    });
  });

  describe('relative', () => {

    let dir: ZPackageDirectory;

    beforeEach(() => {
      dir = ZPackageDirectory.open({
        url: new URL('dir', rootURL),
        rootURL,
      });
    });

    it('resolves to nested', () => {
      expect(dir.relative('./nested')?.toString()).toBe(pathToFileURL('/root/dir/nested').toString());
    });
    it('resolves to relative', () => {
      expect(dir.relative('../other')?.toString()).toBe(pathToFileURL('/root/other').toString());
    });
    it('resolves to upper-level', () => {
      expect(dir.relative('../')?.toString()).toBe(pathToFileURL('/root').toString());
    });
    it('does not resolve outside root', () => {
      expect(dir.relative('../..')).toBeUndefined();
      expect(dir.relative('../../other')).toBeUndefined();
    });
  });

  describe('nested', () => {
    beforeEach(() => {
      rootURL = new URL(
          'nesting/',
          pathToFileURL(path.join(process.cwd(), 'src', 'spec', 'nesting')),
      );
    });

    it('lists immediately nested dirs', async () => {

      const dir = ZPackageDirectory.open({
        url: new URL('nested', rootURL),
      });
      const packages: string[] = (await dir.nested()).map(({ path }) => path);

      expect(packages).toEqual([fileURLToPath(new URL('nested/deeply-nested', rootURL))]);
    });
  });

  describe('deeplyNested', () => {
    beforeEach(() => {
      rootURL = new URL(
          'nesting/',
          pathToFileURL(path.join(process.cwd(), 'src', 'spec', 'nesting')),
      );
    });

    it('lists deeply nested dirs', async () => {

      const dir = ZPackageDirectory.open({ url: rootURL });
      const packages: string[] = (await dir.deeplyNested()).map(({ path }) => path);

      expect(packages).toEqual([
        fileURLToPath(new URL('nested', rootURL)),
        fileURLToPath(new URL('nested/deeply-nested', rootURL)),
        fileURLToPath(new URL('nested/nested2/nested3', rootURL)),
        fileURLToPath(new URL('nested-v1', rootURL)),
      ]);
    });
  });
});
