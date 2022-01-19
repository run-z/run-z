# Partial builds

This document describes how to build only a subset of packages.

To control the named batches to include into the build, use these following options:

## `--only <batch>[,<batch>...]` (`-y`)

Limits the build to a set of named batches, where `<batch>` is a batch name (preceding the `/` sign.)

## `--with <batch>[,<batch>...]` (`-w`)

Selects *additional* named batches in addition to the ones specified by `--only`.

Additional named batches have names prefixed by `+` (which is not required in option value).

These additional named batches are not automatically selected,
unless explictly requested by `--with` or `--only` option.

## `--except <batch>[,<batch>...]` (`-x`)

Excludes the named batches from the build.

This option has higher priority than `--only` and `--with` option,
which means if a batch is to be included because `--only` or `--with` is used,
using `--except` would make it excluded from the build instead.

## `--all`

Selects all named batches except *additional* named batches.

When `--all` is used, `--only`, `--with`, and `--except` do not have any effect.
