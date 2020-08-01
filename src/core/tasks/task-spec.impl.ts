import type { ZTaskSpec } from './task-spec';

/**
 * @internal
 */
export function addZTaskAttr(target: Record<string, string[]>, name: string, value: string): void {
  if (target[name]) {
    target[name].push(value);
  } else {
    target[name] = [value];
  }
}

/**
 * @internal
 */
export function addZTaskAttrs(target: Record<string, string[]>, attrs: ZTaskSpec.Attrs): void {
  Object.entries(attrs).forEach(
      ([name, values]) => values?.forEach(
          value => addZTaskAttr(target, name, value),
      ),
  );
}
