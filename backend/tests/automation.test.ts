import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createProposal, readProposal } from '../src/automation';
import { validateProduct } from '../src/catalogue';
let directory: string;
beforeEach(() => {
 directory = fs.mkdtempSync(path.join(os.tmpdir(), 'minishop-proposal-test-'));
 vi.stubEnv('AUTOMATION_DIR', directory);
 vi.stubEnv('AUTOMATION_MODE', 'local');
});
afterEach(() => {
 vi.unstubAllGlobals(); vi.unstubAllEnvs();
 for (const file of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, file));
 fs.rmdirSync(directory);
});
describe('product proposal automation adapter', () => {
 it('queues a local proposal without publishing a product', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const product = validateProduct({ name: 'Demo Speaker', description: 'Portable', price: '25', stock_quantity: 3 });
  const proposal = await createProposal(product);
  expect(proposal.status).toBe('queued'); expect(proposal.mode).toBe('local');
  expect(readProposal(proposal.id)?.product.name).toBe('Demo Speaker'); expect(fetch).not.toHaveBeenCalled();
 });
 it('does not accept a path traversal as a proposal identifier', () => { expect(readProposal('../../private')).toBeUndefined(); });
 it('requires GitHub configuration before remote writes', async () => {
  vi.stubEnv('AUTOMATION_MODE', 'github'); vi.stubEnv('GITHUB_AUTOMATION_TOKEN', '');
  await expect(createProposal(validateProduct({ name: 'Demo', description: 'A product', price: '1', stock_quantity: 1 }))).rejects.toThrow('not configured');
 });
 it('creates a versioned branch and catalogue commit through GitHub', async () => {
  vi.stubEnv('AUTOMATION_MODE', 'github'); vi.stubEnv('GITHUB_REPOSITORY', 'example/minishop'); vi.stubEnv('GITHUB_AUTOMATION_TOKEN', 'synthetic-test-token');
  const old = validateProduct({ name: 'Existing', description: 'Original', price: '2', stock_quantity: 1 }, 'existing');
  const fetch = vi.fn()
   .mockResolvedValueOnce({ ok: true, json: async () => ({ object: { sha: 'base-commit' } }) })
   .mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'file-blob', content: Buffer.from(JSON.stringify([old])).toString('base64') }) })
   .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
   .mockResolvedValueOnce({ ok: true, json: async () => ({ commit: { sha: 'candidate-commit' } }) });
  vi.stubGlobal('fetch', fetch);
  const proposal = await createProposal(validateProduct({ name: 'New Speaker', description: 'New', price: '10', stock_quantity: 2 }));
  expect(proposal.status).toBe('github_pending'); expect(proposal.commit).toBe('candidate-commit'); expect(fetch).toHaveBeenCalledTimes(4);
  const commit = JSON.parse(fetch.mock.calls[3][1].body);
  expect(JSON.parse(Buffer.from(commit.content, 'base64').toString('utf8'))).toHaveLength(2);
  expect(commit.branch).toMatch(/^feature\/catalogue-/);
 });
 it('sanitizes GitHub failures instead of exposing remote response data', async () => {
  vi.stubEnv('AUTOMATION_MODE', 'github'); vi.stubEnv('GITHUB_REPOSITORY', 'example/minishop'); vi.stubEnv('GITHUB_AUTOMATION_TOKEN', 'synthetic-test-token');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
  await expect(createProposal(validateProduct({ name: 'Demo', description: 'Product', price: '1', stock_quantity: 1 }))).rejects.toThrow('HTTP 403');
 });
});
