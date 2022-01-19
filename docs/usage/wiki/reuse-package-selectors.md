# Reuse package selectors

You can reuse package selectors from any group task in another task.

Place an ellipsis (`...`) before the name of the group task containing selectors.

## Examples

1.  This can be useful in a root project containing many projects:

    ```
    {
      "build": "run-z ...each build",
      "test": "run-z ...each test --batch-parallel",
      "each": "run-z ./r3d-party// ./packages//"
    }
    ```

2.  You can also reuse package selectors from other packages:

    ```
    {
      "build": "run-z ...each build",
      "test": "run-z ...each test --batch-parallel",
      "each": "run-z ./r3d-party...each ./packages//"
    }
    ```

    As you can see, in this example,
    an ellipsis (`...`) is placed between
    the package selector (`./r3d-party`) and the task containing other selectors (`each`).
