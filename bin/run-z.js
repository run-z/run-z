#!/usr/bin/env -Snode --no-warnings --enable-source-maps

import { runZ } from '../dist/run-z.cli.js';

runZ().catch(() => process.exit(1));
