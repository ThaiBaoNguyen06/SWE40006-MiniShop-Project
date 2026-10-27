import { spawnSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const state = process.env.MINISHOP_STATE_DIR ? path.resolve(process.env.MINISHOP_STATE_DIR) : path.join(root, '.local');
export const ports = { development: 8281, testing: 8282, staging: 8283, production: 8284 };
export function run(command, args, options = {}) {
 const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options });
 if (result.error) throw result.error;
 if (result.status !== 0) throw new Error(command + ' failed with exit code ' + result.status);
}
export function environment(name, release) {
 if (!Object.hasOwn(ports, name)) throw new Error('Unknown environment: ' + name);
 if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}$/.test(release)) throw new Error('Invalid release tag');
 const automationRoot = path.join(state, 'automation');
 fs.mkdirSync(path.join(automationRoot, 'queue'), { recursive: true });
 const adminFile = path.join(automationRoot, 'admin-token');
 if (!fs.existsSync(adminFile)) fs.writeFileSync(adminFile, randomBytes(24).toString('hex'), { mode: 0o600 });
 const githubFile = path.join(automationRoot, 'github-token');
 if (!fs.existsSync(githubFile)) fs.writeFileSync(githubFile, '', {mode: 0o600});
 const directory = path.join(state, name);
 fs.mkdirSync(directory, { recursive: true });
 const passwordFile = path.join(directory, 'password');
 if (!fs.existsSync(passwordFile)) fs.writeFileSync(passwordFile, randomBytes(24).toString('hex'), { mode: 0o600 });
 const cloudProposals = name === 'production' && process.env.AUTOMATION_MODE === 'github' && process.env.ALLOW_PRODUCTION_PROPOSALS === 'true';
 return { ...process.env, AUTOMATION_HOST_DIR: automationRoot, APP_ENV: name, AUTOMATION_ENABLED: name === 'development' || cloudProposals ? 'true' : 'false', AUTOMATION_MODE: process.env.AUTOMATION_MODE || 'local', GITHUB_AUTOMATION_TOKEN: name === 'development' ? (process.env.GITHUB_AUTOMATION_TOKEN || '') : '', GITHUB_TOKEN_FILE_ENABLED: cloudProposals ? 'true' : 'false', POSTGRES_PASSWORD: fs.readFileSync(passwordFile, 'utf8').trim(), RELEASE: release, HTTP_PORT: String(ports[name]) };
}
export function projectName(name, release) {
 const suffix = name === 'testing' ? '-' + createHash('sha256').update(release).digest('hex').slice(0, 10) : '';
 return 'minishop-final-' + name + suffix;
}
export function compose(name, release, args) {
 const env = environment(name, release);
 const project = projectName(name, release);
 if (name === 'testing' && args[0] === 'up') {
  const listed = spawnSync('docker', ['ps', '--filter', 'name=minishop-final-testing', '--format', '{{.Names}}'], { encoding: 'utf8', timeout: 15000 });
  if (listed.error || listed.status !== 0) throw new Error('Cannot inspect previous test containers');
  const previous = listed.stdout.split(/\r?\n/).filter(value => value.startsWith('minishop-final-testing-') && !value.startsWith(project + '-'));
  if (previous.length) run('docker', ['stop', ...previous]);
 }
 run('docker', ['compose', '-p', project, '-f', 'deploy/compose.yml', ...args], { env });
}
