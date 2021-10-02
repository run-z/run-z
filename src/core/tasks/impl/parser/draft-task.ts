import { ZOptionError } from '@run-z/optionz';
import type { ZTaskBuilder } from '../../task-builder';
import type { ZTaskOption } from '../../task-option';
import type { ZTaskSpec } from '../../task-spec';
import { addZTaskAttr, addZTaskAttrs, removeZTaskAttr } from '../../task-spec.impl';

/**
 * @internal
 */
export class DraftZTask {

  _option!: ZTaskOption;
  _nextTargets: ZTaskSpec.Target[];
  readonly pre: ZTaskOption.Pre;
  preParallel = false;

  constructor(readonly builder: ZTaskBuilder) {

    const { action: prevAction } = builder.spec();

    this._nextTargets = prevAction.type === 'group' ? [...prevAction.targets] : [];

    this.pre = draftZTaskPre(this);
  }

  moveTo(option: ZTaskOption): void {
    this._option = option;
  }

  done(): ZTaskBuilder {

    const lastSpec = this.pre.conclude();

    if (!this.builder.action) {

      let targets: readonly ZTaskSpec.Target[] = this._nextTargets;

      if (!targets.length && lastSpec) {
        targets = lastSpec.targets;
      }

      this.builder.setAction({
        type: 'group',
        targets,
      });
    }

    return this.builder;
  }

}

/**
 * @internal
 */
function draftZTaskPre(
    draft: DraftZTask,
): ZTaskOption.Pre {

  let preTargets: readonly ZTaskSpec.Target[] = [];
  let parallelPre = false;
  let preTaskName: string | undefined;
  let preAnnex = false;
  let preOptionAt = -1;
  let preAttrs: Record<string, [string, ...string[]] | null> = {};
  let preArgs: string[] = [];

  const addPreOption = (): void => {
    if (preOptionAt < 0) {
      preOptionAt = draft._option.argIndex;
    }
  };

  return {
    get isStarted() {
      return this.taskName != null;
    },
    get taskName() {
      return preTaskName;
    },
    get isAnnex() {
      return preAnnex;
    },
    start(taskName: string, annex = false) {
      this.conclude();
      if (draft._nextTargets.length) {
        preTargets = draft._nextTargets;
        draft._nextTargets = [];
      }
      preTaskName = taskName;
      preAnnex = annex;

      return this;
    },
    addAttr(name: string, value: string) {
      addPreOption();
      addZTaskAttr(preAttrs, name, value);

      return this;
    },
    addAttrs(attrs: ZTaskSpec.Attrs) {
      addPreOption();
      addZTaskAttrs(preAttrs, attrs);

      return this;
    },
    removeAttr(name) {
      addPreOption();
      removeZTaskAttr(preAttrs, name);

      return this;
    },
    addArg(...args: readonly string[]) {
      addPreOption();
      preArgs.push(...args);

      return this;
    },
    addOption(value: string) {
      addPreOption();

      const { taskParser } = draft._option.taskTarget.setup;
      const onAttr = (name: string, value: string, replacement: boolean): true => {
        if (replacement) {
          this.removeAttr(name);
        }

        this.addAttr(name, value);

        return true;
      };

      if (!taskParser.parseAttr(value, onAttr)) {
        this.addArg(value);
      }

      return this;
    },
    parallelToNext(): void {
      this.conclude();
      parallelPre = true;
    },
    nextTarget(...targets: ZTaskSpec.Target[]) {
      this.conclude();
      draft._nextTargets.push(...targets);
    },
    conclude(): ZTaskSpec.Pre | undefined {
      if (this.taskName != null) {

        const pre: ZTaskSpec.Pre = {
          targets: preTargets,
          task: this.taskName,
          annex: this.isAnnex,
          parallel: parallelPre,
          attrs: preAttrs,
          args: preArgs,
        };

        preTaskName = undefined;
        preAnnex = false;
        parallelPre = false;
        preOptionAt = -1;
        preAttrs = {};
        preArgs = [];

        draft._option.addPre(pre);

        return pre;
      }

      if (preOptionAt >= 0) {
        throw new ZOptionError(
            draft._option.optionLocation({ index: preOptionAt }),
            'Prerequisite arguments specified, but not the task',
        );
      }

      return;
    },
  };
}
