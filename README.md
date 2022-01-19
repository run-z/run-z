# Run That

[![NPM][npm-image]][npm-url] [![Build Status][build-status-img]][build-status-link]
[![Build@Windows][build-windows-img]][build-windows-link] [![Build@MacOS][build-macos-img]][build-macos-link]
[![Code Quality][quality-img]][quality-link] [![Coverage][coverage-img]][coverage-link]
[![GitHub Project][github-image]][github-url] [![API Documentation][api-docs-image]][api documentation]

`run-z` is a command line utility able to run multiple [npm-scripts] at once.

-   Each NPM script considered a [task] to execute.
-   Each task may have _prerequisites_. I.e. other tasks to execute before it.
-   Each task executes at most once, even though it is a prerequisite of many tasks.
-   Additional [parameters] can be passed to any task.
-   Tasks can be executed [in parallel or sequentially].
-   Tasks may belong to [different packages]. This is especially helpful with [Yarn Workspaces] or [Lerna].
-   Tasks can be [batched] - the same-named tasks can be executed in each of the selected packages.
-   The dependencies between packages respected when batching - the tasks executed in dependencies-first order.
-   Only one instance of `run-z` process started despite the number of tasks to execute.

> See also:
>
> -   [API Documentation]
> -   [Project Wiki](https://github.com/run-z/run-z/tree/master/docs/usage/wiki)
> -   [Сборка сложных Node.js проектов утилитой run-z](https://habr.com/ru/post/517506/) (Russian)

[npm-image]: https://img.shields.io/npm/v/run-z.svg?logo=npm
[npm-url]: https://www.npmjs.com/package/run-z
[build-status-img]: https://github.com/run-z/run-z/workflows/Build/badge.svg
[build-windows-img]: https://github.com/run-z/run-z/workflows/Build@Windows/badge.svg
[build-macos-img]: https://github.com/run-z/run-z/workflows/Build@MacOS/badge.svg
[build-status-link]: https://github.com/run-z/run-z/actions?query=workflow:Build
[build-windows-link]: https://github.com/run-z/run-z/actions?query=workflow:Build@Windows
[build-macos-link]: https://github.com/run-z/run-z/actions?query=workflow:Build@MacOS
[quality-img]: https://app.codacy.com/project/badge/Grade/77caf2056ac44fa2bf0b96091b09818c
[quality-link]: https://www.codacy.com/gh/run-z/run-z/dashboard?utm_source=github.com&utm_medium=referral&utm_content=run-z/run-z&utm_campaign=Badge_Grade
[coverage-img]: https://app.codacy.com/project/badge/Coverage/77caf2056ac44fa2bf0b96091b09818c
[coverage-link]: https://www.codacy.com/gh/run-z/run-z/dashboard?utm_source=github.com&utm_medium=referral&utm_content=run-z/run-z&utm_campaign=Badge_Coverage
[github-image]: https://img.shields.io/static/v1?logo=github&label=GitHub&message=project&color=informational
[github-url]: https://github.com/run-z/run-z
[api-docs-image]: https://img.shields.io/static/v1?logo=typescript&label=API&message=docs&color=informational
[api documentation]: https://run-z.github.io/run-z/
[npm-scripts]: https://docs.npmjs.com/using-npm/scripts
[yarn workspaces]: https://yarnpkg.com/features/workspaces
[lerna]: https://lerna.js.org/

## Setup And Usage

1.  Add `run-z` as development dependency of your package:

    -   Using npm:

        ```shell script
        npm install run-z --save-dev
        ```

    -   Using pnpm:

        ```shell script
        pnpm add run-z -D
        ```

    -   Using Yarn:
        ```shell script
        yarn add run-z --dev
        ```

2.  Add script(s) to `package.json` executing `run-z`:

    ```json
    {
        "scripts": {
            "all": "run-z build lint,test",
            "build": "run-z --then tsc -p .",
            "clean": "run-z --then shx rm -rf ./dist",
            "lint": "run-z --then eslint .",
            "test": "run-z --then jest",
            "z": "run-z"
        }
    }
    ```

3.  Execute tasks:

    -   Using npm:

        ```shell script
        # Run single task
        npm run all

        # Run multiple tasks
        npm run clean -- build

        # Use a no-op `z` task for convenience
        npm run z -- clean build
        ```

    -   Using pnpm:

        ```shell script
        # Run single task
        pnpm all

        # Run multiple tasks
        pnpm clean build
        ```

    -   Using Yarn:

        ```shell script
        # Run single task
        yarn all

        # Run multiple tasks
        yarn clean build
        ```

Or just use `npx` for your existing project. No need to install `run-z` or modify `package.json`:

```shell script
npx run-z clean build
```

## Tasks

[task]: #tasks

Each record in [scripts] section of [package.json] is a script executable by a package manager (NPM or Yarn). If
executed script is a `run-z` command, the latter treats every script as task. Such a task can be used as a prerequisite
of another one. `run-z` executes prerequisites prior to the task itself.

To specify a task prerequisite just add its name to `run-z` command line:

```shell script
run-z prerequisite1 prerequisite2 --then node ./my-script.js --arg
```

This task would execute `prerequsite1`, then `prerequisite2`, and finally the `node ./my-script.js --arg` command.

The following types of tasks supported:

-   **Command**.

    `--then` option treats the rest of the command line as command to execute after prerequisites.

-   **NPM script**.

    A `package.json` script not containing a `run-z` command. It still can be used as prerequisite of another task.

-   **Group**.

    A `run-z` command containing zero or more prerequisites and not containing a command to execute.

-   **Unknown**.

    A task prerequisite not matching any of the `package.json` scripts. Attempting to execute such a task would cause an
    error. However, it is possible to skip such task execution without causing an error.

[scripts]: https://docs.npmjs.com/configuring-npm/package-json.html#scripts
[package.json]: https://docs.npmjs.com/configuring-npm/package-json.html

### Task Parameters

[parameters]: #task-parameters

To pass additional command line arguments to the task a special syntax can be used:

```shell script
run-z test/--ci/--runInBand     # Pass `--ci` and `--runInBand` command line argument
                                # to command or NPM script executed by `test` task.
run-z test //--ci --runInBand// # Pass multiple command line options at once.
```

Single arguments can be passed by prefixing them with `/` sign. Any number of spaces may precede the `/` sign, but
should not follow it.

Multiple arguments can be passed by enclosing them with two or more `/` signs. The number of opening and closing signs
should be the same. Any number of spaces may precede or follow opening and closing signs.

### Task Attributes

Task attributes are name/value pairs accepted by tasks. They can be passed to the tasks similarly to command line
arguments:

```shell script
run-z test/attribute=value       # Pass `attribute` with `value` to `test` prerequisite.
run-z build test attribute=value # Pass `attribute` with `value` to the task itself and all of its prerequisites.
run-z test/=if-present           # The shorthand for `if-present=on`.
```

Some attributes are flags. I.e. their values treated as booleans with `0`, `false`, and `off` (case-insensitive) meaning
`false`, and everything else meaning `true`. A shorthand syntax (`=flag`) can be used to set it to `on` meaning `true`.

If attribute value set multiple times, the last value takes precedence. If set both by a task and its prerequisite, the
value set prerequisite has lower precedence. The attribute value passed from command line always has the highest
precedence.

The following attributes supported:

-   `env:NAME` - Sets environment variable `NAME`.

    Multiple values for the same environment variable are joined: \
    `env:NODE_OPTIONS=--experimental-vm-modules env:NODE_OPTIONS=--no-warnings` sets `NODE_OPTIONS='--experimental-vm-modules --no-warnings'`

    To override the value a `:=` sign can be used instead of `=`: \
    `env:NODE_OPTIONS=--no-warnings env:NODE_OPTIONS:=--no-deprecation` sets `NODE_OPTIONS='--no-deprecation'`

-   `if-present` - A flag indicating that the task should be executed only if corresponding script defined.

    This can be useful for batched tasks.

-   `skip` - When this flag set the task won't be executed.

Other attributes aren't currently used, but still can be set.

> See also:
>
> -   [Task annexes](https://github.com/run-z/run-z/wiki/Task-annexes)

## Parallel And Sequential Execution

[in parallel or sequentially]: #parallel-and-sequential-execution

Tasks executed sequentially unless parallel execution allowed for them. To allow two or more tasks to be executed in
parallel to each other, separate their names with commas:

```shell script
run-z clean build lint,test  # Arbitrary number of spaces allowed around comma.
```

This would execute `lint` and `test` tasks in parallel to each other, but only when `build` one completed. While the
`build` task would be executed only when `clean` one completed.

It is also possible to execute a command in parallel to its prerequisite. For that an `--and` option could be used
instead of `--then`:

```shell script
run-z copy-assets --and tsc -p .  # Copies assets and compiles TypeScript simultaneously.
```

By default, the maximum number of tasks that can be executed simultaneously is limited to the number of CPUs. The
`--max-jobs` (`-j`) option can be used to change the limit:

```shell script
run-z build,lint,test -j2          # Only two jobs can run simultaneously. The third one would pend.
run-z build,lint,test -max-jobs 1  # Effectively disables parallel execution.
run-z build,lint,test -j0          # Remove the limit completely.
```

## Running Across Multiple Packages

[different packages]: #running-across-multiple-packages

It is possible to execute tasks from other packages:

```shell script
run-z ../package1 build test . build test
```

this executes `build` and `test` tasks in the package located in `../package1` directory, then runs `build` and `test`
tasks in current one.

`run-z` command line options `.`, `..`, and the ones started with `./` or `../` are relative URLs to package
directories. The following tasks searched for and executed in target packages.

## Batch Processing

[batched]: #batch-processing

The package selector may select multiple packages. The task following it would be executed in each of the selected
packages in a batch:

```shell script
run-z ./packages//  build # Executes `build` in each package
                          # inside `./packages` directory.
run-z ./packages/// build # Executes `build` in `./packages` directory
                          # and in each package deeply nested within it.
```

The `//` syntax selects all directly nested directories. The `///` syntax selects the directory and all directories
deeply nested within it. The hidden directories and directories without `package.json` file ignored.

It is also possible to specify multiple package selectors. All selected packages would be united:

```shell script
run-z ./3rd-party// ./packages// build # Executes `build` in each package
                                       # inside `./3rd-party` and `./packages` directories.
```

The tasks within a batch executed in a dependency-first order. I.e. if one of the target packages depends on another,
the task would be executed in dependency first, and in dependent package after that.

The tasks in independent packages executed in parallel to each other.

It is also possible to forcibly execute all batched tasks in parallel to each other with `--batch-parallel` (`--bap`)
option:

```shell script
run-z --batch-parallel ./packages// lint # Executes `lint` in each package
                                         # inside `./packages` directory
                                         # in parallel to each other.
```

> See also:
>
> -   [Reusing package selectors](https://github.com/run-z/run-z/wiki/Reusing-package-selectors)

### Sub-Tasks

The group tasks accept [parameters]. The first parameter considered a name of the task in the same package to execute.
The rest are parameters to this task. This can be used to batch tasks without specifying the package directories every
time.

So, with the following `package.json`:

```json
{
    "scripts": {
        "each": "run-z ./3rd-party// ./packages//"
    }
}
```

it is possible to batch tasks across packages in `./3rd-party` and `./packages` directories:

-   Using npm:

    ```shell script
    npm run each -- /build each /test  # Batch `build`, then `test` across all packages.
    ```

-   Using pnpm:

    ```shell script
    pnpm each /build each /test        # Batch `build`, then `test` across all packages.
    ```

-   Using Yarn:
    ```shell script
    yarn each /build each /test        # Batch `build`, then `test` across all packages.
    ```

## Named Batches

When working with [Yarn Workspaces] or [Lerna] it is often necessary to run the task across multiple packages. It is
quite doable via specifying package selectors. Still, there is a better solution utilizing named batches.

Let's say we have a root package (worktree root) and several packages within a `packages/` directory.

Let's place the following scripts to the root `package.json`:

```json
{
    "scripts": {
        "all/*": "run-z ./packages//",
        "z": "run-z"
    }
}
```

The `all/*` script is a named batch specifier. The `z` task is a handy NPM script, that just runs `run-z`.

With these present it becomes possible to batch tasks by executing `run-z` in either root package directory, or in any
of the nested packages:

-   Using npm:

    ```shell script
    npm run z -- build --all  # Batch `build` task across all packages.
    ```

-   Using pnpm:

    ```shell script
    pnpm z build -- --all     # Batch `build` task across all packages.
    ```

-   Using Yarn:
    ```shell script
    yarn z build --all        # Batch `build` task across all packages.
    ```

With `--all` option specified the `run-z` searches for topmost package containing named batch(-es) specifier, and
batches the task across selected packages.

The `z` task used for convenience here. It is expected to present in all packages. Any task can be executed instead. For
example, when running inside one of the nested packages, the following command can do the same as above:

-   Using npm:

    ```shell script
    npm run build -- --all
    ```

-   Using pnpm:

    ```shell script
    pnpm build -- --all
    ```

-   Using Yarn:
    ```shell script
    yarn build --all
    ```

The named batch can have a syntax like `all/test`. When present, such named batch will be used instead of the `all/*`
one when batching a `test` task. This can be useful, e.g. when it is necessary to pass additional parameters to specific
tasks:

```json
{
    "scripts": {
        "all/*": "run-z ./packages//",
        "all/test": "run-z ./packages// +test/--runInBand",
        "z": "run-z"
    }
}
```

-   Using npm:

    ```shell script

    npm run z -- build --all  # Batch `build` in generic way.
    npm run z -- test --all   # Batch `test` with `--runInBand` option.
    ```

-   Using pnpm:

    ```shell script
    pnpm z build -- --all     # Batch `build` in generic way.
    pnpm z test -- --all      # Batch `test` with `--runInBand` option.
    ```

-   Using Yarn:
    ```shell script
    yarn z build --all        # Batch `build` in generic way.
    yarn z test --all         # Batch `test` with `--runInBand` option.
    ```

> See also:
>
> -   [Partial builds](https://github.com/run-z/run-z/wiki/Partial-builds)

### Dependency Graph

With named batches it is possible to batch tasks across part of package dependency graph.

-   Using npm:

    ```shell script
    # Batch the `build` task across package dependencies and the package itself.
    npm run build -- --with-deps

    # Batch the `build` task across package dependencies.
    # Do not run for the package itself.
    npm run build -- --only-deps

    # Batch the `build` task for the package and all the packages depending on it.
    npm run build -- --with-dependants

    # Batch the `build` task across packages depending on current one.
    # Do not run for the package itself.
    npm run build -- --only-dependants
    ```

-   Using pnpm:

    ```shell script
    # Batch the `build` task across package dependencies and the package itself.
    pnpm build -- --with-deps

    # Batch the `build` task across package dependencies.
    # Do not run for the package itself.
    pnpm build -- --only-deps

    # Batch the `build` task for the package and all the packages depending on it.
    pnpm build -- --with-dependants

    # Batch the `build` task across packages depending on current one.
    # Do not run for the package itself.
    pnpm build -- --only-dependants
    ```

-   Using Yarn:

    ```shell script
    # Batch the `build` task across package dependencies and the package itself.
    yarn build --with-deps

    # Batch the `build` task across package dependencies.
    # Do not run for the package itself.
    yarn build --only-deps

    # Batch the `build` task for the package and all the packages depending on it.
    yarn build --with-dependants

    # Batch the `build` task across packages depending on current one.
    # Do not run for the package itself.
    yarn build --only-dependants
    ```
