const runAll = require('npm-run-all');

runAll('test:script', { npmPath: 'yarn' }).then(() => process.exit(), () => process.exit(1));