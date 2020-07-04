import { ZPackageTree } from './package-tree';

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

      const otherNested = root.put('nested1/nested1.1', { name: 'nested1.1' });

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
      expect(Array.from(root.nested()).map(n => n.path)).toEqual([
        'root/nested1',
        'root/nested2',
      ]);
    });
  });

  describe('deepNested', () => {
    it('lists nested packages', () => {
      expect(Array.from(root.deeplyNested()).map(n => n.path)).toEqual([
        'root/nested1',
        'root/nested1/nested1.1',
        'root/nested2',
        'root/nested2/nested2.1',
      ]);
    });
  });
});
