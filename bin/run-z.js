#!/usr/bin/env node
import { runZ } from '../dist/run-z.cli.js';

runZ().catch(() => process.exit(1));
