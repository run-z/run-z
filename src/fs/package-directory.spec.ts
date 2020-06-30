import { pathToFileURL, URL } from 'url';
import { ZPackageDirectory } from './package-directory';

describe('ZPackageDirectory', () => {

  const rootURL = new URL('file:///root/');

  describe('create', () => {
    it('throws when not inside root URL', () => {
      expect(() => ZPackageDirectory.create(new URL('file:///other'), rootURL)).toThrow(TypeError);
    });
  });

  describe('rootURL', () => {
    it('defaults to root file system URL', () => {

      const dir = ZPackageDirectory.create();

      expect(dir.rootURL.href).toBe('file:///');
    });
    it('has path without trailing `/`', () => {

      const dir = ZPackageDirectory.create(new URL('other/', rootURL), rootURL);

      expect(dir.rootURL.pathname).toBe('/root');
    });
  });

  describe('url', () => {
    it('defaults to current dir', () => {

      const dir = ZPackageDirectory.create();

      expect(dir.url.href).toBe(pathToFileURL(process.cwd()).href);
      expect(dir.toString()).toBe(pathToFileURL(process.cwd()).href);
    });
    it('has path without trailing `/`', () => {

      const dir = ZPackageDirectory.create(new URL('other/', rootURL), rootURL);

      expect(dir.url.pathname).toBe('/root/other');
      expect(dir.url.toString()).toBe('file:///root/other');
    });
  });

  describe('dirURL', () => {
    it('has path with trailing `/`', () => {

      const dir = ZPackageDirectory.create(new URL('other/', rootURL), rootURL);

      expect(dir.dirURL.pathname).toBe('/root/other/');
    });
  });

  describe('parent', () => {
    it('resolves to parent', () => {

      const dir = ZPackageDirectory.create(new URL('nested/deeply', rootURL), rootURL);

      expect(dir.parent?.path).toBe('/root/nested');
      expect(dir.parent?.path).toBe('/root/nested');
    });
    it('does not resolve to parent outside root', () => {

      const dir = ZPackageDirectory.create(rootURL, rootURL);

      expect(dir.parent).toBeUndefined();
      expect(dir.parent).toBeUndefined();
    });
  });

  describe('relative', () => {

    const dir = ZPackageDirectory.create(new URL('dir', rootURL), rootURL);

    it('resolves to nested', () => {
      expect(dir.relative('./nested')?.toString()).toBe('file:///root/dir/nested');
    });
    it('resolves to relative', () => {
      expect(dir.relative('../other')?.toString()).toBe('file:///root/other');
    });
    it('resolves to upper-level', () => {
      expect(dir.relative('../')?.toString()).toBe('file:///root');
    });
    it('does not resolve outside root', () => {
      expect(dir.relative('../..')).toBeUndefined();
      expect(dir.relative('../../other')).toBeUndefined();
    });
  });
});
