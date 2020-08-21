#!/usr/bin/env node

const { runZ } = require('./dist/run-z.cli.js');

runZ()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
