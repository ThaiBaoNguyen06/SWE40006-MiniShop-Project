import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), create: vi.fn(), read: vi.fn(), write: vi.fn() }));
vi.mock('../src/db', () => ({ pool: { query: mocks.query } }));
vi.mock('../src/automation', async importOriginal => ({ ...await importOriginal<typeof import('../src/automation')>(), createProposal: mocks.create, readProposal: mocks.read, writeProposal: mocks.write }));
import app from '../src/app';
const product = { name: 'A Test Speaker', description: 'Portable speaker', price: '20.00', stock_quantity: 2 };
const authorization = 'Bearer synthetic-admin-code';
beforeEach(() => {
 vi.stubEnv('AUTOMATION_ENABLED', 'true'); vi.stubEnv('APP_ENV', 'development'); vi.stubEnv('AUTOMATION_MODE', 'local'); vi.stubEnv('ADMIN_TOKEN', 'synthetic-admin-code'); vi.stubEnv('ADMIN_TOKEN_FILE', '');
 Object.values(mocks).forEach(mock => mock.mockReset());
});
afterEach(() => vi.unstubAllEnvs());
describe('protected product proposal API', () => {
 it('returns non-secret configuration without authentication', async () => {
  const res = await request(app).get('/api/product-proposals/config').expect(200);
  expect(res.body).toMatchObject({ enabled: true, mode: 'local' }); expect(JSON.stringify(res.body)).not.toContain('synthetic-admin-code');
 });
 it('disables proposal writes in production', async () => {
  vi.stubEnv('APP_ENV', 'production'); await request(app).post('/api/product-proposals').set('Authorization', authorization).send(product).expect(503);
  expect(mocks.create).not.toHaveBeenCalled();
 });
 it('rejects missing authentication', async () => { await request(app).post('/api/product-proposals').send(product).expect(401); expect(mocks.create).not.toHaveBeenCalled(); });
 it('requires HTTPS for explicitly enabled production proposals', async () => {
  vi.stubEnv('APP_ENV','production'); vi.stubEnv('AUTOMATION_MODE','github'); vi.stubEnv('ALLOW_PRODUCTION_PROPOSALS','true');
  await request(app).post('/api/product-proposals').set('Authorization',authorization).send(product).expect(426);
  expect(mocks.create).not.toHaveBeenCalled();
 });
 it('accepts an authenticated production proposal through the configured HTTPS proxy', async () => {
  vi.stubEnv('APP_ENV','production'); vi.stubEnv('AUTOMATION_MODE','github'); vi.stubEnv('ALLOW_PRODUCTION_PROPOSALS','true');
  mocks.create.mockResolvedValue({id:'cloud-proposal',mode:'github',status:'github_pending',product});
  await request(app).post('/api/product-proposals').set('X-Forwarded-Proto','https').set('Authorization',authorization).send(product).expect(202);
  expect(mocks.query).not.toHaveBeenCalled();
 });
 it('rejects an incorrect admin code', async () => { await request(app).post('/api/product-proposals').set('Authorization', 'Bearer incorrect').send(product).expect(401); });
 it('rejects invalid products before queueing them', async () => {
  await request(app).post('/api/product-proposals').set('Authorization', authorization).send({ ...product, price: '-1' }).expect(400); expect(mocks.create).not.toHaveBeenCalled();
 });
 it('accepts a proposal without changing the product database', async () => {
  mocks.create.mockImplementation(async value => ({ id: 'request-id', status: 'queued', mode: 'local', product: value }));
  const res = await request(app).post('/api/product-proposals').set('Authorization', authorization).send(product).expect(202);
  expect(res.body.status).toBe('queued'); expect(mocks.query).not.toHaveBeenCalled();
 });
 it('returns 404 for an unknown request', async () => { await request(app).get('/api/product-proposals/unknown').set('Authorization', authorization).expect(404); });
 it('prevents approving before staging succeeds', async () => {
  mocks.read.mockReturnValue({ status: 'running', mode: 'local' }); await request(app).post('/api/product-proposals/request-id/approve').set('Authorization', authorization).expect(409); expect(mocks.write).not.toHaveBeenCalled();
 });
 it('records local approval only after staging passes', async () => {
  mocks.read.mockReturnValue({ status: 'staging_passed', mode: 'local' }); const res = await request(app).post('/api/product-proposals/request-id/approve').set('Authorization', authorization).expect(200);
  expect(res.body.status).toBe('approved'); expect(mocks.write).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
 });
});
