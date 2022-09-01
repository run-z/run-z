import { isIterable } from '@proc7ts/primitives';
import type { ZCall, ZTask } from '../core';

export interface TaskId {
  readonly target: string;
  readonly task: string;
}

export function taskId(value: ZTask | ZCall): TaskId {
  const task = isCall(value) ? value.task : value;

  return { target: task.target.name, task: task.name };
}

function isCall(value: ZTask | ZCall): value is ZCall {
  return 'task' in value;
}

export function taskIds(...values: (ZTask | ZCall)[]): readonly TaskId[];
export function taskIds(
  ...values: [Iterable<ZTask | ZCall>] | (ZTask | ZCall)[]
): readonly TaskId[] {
  let items: Iterable<ZTask | ZCall>;

  if (values.length === 1 && isIterable(values[0])) {
    items = values[0];
  } else {
    items = values as Iterable<ZTask | ZCall>;
  }

  return [...items].map(taskId);
}

export function prerequisitesOf(call: ZCall): readonly TaskId[] {
  return taskIds(...call.prerequisites());
}
