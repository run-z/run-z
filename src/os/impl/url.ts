import { pathToFileURL, URL } from 'node:url';

/**
 * @internal
 */
let fsRootURL: URL | undefined;

/**
 * @internal
 */
export function fsRoot(): URL {
  return fsRootURL || (fsRootURL = pathToFileURL('/'));
}

/**
 * @internal
 */
export function urlOfFile(url: URL): URL {
  const { pathname } = url;

  if (pathname.endsWith('/') && pathname.length > fsRoot().pathname.length) {
    return new URL(pathname.substr(0, pathname.length - 1), url); // Remove the trailing slash
  }

  return url;
}

/**
 * @internal
 */
export function urlBaseName(url: URL): string {
  const { pathname } = urlOfFile(url);
  const slashIdx = pathname.lastIndexOf('/');

  return slashIdx < 0 ? pathname : pathname.substr(slashIdx + 1);
}

/**
 * @internal
 */
export function isRootURL(rootURL: URL, url: URL): boolean {
  return urlPathOfDir(url).startsWith(urlPathOfDir(rootURL));
}

/**
 * @internal
 */
function urlPathOfDir(url: URL): string {
  const { pathname } = url;

  return pathname.endsWith('/') ? pathname : pathname + '/';
}
