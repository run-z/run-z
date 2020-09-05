import { spawnZ } from '@run-z/exec-z';
import crossSpawn from 'cross-spawn';

spawnZ(() => crossSpawn('yarn', {
  args: ['test:script'],
  stdio: 'pipe',
  windowsHide: true,
})).whenDone().catch(() => process.exit(1));

