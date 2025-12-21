// Watch script to fix Prisma import.meta issues during development
const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');

const prismaFile = path.join(__dirname, '../dist/src/generated/prisma/client.js');
const fixScript = path.join(__dirname, 'fix-prisma-import-meta.js');

console.log('Watching for Prisma file changes...');

const watcher = chokidar.watch(prismaFile, {
  persistent: true,
  ignoreInitial: false,
});

watcher.on('change', () => {
  console.log('Prisma file changed, running fix...');
  exec(`node "${fixScript}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Fix script error: ${error}`);
      return;
    }
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  });
});

// Keep the process running
process.on('SIGINT', () => {
  watcher.close();
  process.exit(0);
});




