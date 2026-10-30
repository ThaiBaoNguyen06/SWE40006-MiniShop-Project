import { useEffect, useState, type FormEvent } from 'react'

type Config = { enabled: boolean; mode: 'local' | 'github'; automatic?: boolean; stagingUrl: string; productionUrl: string }
type Proposal = { id: string; status: string; mode: 'local' | 'github'; message?: string; url?: string; product: { name: string } }
const labels: Record<string, string> = {
 queued: 'Queued for testing', running: 'Building and testing', staging_passed: 'Staging passed — awaiting your approval', approved: 'Approved — waiting for deployment', deploying: 'Deploying approved product', deployed: 'Product is live', failed: 'Automation failed — check the details', github_pending: 'GitHub workflow pending or running', pr_open: 'Pull request available — review the staging checks', merged: 'Merged — check production deployment', closed: 'Pull request closed',
}
export default function ProductProposalForm() {
 const [config, setConfig] = useState<Config | null>(null)
 const [open, setOpen] = useState(false)
 const [token, setToken] = useState('')
 const [name, setName] = useState('')
 const [description, setDescription] = useState('')
 const [price, setPrice] = useState('')
 const [stock, setStock] = useState('')
 const [proposal, setProposal] = useState<Proposal | null>(null)
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 useEffect(() => { fetch('/api/product-proposals/config').then(r => r.ok ? r.json() : null).then(setConfig).catch(() => {}) }, [])
 useEffect(() => {
  if (!proposal || !token || ['deployed', 'failed', 'closed'].includes(proposal.status)) return
  const timer = setInterval(async () => {
   try {
    const response = await fetch('/api/product-proposals/' + proposal.id, { headers: { Authorization: 'Bearer ' + token } })
    if (response.ok) setProposal(await response.json())
   } catch { /* Keep the last known status while a deployment restarts services. */ }
  }, 3000)
  return () => clearInterval(timer)
 }, [proposal, token])
 if (!config?.enabled) return null
 async function submit(event: FormEvent) {
  event.preventDefault(); setBusy(true); setError('')
  try {
   const response = await fetch('/api/product-proposals', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ name, description, price, stock_quantity: Number(stock) }) })
   const body = await response.json()
   if (!response.ok) throw new Error(body.message || 'Unable to submit product.')
   setProposal(body)
  } catch (error) { setError(error instanceof Error ? error.message : 'Submission failed.') }
  finally { setBusy(false) }
 }
 async function approve() {
  setBusy(true); setError('')
  try {
   const response = await fetch('/api/product-proposals/' + proposal!.id + '/approve', { method: 'POST', headers: { Authorization: 'Bearer ' + token } })
   const body = await response.json()
   if (!response.ok) throw new Error(body.message || 'Approval failed.')
   setProposal(body)
  } catch (error) { setError(error instanceof Error ? error.message : 'Approval failed.') }
  finally { setBusy(false) }
 }
 return <section className="proposal-panel">
  <button type="button" onClick={() => setOpen(!open)}>{open ? 'Close product editor' : 'Add a product'}</button>
  {open && <>
   <h2>Propose a new product</h2>
   <form onSubmit={submit} className="proposal-form">
    <label>Admin access code<input name="adminCode" type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} required /></label>
    <label>Product name<input name="productName" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={100} required /></label>
    <label>Description<textarea name="description" value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} required /></label>
    <label>Price<input name="price" type="number" min="0" max="99999999.99" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required /></label>
    <label>Stock quantity<input name="stock" type="number" min="0" max="2147483647" step="1" value={stock} onChange={e => setStock(e.target.value)} required /></label>
    <button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for staging'}</button>
   </form>
   {error && <p role="alert" className="error-message">{error}</p>}
   {proposal && <div className="proposal-status" aria-live="polite">
    <h3>{proposal.product.name}</h3>
    <p>{labels[proposal.status] || proposal.status}</p>
    {proposal.status === 'deployed' && <button type="button" onClick={() => window.location.reload()}>Refresh catalogue</button>}
    {proposal.message && <p>{proposal.message}</p>}
    {proposal.url && <p><a href={proposal.url} target="_blank" rel="noreferrer">Open GitHub progress</a></p>}
    <p><a href={config.stagingUrl} target="_blank" rel="noreferrer">View Staging</a> · <a href={config.productionUrl} target="_blank" rel="noreferrer">View Production</a></p>
    {proposal.mode === 'local' && proposal.status === 'staging_passed' && <button type="button" disabled={busy} onClick={approve}>Approve production (local demo)</button>}
   </div>}
  </>}
 </section>
}
