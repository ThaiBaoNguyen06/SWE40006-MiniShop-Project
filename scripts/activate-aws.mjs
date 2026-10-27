import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const [name, release] = process.argv.slice(2);
if (!['staging', 'production'].includes(name) || !/^[a-f0-9]{40}$/.test(release || '')) throw new Error('Invalid AWS release');
process.env.MINISHOP_STATE_DIR = '/opt/minishop/state';
// Installed separately by the owner; never included in the release archive or logs.
const settingsFile = '/opt/minishop/automation-settings.json';
if (name === 'production' && fs.existsSync(settingsFile)) {
 const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
 for (const key of ['AUTOMATION_ENABLED', 'ALLOW_PRODUCTION_PROPOSALS', 'AUTOMATION_MODE', 'GITHUB_DELIVERY_MODE', 'GITHUB_REPOSITORY', 'GITHUB_BASE_BRANCH', 'STAGING_URL', 'PRODUCTION_URL']) {
  if (typeof settings[key] === 'string') process.env[key] = settings[key];
 }
 if (process.env.ALLOW_PRODUCTION_PROPOSALS === 'true' && !process.env.PRODUCTION_URL?.startsWith('https://')) throw new Error('Production admin requires a trusted HTTPS URL');
}
const {environment, projectName, run} = await import('./environment.mjs');
const env = environment(name, release);
const override = '/opt/minishop/public.yml';
if (!fs.existsSync(override)) throw new Error('Missing reviewed AWS proxy configuration');
const args = ['compose', '-p', projectName(name, release), '-f', 'deploy/compose.yml', '-f', override];
const previousFile = path.join(process.env.MINISHOP_STATE_DIR, name, 'aws-release.json');
let previous = fs.existsSync(previousFile) ? JSON.parse(fs.readFileSync(previousFile, 'utf8')) : null;
if (!previous) {
 try {
  const response = await fetch('http://127.0.0.1:' + env.HTTP_PORT + '/api/health', {signal:AbortSignal.timeout(5000)});
  const current = await response.json();
  if (response.ok && /^[a-f0-9]{40}$/.test(current.release)) previous = {release:current.release};
 } catch { /* A new host has no prior release to recover. */ }
}
try {
 run('docker', [...args, 'up', '-d', '--wait', '--wait-timeout', '180'], {env});
 if (name === 'production' && process.env.ALLOW_PRODUCTION_PROPOSALS === 'true') {
  const inspect = spawnSync('docker', ['inspect', projectName(name,release) + '-frontend-1','--format','{{json .NetworkSettings.Ports}}'], {encoding:'utf8'});
  if (inspect.status !== 0) throw new Error('Cannot verify private Nginx listener');
  const bindings = Object.values(JSON.parse(inspect.stdout)).flat().filter(Boolean);
  if (bindings.some(binding => !['127.0.0.1','::1'].includes(binding.HostIp))) throw new Error('Admin Nginx must be loopback-only behind the trusted TLS proxy');
 }
 for (const endpoint of ['/api/health','/api/db-health','/api/products']) {
  const response = await fetch('http://127.0.0.1:' + env.HTTP_PORT + endpoint, {signal: AbortSignal.timeout(15000)});
  const body = await response.json();
  if (!response.ok || body.status !== 'ok') throw new Error(endpoint + ' failed');
  if (endpoint.endsWith('/health') && body.release !== release) throw new Error('Wrong release');
  if (endpoint.endsWith('/products')) {
   const expected = JSON.parse(fs.readFileSync('backend/catalogue/products.json','utf8'));
   for (const product of expected) if (!body.products?.some(row => row.name === product.name && Number(row.price) === Number(product.price) && row.stock_quantity === product.stock_quantity)) throw new Error('Catalogue mismatch');
  }
 }
 fs.writeFileSync(previousFile, JSON.stringify({release, verifiedAt: new Date().toISOString()}, null, 2), {mode: 0o600});
 console.log('Verified AWS', name, release);
} catch (error) {
 // Restore the prior application images when possible. Database upserts are not rolled back.
 if (previous?.release && /^[a-f0-9]{40}$/.test(previous.release)) {
  const restored = spawnSync('docker', [...args, 'up', '-d', '--wait', '--wait-timeout', '180'], {env: environment(name, previous.release), stdio:'inherit'});
  console.error(restored.status === 0 ? 'Previous application images restored; inspect database state.' : 'Application recovery failed; operator attention required.');
 }
 throw error;
}
