import { isIterable } from '@proc7ts/primitives';
import { itsElements } from '@proc7ts/push-iterator';
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

export function taskIds(values: Iterable<ZTask | ZCall>): readonly TaskId[];
export function taskIds(...values: (ZTask | ZCall)[]): readonly TaskId[];
export function taskIds(...values: [Iterable<ZTask | ZCall>] | (ZTask | ZCall)[]): readonly TaskId[] {

  let items: Iterable<ZTask | ZCall>;

  if (values.length === 1 && isIterable(values[0])) {
    items = values[0];
  } else {
    items = values as Iterable<ZTask | ZCall>;
  }

  return itsElements(items, taskId);
}

export function prerequisitesOf(call: ZCall): readonly TaskId[] {
  return taskIds(call.prerequisites());
}
