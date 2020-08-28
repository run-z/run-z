#!/bin/sh
':' //; exec "$(command -v node)" --no-warnings --enable-source-maps "$0" "$@"

import { runZ } from '../dist/run-z.cli.js';

runZ().catch(() => process.exit(1));
