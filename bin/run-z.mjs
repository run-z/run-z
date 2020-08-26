#!/usr/bin/env -Snode --no-warnings

import { runZ } from '../dist/run-z.cli.mjs';

runZ()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
