import type { ZTaskSpec } from './task-spec.js';

export function addZTaskAttr(
  target: Record<string, string[] | null>,
  name: string,
  value: string,
): void {
  const subIdx = name.lastIndexOf(':');

  if (subIdx >= 0) {
    addZTaskAttr(target, name.substr(0, subIdx), name.substr(subIdx + 1));
  }

  const values = target[name];

  if (values) {
    values.push(value);
  } else {
    target[name] = [value];
  }
}

export function removeZTaskAttr(target: Record<string, string[] | null>, name: string): void {
  target[name] = null;
}

export function addZTaskAttrs(
  target: Record<string, string[] | null>,
  attrs: ZTaskSpec.Attrs,
): void {
  Object.entries(attrs).forEach(([name, values]) =>
    values?.forEach(value => addZTaskAttr(target, name, value)),
  );
}
