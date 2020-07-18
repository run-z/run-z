import { asis } from '@proc7ts/primitives';
import { pathToFileURL } from 'url';
import { ZPackage, ZSetup } from '../core';
import { ZPackageDirectory } from './package-directory';

describe('SysZShell', () => {

  let pkg: ZPackage;

  beforeEach(async () => {

    const dir = ZPackageDirectory.create({ rootURL: pathToFileURL(process.cwd()) });
    const setup = new ZSetup();

    pkg = await setup.packageResolver.get(dir);
  });

  let prevNpmPath: string | undefined;

  beforeEach(() => {
    prevNpmPath = process.env.npm_execpath;
  });
  afterEach(() => {
    if (!prevNpmPath) {
      delete process.env.npm_execpath;
    } else {
      process.env.npm_execpath = prevNpmPath;
    }
  });

  it('executes NPM script', async () => {

    const task = pkg.task('test:script');
    const call = await pkg.setup.planner.plan({ task });

    expect(await call.exec().whenDone()).toBeUndefined();
  });
  it('executes NPM script with npm by default', async () => {
    delete process.env.npm_execpath;

    const task = pkg.task('test:script');
    const call = await pkg.setup.planner.plan({ task });

    expect(await call.exec().whenDone()).toBeUndefined();
  });
  it('executes NPM script with Yarn when possible', async () => {
    process.env.npm_execpath = 'yarn';

    const task = pkg.task('test:script');
    const call = await pkg.setup.planner.plan({ task });

    expect(await call.exec().whenDone()).toBeUndefined();
  });
  it('executes NPM script with node when npm_execpath points to `.js` file', async () => {
    process.env.npm_execpath = './src/spec/bin/yarn.js';

    const task = pkg.task('test:script');
    const call = await pkg.setup.planner.plan({ task });

    expect(await call.exec().whenDone()).toBeUndefined();
  });
  it('executes command', async () => {

    const task = pkg.task('test:command');
    const call = await pkg.setup.planner.plan({ task });

    expect(await call.exec().whenDone()).toBeUndefined();
  });
  it('executes all tasks', async () => {

    const task = pkg.task('test:all');
    const call = await pkg.setup.planner.plan({ task });

    expect(await call.exec().whenDone()).toBeUndefined();
  });
  it('fails on command failure', async () => {

    const task = pkg.task('test:fail');
    const call = await pkg.setup.planner.plan({ task });

    expect(await call.exec().whenDone().catch(asis)).toBe(13);
  });
  it('fails on command kill', async () => {

    const task = pkg.task('test:kill');
    const call = await pkg.setup.planner.plan({ task });

    expect(await call.exec().whenDone().catch(asis)).toBeDefined();
  });
});
