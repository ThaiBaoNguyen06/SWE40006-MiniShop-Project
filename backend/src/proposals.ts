import { Router } from 'express';
import fs from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { validateProduct, ProductValidationError, appendProduct, readCatalogue } from './catalogue';
import { automationMode, createProposal, readProposal, writeProposal, refreshGitHubProposal, AutomationUnavailableError } from './automation';

export const proposalRouter = Router();
function enabled(): boolean { return process.env.AUTOMATION_ENABLED === 'true' && process.env.APP_ENV === 'development'; }
proposalRouter.get('/config', (_req, res) => res.json({ enabled: enabled(), mode: automationMode(), stagingUrl: 'http://localhost:8283', productionUrl: 'http://localhost:8284' }));
proposalRouter.use((req, res, next) => {
 if (!enabled()) { res.status(503).json({ message: 'Product proposals are disabled in this environment.' }); return; }
 let secret = process.env.ADMIN_TOKEN || '';
 try { if (process.env.ADMIN_TOKEN_FILE) secret = fs.readFileSync(process.env.ADMIN_TOKEN_FILE, 'utf8').trim(); } catch { secret = ''; }
 const supplied = req.get('authorization') || '';
 const expected = 'Bearer ' + secret;
 if (!secret || supplied.length > 4096 || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
  res.status(401).json({ message: 'Enter a valid admin access code.' }); return;
 }
 next();
});
proposalRouter.post('/', async (req, res) => {
 try {
  const product = validateProduct(req.body);
  if (automationMode() === 'local') appendProduct(readCatalogue(), product);
  const proposal = await createProposal(product);
  res.status(202).json(proposal);
 } catch (error) {
  if (error instanceof ProductValidationError) res.status(400).json({ message: error.message });
  else if (error instanceof AutomationUnavailableError) res.status(503).json({ message: error.message });
  else { console.error('Product proposal failed'); res.status(500).json({ message: 'Unable to submit the product proposal.' }); }
 }
});
proposalRouter.get('/:id', async (req, res) => {
 try {
  let proposal = readProposal(String(req.params.id));
  if (!proposal) { res.status(404).json({ message: 'Proposal not found.' }); return; }
  if (proposal.mode === 'github') proposal = await refreshGitHubProposal(proposal);
  res.json(proposal);
 } catch { res.status(503).json({ message: 'Unable to refresh proposal status.' }); }
});
proposalRouter.post('/:id/approve', (req, res) => {
 const proposal = readProposal(String(req.params.id));
 if (!proposal) { res.status(404).json({ message: 'Proposal not found.' }); return; }
 if (proposal.mode !== 'local' || proposal.status !== 'staging_passed') { res.status(409).json({ message: 'Only a local proposal that passed staging can be approved here. GitHub proposals must be reviewed in GitHub.' }); return; }
 proposal.status = 'approved'; writeProposal(proposal); res.json(proposal);
});
