import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { spawnSync } from 'node:child_process';
const [target, release] = process.argv.slice(2);
if (!['staging', 'production'].includes(target) || !/^[a-f0-9]{40}$/.test(release || '')) throw new Error('Usage: deploy-aws.mjs staging|production COMMIT_SHA');
const config = JSON.parse(fs.readFileSync(process.env.MINISHOP_AWS_CONFIG || '', 'utf8'));
if (config.repository !== process.env.GITHUB_REPOSITORY || config.repository !== 'ThaiBaoNguyen06/SWE40006-MiniShop-Project') throw new Error('Trusted repository mismatch');
const host = config[target + 'Host'];
if (!isIP(host) || !fs.existsSync(config.keyFile) || !fs.existsSync(config.knownHostsFile)) throw new Error('Configure trusted AWS hosts, SSH key and known-hosts file');
const sshOptions = ['-i', config.keyFile, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'UserKnownHostsFile=' + config.knownHostsFile, '-o', 'ConnectTimeout=20'];
function run(command, args) {
 const result = spawnSync(command, args, {stdio: 'inherit', timeout: 15 * 60 * 1000});
 if (result.error || result.status !== 0) throw result.error || new Error(command + ' failed: ' + result.status);
}
const directory = path.resolve('artifacts', release);
const image = path.join(directory, 'images.tar');
if (JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8')).release !== release) throw new Error('Release artifact mismatch');
// Hash the image archive without holding the entire Docker archive in memory.
const digest = createHash('sha256');
for await (const chunk of fs.createReadStream(image)) digest.update(chunk);
const checksum = digest.digest('hex');
const source = path.join(directory, 'source.tar');
run('git', ['archive', '--format=tar', '-o', source, release]);
const destination = 'ubuntu@' + host;
const remote = '/home/ubuntu/minishop-delivery-' + release;
run('ssh', [...sshOptions, destination, 'mkdir -p ' + remote]);
run('scp', [...sshOptions, image, source, destination + ':' + remote + '/']);
const command = [
 'set -eu',
 `cd ${remote}`,
 `echo '${checksum}  images.tar' | sha256sum -c -`,
 'sudo docker load -i images.tar',
 `sudo mkdir -p /opt/minishop/releases/${release}`,
 `sudo tar -xf source.tar -C /opt/minishop/releases/${release}`,
 `cd /opt/minishop/releases/${release}`,
 // Only code/configuration are readable by container users. State and credentials stay private.
 'sudo chmod 644 deploy/init.sql',
 `sudo node scripts/activate-aws.mjs ${target} ${release}`,
].join(' && ');
run('ssh', [...sshOptions, destination, command]);
console.log('AWS deployment verified:', target, release);
