/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZOption, ZOptionReader } from '@run-z/optionz';
import type { ZSetup } from '../setup';
import type { ZTaskSpec } from './task-spec';

/**
 * An option of the command line containing a task specifier.
 *
 * This is passed to {@link ZTaskOptionReader option reader}.
 */
export interface ZTaskOption extends ZOption {

  /**
   * Task execution setup.
   */
  readonly setup: ZSetup;

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
   * Add raw command line argument.
   *
   * @param arg  Command line argument to add.
   */
  addArg(arg: string): void;

  /**
   * Assigns action to the task.
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
