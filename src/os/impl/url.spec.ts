import { describe, expect, it } from '@jest/globals';
import { URL } from 'node:url';
import { isRootURL, urlBaseName, urlOfFile } from './url';

describe('urlOfFile', () => {
  it('removes trailing slash', () => {
    expect(urlOfFile(new URL('file:///path/to/dir/')).href).toBe('file:///path/to/dir');
  });
  it('does not alter root URL', () => {

    const rootURL = new URL('file:///');

    expect(urlOfFile(rootURL)).toBe(rootURL);
  });
  it('does not alter file URL', () => {

    const fileURL = new URL('file:///path/to/file');

    expect(urlOfFile(fileURL)).toBe(fileURL);
  });
});

describe('urlBaseName', () => {
  it('extracts last directory name', () => {
    expect(urlBaseName(new URL('file:///path/to/dir/'))).toBe('dir');
  });
  it('extracts last file name', () => {
    expect(urlBaseName(new URL('file:///path/to/dir/'))).toBe('dir');
  });
  it('extracts empty basename from root URL', () => {
    expect(urlBaseName(new URL('file:///'))).toBe('');
  });
  it('extracts empty basename from absent path', () => {
    expect(urlBaseName(new URL('path:'))).toBe('');
  });
});

describe('isRootURL', () => {
  it('everything is inside root URL', () => {
    expect(isRootURL(new URL('file:///'), new URL('file:///'))).toBe(true);
    expect(isRootURL(new URL('file:///'), new URL('file:///path/to/dir/'))).toBe(true);
    expect(isRootURL(new URL('file:///'), new URL('file:///path/to/file'))).toBe(true);
  });
  it('checks inside root directory', () => {
    expect(isRootURL(new URL('file:///dir/'), new URL('file:///dir'))).toBe(true);
    expect(isRootURL(new URL('file:///dir/'), new URL('file:///dir/'))).toBe(true);
    expect(isRootURL(new URL('file:///dir/'), new URL('file:///dir/file'))).toBe(true);
    expect(isRootURL(new URL('file:///dir/'), new URL('file:///other'))).toBe(false);
  });
  it('checks inside root file', () => {
    expect(isRootURL(new URL('file:///dir'), new URL('file:///dir'))).toBe(true);
    expect(isRootURL(new URL('file:///dir'), new URL('file:///dir/'))).toBe(true);
    expect(isRootURL(new URL('file:///dir'), new URL('file:///dir/file'))).toBe(true);
    expect(isRootURL(new URL('file:///dir'), new URL('file:///other'))).toBe(false);
  });
});
