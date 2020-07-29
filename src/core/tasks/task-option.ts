/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZOption, ZOptionReader } from '@run-z/optionz';
import type { ZPackage } from '../packages';
import type { ZTaskSpec } from './task-spec';

/**
 * An option of the command line containing a task specifier.
 *
 * This is passed to {@link ZTaskOptionReader option reader}.
 */
export interface ZTaskOption extends ZOption {

  /**
   * Target package the task is applied to.
   */
  readonly taskTarget: ZPackage;

  /**
   * Task name.
   */
  readonly taskName: string;

  /**
   * Appends a task prerequisite.
   *
   * @param pre  Prerequisite specifier to append.
   */
  addPre(pre: ZTaskSpec.Pre): void;

  /**
   * Appends a task prerequisite.
   *
   * @param name  Prerequisite task name to append.
   */
  addPreTask(name: string): void

  /**
   * Appends arguments to prerequisite task added by the most recent call to {@link addPreTask}.
   *
   * @param args  Prerequisite arguments to add. May contain attributes.
   */
  addPreArgs(...args: readonly string[]): void;

  /**
   * Makes a prerequisite added by the most recent call to {@link addPreTask} run in parallel with the next one.
   */
  parallelPre(): void;

  /**
   * Appends a task attribute.
   *
   * @param name  Target attribute name.
   * @param value  Attribute value to append.
   */
  addAttr(name: string, value: string): void;

  /**
   * Appends task attributes.
   *
   * @param attrs  Attributes to append.
   */
  addAttrs(attrs: ZTaskSpec.Attrs): void;

  /**
   * Appends raw command line argument(s) to the task.
   *
   * @param args  Command line argument(s) to append.
   */
  addArg(...args: string[]): void;

  /**
   * Assigns a task action.
   *
   * The task action defaults to {@link Group grouping task} unless reassigned by this call.
   *
   * @param action  Action to assign to the task.
   */
  setAction(action: ZTaskSpec.Action): void;

}

/**
 * A signature of the reader of the command line containing a task specifier.
 */
export type ZTaskOptionReader = ZOptionReader<ZTaskOption>;
