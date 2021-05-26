import { beforeEach, describe, expect, it } from '@jest/globals';
import { ZSetup } from '../setup';
import type { ZPackage } from './package';
import type { ZPackageResolver } from './package-resolver';
import { ZPackageTree } from './package-tree';
import type { ZPackageJson } from './package.json';

describe('ZDepGraph', () => {

  let root: ZPackageTree;
  let packageResolver: ZPackageResolver;

  beforeEach(() => {
    packageResolver = new ZSetup().packageResolver;
    root = new ZPackageTree('root', { packageJson: { name: 'root' } });
  });

  it('reflects direct dependency', async () => {

    const packageA = await addPackage('packageA', { name: 'packageA' });
    const packageB = await addPackage('packageB', { name: 'packageB', dependencies: { packageA: '*' } });

    expect(dependantsOf(packageA)).toEqual(['packageB']);
    expect(dependenciesOf(packageB)).toEqual(['packageA']);
  });
  it('reflects transient dependencies', async () => {

    const packageA = await addPackage('packageA', { name: 'packageA' });
    const packageB = await addPackage('packageB', { name: 'packageB', dependencies: { packageA: '*' } });
    const packageC = await addPackage('packageC', { name: 'packageC', dependencies: { packageB: '*' } });

    expect(dependantsOf(packageA)).toEqual(['packageB', 'packageC']);
    expect(dependenciesOf(packageB)).toEqual(['packageA']);
    expect(dependantsOf(packageB)).toEqual(['packageC']);
    expect(dependenciesOf(packageC)).toEqual(['packageA', 'packageB']);
  });
  it('reflects recurrent dependencies', async () => {

    const packageA = await addPackage('packageA', { name: 'packageA', dependencies: { packageC: '*' } });
    const packageB = await addPackage('packageB', { name: 'packageB', dependencies: { packageA: '*' } });
    const packageC = await addPackage('packageC', { name: 'packageC', dependencies: { packageB: '*' } });

    expect(dependantsOf(packageA)).toEqual(['packageC', 'packageB']);
    expect(dependenciesOf(packageB)).toEqual(['packageC', 'packageA']);
    expect(dependantsOf(packageB)).toEqual(['packageA', 'packageC']);
    expect(dependenciesOf(packageC)).toEqual(['packageA', 'packageB']);
  });
  it('reflects dependency with invalid range', async () => {

    const packageA = await addPackage('packageA', { name: 'packageA', version: '1.0' });
    const packageB = await addPackage('packageB', { name: 'packageB', dependencies: { packageA: 'wrong' } });

    expect(dependantsOf(packageA)).toEqual(['packageB']);
    expect(dependenciesOf(packageB)).toEqual(['packageA']);
  });
  it('reflects dependency with invalid version', async () => {

    const packageA = await addPackage('packageA', { name: 'packageA', version: 'wrong' });
    const packageB = await addPackage('packageB', { name: 'packageB', dependencies: { packageA: '*' } });

    expect(dependantsOf(packageA)).toEqual(['packageB']);
    expect(dependenciesOf(packageB)).toEqual(['packageA']);
  });
  it('ignores dependency not matching version range', async () => {

    const packageA = await addPackage('packageA', { name: 'packageA', version: '1.9.9' });
    const packageB = await addPackage('packageB', { name: 'packageB', dependencies: { packageA: '^2.0.0' } });

    expect(dependantsOf(packageA)).toEqual([]);
    expect(dependenciesOf(packageB)).toEqual([]);
  });
  it('ignores unresolved dependencies', async () => {

    const packageA = await addPackage('packageA', { name: 'packageA' });
    const packageB = await addPackage(
        'packageB',
        {
          name: 'packageB',
          dependencies: {
            packageA: '*',
            packageC: '*',
          },
        },
    );

    expect(dependantsOf(packageA)).toEqual(['packageB']);
    expect(dependenciesOf(packageB)).toEqual(['packageA']);
  });
  it('prefers dev and peer dependencies over dev ones', async () => {

    const packageA = await addPackage('packageA', { name: 'packageA' });
    const packageB1 = await addPackage(
        'packageB1',
        {
          name: 'packageB1',
          devDependencies: {
            packageA: '*',
          },
        },
    );
    const packageB2 = await addPackage(
        'packageB2',
        {
          name: 'packageB2',
          devDependencies: {
            packageA: '*',
          },
        },
    );
    const packageC = await addPackage(
        'packageC',
        {
          name: 'packageC',
          peerDependencies: {
            packageB2: '*',
          },
          devDependencies: {
            packageB1: '*',
            packageB2: '*',
          },
        },
    );

    expect(dependantsOf(packageA)).toEqual([
      'packageB1',
      'packageB2',
      'packageC',
    ]);
    expect(dependenciesOf(packageB1)).toEqual(['packageA']);
    expect(dependenciesOf(packageB2)).toEqual(['packageA']);
    expect(dependenciesOf(packageC)).toEqual([
      'packageA',
      'packageB2',
      'packageB1',
    ]);
  });

  it('prefers dev dependencies over peer ones', async () => {

    const packageA = await addPackage('packageA', { name: 'packageA' });
    const packageB1 = await addPackage(
        'packageB1',
        {
          name: 'packageB1',
          devDependencies: {
            packageA: '*',
          },
        },
    );
    const packageB2 = await addPackage(
        'packageB2',
        {
          name: 'packageB2',
          devDependencies: {
            packageA: '*',
          },
        },
    );
    const packageC = await addPackage(
        'packageC',
        {
          name: 'packageC',
          peerDependencies: {
            packageB1: '*',
          },
          devDependencies: {
            packageB2: '*',
          },
        },
    );

    expect(dependantsOf(packageA)).toEqual([
      'packageB1',
      'packageB2',
      'packageC',
    ]);
    expect(dependenciesOf(packageB1)).toEqual(['packageA']);
    expect(dependenciesOf(packageB2)).toEqual(['packageA']);
    expect(dependenciesOf(packageC)).toEqual([
      'packageA',
      'packageB2',
      'packageB1',
    ]);
  });

  function addPackage(path: string, packageJson: ZPackageJson): Promise<ZPackage> {

    const pkg = root.put(path, { packageJson });

    return packageResolver.get(pkg);
  }

  function dependenciesOf(
      target: ZPackage,
  ): readonly string[] {
    return [...target.depGraph().dependencies()].map(({ name }) => name);
  }

  function dependantsOf(
      target: ZPackage,
  ): readonly string[] {
    return [...target.depGraph().dependants()].map(({ name }) => name);
  }

});
