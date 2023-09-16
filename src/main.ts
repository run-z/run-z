import { runZ } from './cli/mod.js';

runZ()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
