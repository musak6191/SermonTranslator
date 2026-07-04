const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const isWindows = process.platform === 'win32';
const npxCommand = isWindows ? 'npx.cmd' : 'npx';

const child = spawn(npxCommand, ['vitest', 'run', '--coverage'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('exit', (code) => {
  const { spawnSync } = require('child_process');
  const report = spawnSync(process.execPath, [path.join(rootDir, 'scripts', 'generate-coverage-report.js')], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (report.status !== 0) {
    process.exit(report.status || 1);
  }

  process.exit(code || 0);
});
