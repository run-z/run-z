# Source

These are the sources of `run-z`.

## File Structure

The file structure of the source follows this convention:

-   `#`

    Comment until the end of line.

    The paragraph immediately following a line-starting comment
    is what the comment is about.

    If a comment immediately follows a paragraph,
    that comment is expanded explanations about the paragraph,
    usually the content of a file.

-   `+--`

    Folder that is expanded in this presentation.

-   `---`

    Folder that is collapsed in this presentation.

-   `=--`

    File.

-   `<name>`

    Is to be replaced by an actual functionality/module/... name without `<` or `>`.

````text
+-- src

    # A part of the application (we call it functionality),
    +-- <functionality-name>

        # Reexport exports from modules in this folder.
        =-- index.ts
        # Typically, this file would be like this:
        #
        # ```typescript
        # export * from '<module-1>';
        # export * from '<module-2>';
        # // And so on.
        # ```

        # A module containing application logic.
        =-- <module-1>.ts

        # Inner implementations of <module-1>,
        # if it is better done separately.
        =-- <module-1>.impl.ts

        # TypeScript spec file,
        # acts as the tests file for <module-1>
        =-- <module-1>.spec.ts

        # Code that apply policy or rules
        # TODO: ?
        =-- <module-1>.rule.ts


        # Modules can be also structured into separate folders.
        # This might be done for various reasons:
        #
        # 1.  There are many files in the module,
        #     It isn't clean to put all the module files in one folder.
        +-- <module-2>

            # Reexport exports from modules in this folder.
            # This is needed because node-style module resolution points to
            # `index.js` or `index.ts` when directly referencing folder name.
            =-- index.ts

            # <module-name> is specified again in these files.
            =-- <module-2>.ts
            =-- <module-2>.impl.ts
            =-- <module-2>.spec.ts
            =-- <module-2>.rule.ts

        # More modules.
        ...

        # Child functionalities follow the same rules as top-level functionalities.
        --- <child-functionality-name>
        ... # More child functionalities.
````
