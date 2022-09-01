import { runZ } from './cli';

runZ()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
