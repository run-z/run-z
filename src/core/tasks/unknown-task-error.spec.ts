import { UnknownZTaskError } from './unknown-task-error';

describe('UnknownZTaskError', () => {
  describe('message', () => {
    it('is set by default', () => {
      expect(new UnknownZTaskError('package', 'task').message).toBe('Task "task" is not known in <package>');
    });
  });
});
