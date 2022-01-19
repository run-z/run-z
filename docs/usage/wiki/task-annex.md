# Task annex

"Task annex" is a task name prefixed with `+` sign.

It does the same as the task, except the task execution.
This can be used to pass additional parameters to the task **if** the task executed.

Note that each task would only be executed once.
Still, it can be specified multiple times, each time with its own set of parameters and attributes.

### Example:

With the following `package.json` file:

```json
{
  "scripts": {
    "test": "run-z +z jest",
    "z": "run-z +test/--runInBand"
  }
}
```

Executing the `test` `package.json` script would apply the `--runInBand` option to `jest`.

## `+cmd:<command>` annex

Task annexes executing the same binary program may differ.

A special `+cmd:<command>` annex can be used
to specify additional parameters to a particular binary program.
`<command>` is the name of the binary program.

### Example

The task for test runner may be called `test`, `test:client` or `test:server`.
However, they may execute the same binary program as a result:

```json
{
  "scripts": {
    "lint": "eslint .",
    "test": "run-z test:client test:server",
    "test:client": "jest -c src/server/jest.config.js",
    "test:server": "jest -c src/client/jest.config.js"
  }
}
```

In this case, `jest` is executed for both `test` and `test:server`.

To specify additional parameters to `jest`,
append `+cmd:jest/<parameters>` to the command you use to run npm script:

```shell
npm test +cmd:jest/--runInBand
```

The above script would apply `--runInBand` option to all `jest` executions,
regardless to which one of `test`, `test:client`, or `test:server` was directly invoked.
