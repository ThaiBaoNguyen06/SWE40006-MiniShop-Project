import fs from 'node:fs';
import path from 'node:path';
import { compose, ports, state, root } from './environment.mjs';
const [name, release] = process.argv.slice(2);
if (!name || !release) throw new Error('Usage: node scripts/deploy.mjs ENVIRONMENT RELEASE');
compose(name, release, ['up', '-d', '--wait', '--wait-timeout', '180']);
const base = 'http://127.0.0.1:' + ports[name];
for (const endpoint of ['/api/health', '/api/db-health', '/api/products']) {
 const response = await fetch(base + endpoint, { signal: AbortSignal.timeout(10000) });
 if (!response.ok) throw new Error(endpoint + ': HTTP ' + response.status);
 const body = await response.json();
 if (body.status !== 'ok') throw new Error(endpoint + ': unhealthy');
 if (endpoint === '/api/products' && (!Array.isArray(body.products) || body.count !== body.products.length)) throw new Error('Invalid catalogue response');
 if (endpoint === '/api/products') {
  const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'backend/catalogue/products.json'), 'utf8'));
  for (const expected of catalogue) {
   if (!body.products.some(product => product.name === expected.name && Number(product.price) === Number(expected.price) && product.stock_quantity === expected.stock_quantity)) throw new Error('Deployed catalogue does not match the release');
  }
 }
 if (endpoint === '/api/health' && body.release !== release) throw new Error('Release verification failed');
}
const record = { environment: name, release, url: base, verifiedAt: new Date().toISOString() };
fs.writeFileSync(path.join(state,name,'deployment.json'), JSON.stringify(record,null,2));
console.log(JSON.stringify(record,null,2));
