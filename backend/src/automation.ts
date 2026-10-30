import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { appendProduct, validateCatalogue, type CatalogueProduct } from './catalogue';

export class AutomationUnavailableError extends Error {}
export type Proposal = { id: string; mode: 'local' | 'github'; status: string; product: CatalogueProduct; createdAt: string; branch?: string; commit?: string; url?: string; message?: string; release?: string };
export function queueDirectory(): string { return process.env.AUTOMATION_DIR || path.resolve(process.cwd(), '.local/automation/queue'); }
export function writeProposal(proposal: Proposal): void {
 const directory = queueDirectory(); fs.mkdirSync(directory, { recursive: true });
 const target = path.join(directory, proposal.id + '.json');
 const temporary = target + '.' + randomUUID() + '.tmp';
 fs.writeFileSync(temporary, JSON.stringify(proposal, null, 2)); fs.renameSync(temporary, target);
}
export function readProposal(id: string): Proposal | undefined {
 if (!/^[a-f0-9-]{36}$/.test(id)) return undefined;
 const file = path.join(queueDirectory(), id + '.json');
 return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined;
}
export function automationMode(): 'local' | 'github' { return process.env.AUTOMATION_MODE === 'github' ? 'github' : 'local'; }

function githubConfig() {
 const repository = process.env.GITHUB_REPOSITORY || '';
 const token = process.env.GITHUB_TOKEN_FILE_ENABLED === 'true' ? fs.readFileSync('/run/secrets/minishop_github', 'utf8').trim() : (process.env.GITHUB_AUTOMATION_TOKEN || '');
 const base = process.env.GITHUB_BASE_BRANCH || 'main';
 if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !token || !/^[\w./-]+$/.test(base)) throw new AutomationUnavailableError('GitHub automation is not configured on the server.');
 return { repository, token, base };
}
async function githubRequest(endpoint: string, method = 'GET', body?: unknown): Promise<any> {
 const { repository, token } = githubConfig();
 const response = await fetch('https://api.github.com/repos/' + repository + endpoint, {
  method, signal: AbortSignal.timeout(20000),
  headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'MiniShop-Catalogue-Automation' },
  body: body === undefined ? undefined : JSON.stringify(body),
 });
 if (!response.ok) throw new AutomationUnavailableError('GitHub request failed (HTTP ' + response.status + '). Check server configuration and repository permissions.');
 return response.json();
}
export async function createProposal(product: CatalogueProduct): Promise<Proposal> {
 const proposal: Proposal = { id: randomUUID(), mode: automationMode(), status: 'queued', product, createdAt: new Date().toISOString() };
 if (proposal.mode === 'github') {
  const { repository, base } = githubConfig();
  const head = await githubRequest('/git/ref/heads/' + encodeURIComponent(base));
  const file = await githubRequest('/contents/backend/catalogue/products.json?ref=' + encodeURIComponent(head.object.sha));
  const catalogue = validateCatalogue(JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')));
  const next = appendProduct(catalogue, product);
  proposal.branch = (process.env.GITHUB_DELIVERY_MODE === 'automatic' ? 'feature/aws-product-' : 'feature/catalogue-') + proposal.id;
  await githubRequest('/git/refs', 'POST', { ref: 'refs/heads/' + proposal.branch, sha: head.object.sha });
  const result = await githubRequest('/contents/backend/catalogue/products.json', 'PUT', {
   branch: proposal.branch, sha: file.sha, message: 'catalogue: propose ' + product.name,
   content: Buffer.from(JSON.stringify(next, null, 2) + '\n').toString('base64'),
  });
  proposal.commit = result.commit.sha;
  proposal.status = 'github_pending';
  proposal.url = 'https://github.com/' + repository + '/actions?query=branch%3A' + encodeURIComponent(proposal.branch);
 }
 writeProposal(proposal);
 return proposal;
}
export async function refreshGitHubProposal(proposal: Proposal): Promise<Proposal> {
 const { repository, base } = githubConfig();
 if (process.env.GITHUB_DELIVERY_MODE === 'automatic') {
  const runs = await githubRequest('/actions/workflows/aws-catalogue.yml/runs?head_sha=' + encodeURIComponent(proposal.commit || '') + '&per_page=10');
  const run = runs.workflow_runs?.find((value: any) => value.head_sha === proposal.commit && value.event === 'push');
  if (run) {
   proposal.url = run.html_url;
   proposal.status = run.status !== 'completed' ? 'running' : run.conclusion === 'success' ? 'deployed' : 'failed';
   proposal.message = proposal.status === 'deployed' ? 'Staging tests passed and Production deployment was verified. Refresh the catalogue to see the product.' : proposal.status === 'failed' ? 'The delivery workflow did not complete. Check GitHub for the failed step; publication is not confirmed.' : 'GitHub Actions is verifying and delivering this product.';
  }
  writeProposal(proposal); return proposal;
 }
 const pulls = await githubRequest('/pulls?state=all&head=' + encodeURIComponent(repository.split('/')[0] + ':' + proposal.branch) + '&base=' + encodeURIComponent(base));
 if (pulls.length) {
  const pr = pulls[0];
  proposal.status = pr.merged_at ? 'merged' : pr.state === 'closed' ? 'closed' : 'pr_open';
  proposal.url = pr.html_url;
  proposal.message = pr.merged_at ? 'Merged. Check the main workflow for production deployment.' : 'Pull request available. Review its staging checks before merging.';
 } else {
  const runs = await githubRequest('/actions/runs?branch=' + encodeURIComponent(proposal.branch || '') + '&per_page=1');
  const run = runs.workflow_runs?.[0];
  if (run) { proposal.status = run.status === 'completed' && run.conclusion !== 'success' ? 'failed' : 'github_pending'; proposal.url = run.html_url; }
 }
 writeProposal(proposal); return proposal;
}
