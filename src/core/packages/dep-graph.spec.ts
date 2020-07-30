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

  it('reflects direct dependencies', async () => {

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
    return Array.from(target.depGraph().dependencies(), ({ name }) => name);
  }

  function dependantsOf(
      target: ZPackage,
  ): readonly string[] {
    return Array.from(target.depGraph().dependants(), ({ name }) => name);
  }

});
