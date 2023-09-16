import { beforeEach, describe, expect, it } from '@jest/globals';
import { ZPackageTree } from './package-tree.js';

describe('ZPackageTree', () => {
  let root: ZPackageTree;
  let nested1: ZPackageTree;
  let nested11: ZPackageTree;

  beforeEach(() => {
    root = new ZPackageTree('root');
    nested1 = root.put('nested1');
    nested11 = nested1.put('nested1.1');
    root.put('nested2/nested2.1');
  });

  describe('relative', () => {
    describe('.', () => {
      it('points to itself', () => {
        expect(root.relative('.')).toBe(root);
      });
    });

    describe('name', () => {
      it('points to nested', () => {
        expect(root.relative('nested1')).toBe(nested1);
      });
    });

    describe('./name', () => {
      it('points to nested', () => {
        expect(root.relative('./nested1')).toBe(nested1);
      });
    });

    describe('name/name', () => {
      it('points to deeply nested', () => {
        expect(root.relative('nested1/nested1.1')).toBe(nested11);
      });
    });

    describe('name/..', () => {
      it('points to itself', () => {
        expect(root.relative('nested1/..')).toBe(root);
      });
    });

    describe('./_unknown', () => {
      it('points to itself', () => {
        expect(root.relative('./_unknown')).toBeUndefined();
      });
    });
  });

  describe('put', () => {
    it('replaces existing tree', () => {
      const otherNested = root.put('nested1/nested1.1', { packageJson: { name: 'nested1.1' } });

      expect(otherNested).not.toBe(nested11);
      expect(otherNested.toString()).toBe('root/nested1/nested1.1');
      expect(root.relative('./nested1')).toBe(nested1);
      expect(root.relative('./nested1/nested1.1')).not.toBe(nested11);
      expect(root.relative('./nested1/nested1.1')?.toString()).toBe(otherNested.toString());
      expect(root.relative('./nested1/nested1.1')).toBe(otherNested);
    });
  });

  describe('nested', () => {
    it('lists nested packages', () => {
      expect(root.nested().map(n => n.path)).toEqual(['root/nested1', 'root/nested2']);
    });
  });

  describe('deeplyNested', () => {
    it('lists deeply nested packages', () => {
      expect(root.deeplyNested().map(n => n.path)).toEqual([
        'root/nested1',
        'root/nested1/nested1.1',
        'root/nested2',
        'root/nested2/nested2.1',
      ]);
    });
  });

  describe('select', () => {
    describe('.//', () => {
      it('lists nested packages', async () => {
        expect(await select('.//')).toEqual(['root/nested1', 'root/nested2']);
      });
    });

    describe('.//nested1.1', () => {
      it('lists nested packages', async () => {
        root.put('nested2/nested1.1');
        expect(await select('.//nested1.1')).toEqual([
          'root/nested1/nested1.1',
          'root/nested2/nested1.1',
        ]);
      });
    });

    describe('.///', () => {
      it('lists deeply nested packages', async () => {
        expect(await select('.///')).toEqual([
          'root',
          'root/nested1',
          'root/nested1/nested1.1',
          'root/nested2',
          'root/nested2/nested2.1',
        ]);
      });
    });

    describe('.///nested1.1', () => {
      it('lists deeply nested packages', async () => {
        root.put('nested2/nested1.1/nested1.1');
        expect(await select('.///nested1.1')).toEqual([
          'root/nested1/nested1.1',
          'root/nested2/nested1.1',
          'root/nested2/nested1.1/nested1.1',
        ]);
      });
    });

    describe('..//', () => {
      it('does not list any locations', async () => {
        expect(await select('..//')).toHaveLength(0);
      });
    });

    async function select(pattern: string): Promise<string[]> {
      return (await root.select(pattern)).map(({ path }) => path);
    }
  });
});
