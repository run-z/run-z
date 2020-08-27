#!/usr/bin/env -Snode --no-warnings

import { runZ } from '../dist/run-z.cli.js';

runZ().catch(() => process.exit(1));
