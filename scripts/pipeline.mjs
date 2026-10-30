import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { run, root } from './environment.mjs';
const release = process.argv[2];
if (!release || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}$/.test(release)) throw new Error('Usage: node scripts/pipeline.mjs RELEASE [--verify-only]');
const verifyOnly = process.argv.includes('--verify-only');
const stagingOnly = process.argv.includes('--staging-only');
const dockerCheck = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { cwd: root, encoding: 'utf8', timeout: 15000 });
if (dockerCheck.error || dockerCheck.status !== 0) {
 console.error('Docker engine is unavailable. Start Docker Desktop with Linux containers, then retry. No application build or deployment has started.');
 process.exit(1);
}

// Keep local browser binaries inside the project rather than a user-profile cache.
if (process.platform === 'win32' && !process.env.PLAYWRIGHT_BROWSERS_PATH) {
 process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, '.local', 'playwright-browsers');
}

const npmCli = [
 path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js'),
 path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js'),
 process.env.npm_execpath,
].find(candidate => candidate && fs.existsSync(candidate));
if (!npmCli) throw new Error('Cannot locate npm CLI beside Node.js');
function npm(args, directory, extraEnv = {}) {
 const result = spawnSync(process.execPath, [npmCli,...args], { cwd: path.join(root,directory), stdio:'inherit', env: { ...process.env, ...extraEnv } });
 if (result.error) throw result.error;
 if (result.status !== 0) throw new Error('npm ' + args.join(' ') + ' failed');
}
npm(['ci'],'backend'); npm(['test'],'backend'); npm(['run','build'],'backend');
npm(['ci'],'frontend'); npm(['run','lint'],'frontend'); npm(['run','build'],'frontend');
npm(['ci'],'testing');
console.log('Preparing Chromium for the installed Playwright version...');
run(process.execPath, [path.join(root, 'testing', 'node_modules', 'playwright', 'cli.js'), 'install', 'chromium']);
run('docker',['build','-t','minishop-backend:'+release,'backend']);
run('docker',['build','-t','minishop-frontend:'+release,'frontend']);
fs.mkdirSync(path.join(root,'artifacts',release),{recursive:true});
run('docker',['save','-o',path.join('artifacts',release,'images.tar'),'minishop-backend:'+release,'minishop-frontend:'+release]);
fs.writeFileSync(path.join(root,'artifacts',release,'manifest.json'),JSON.stringify({release,createdAt:new Date().toISOString()},null,2));
run(process.execPath,['scripts/deploy.mjs','testing',release]);
npm(['test'],'testing', { BASE_URL: 'http://127.0.0.1:8282', EXPECTED_RELEASE: release });
if (!verifyOnly) {
 for (const name of (stagingOnly ? ['staging'] : ['development','staging','production'])) {
  run(process.execPath,['scripts/deploy.mjs',name,release]);
 }
}
if (!verifyOnly && !stagingOnly) run(process.execPath, ['scripts/start-automation.mjs']);
console.log('Pipeline passed for release ' + release + (verifyOnly ? ' (verification only)' : stagingOnly ? ' (staging only; production unchanged)' : ' (all four environments)'));
