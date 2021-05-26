import { describe, expect, it } from '@jest/globals';
import { UnknownZTaskError } from './unknown-task-error';

describe('UnknownZTaskError', () => {
  describe('message', () => {
    it('is set by default', () => {
      expect(new UnknownZTaskError('package', 'task').message).toBe('Task "task" is not known in <package>');
    });
  });
  it('is respected when set explicitly', () => {
    expect(new UnknownZTaskError('package', 'task', 'Error!').message).toBe('Error!');
  });
});
