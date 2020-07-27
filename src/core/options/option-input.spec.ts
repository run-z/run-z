import { ZOptionInput } from './option-input';

describe('ZOptionInput', () => {
  describe('valuesOf', () => {
    it('extracts all positional options up to the next named one', () => {
      expect(ZOptionInput.valuesOf(['1', '2', '-', '3', '--named', 'next'])).toEqual(['1', '2', '-', '3']);
    });
    it('extracts all positional options up to the next `--`', () => {
      expect(ZOptionInput.valuesOf(['1', '2', '-', '3', '--', 'last'])).toEqual(['1', '2', '-', '3']);
    });
  });

  describe('equal', () => {
    it('compares names', () => {
      expect(ZOptionInput.equal({ name: 'a' }, { name: 'a' })).toBe(true);
      expect(ZOptionInput.equal({ name: 'a' }, { name: 'b' })).toBe(false);
    });
    it('compares keys', () => {
      expect(ZOptionInput.equal({ key: 'k', name: 'a' }, { key: 'k', name: 'a' })).toBe(true);
      expect(ZOptionInput.equal({ key: 'k', name: 'a' }, { key: 'v', name: 'b' })).toBe(false);
    });
    it('compares values', () => {
      expect(ZOptionInput.equal({ name: 'a', values: ['a'] }, { name: 'a', values: ['a'] })).toBe(true);
      expect(ZOptionInput.equal({ name: 'a' }, { name: 'a', values: [] })).toBe(true);
      expect(ZOptionInput.equal({ name: 'a', values: [] }, { name: 'a' })).toBe(true);
      expect(ZOptionInput.equal({ name: 'a', values: ['a'] }, { name: 'a', values: ['b'] })).toBe(false);
      expect(ZOptionInput.equal({ name: 'a', values: ['a'] }, { name: 'a', values: ['a', 'b'] })).toBe(false);
    });
    it('compares tails', () => {
      expect(ZOptionInput.equal({ name: 'a', tail: ['a'] }, { name: 'a', tail: ['a'] })).toBe(true);
      expect(ZOptionInput.equal({ name: 'a' }, { name: 'a', tail: [] })).toBe(true);
      expect(ZOptionInput.equal({ name: 'a', tail: [] }, { name: 'a' })).toBe(true);
      expect(ZOptionInput.equal({ name: 'a', tail: ['a'] }, { name: 'a', tail: ['b'] })).toBe(false);
      expect(ZOptionInput.equal({ name: 'a', tail: ['a'] }, { name: 'a', tail: ['a', 'b'] })).toBe(false);
    });
    it('compares retries', () => {
      expect(ZOptionInput.equal({ name: 'a', retry: false }, { name: 'a' })).toBe(true);
      expect(ZOptionInput.equal({ name: 'a' }, { name: 'a', retry: false })).toBe(true);
      expect(ZOptionInput.equal({ name: 'a', retry: true }, { name: 'a', retry: true })).toBe(true);
      expect(ZOptionInput.equal({ name: 'a' }, { name: 'a', retry: true })).toBe(false);
    });
  });
});
