#!/usr/bin/env node
// eslint-disable-next-line no-restricted-imports
import { runZ } from '../dist/run-z.cli.js';

runZ().catch(() => process.exit(1));
