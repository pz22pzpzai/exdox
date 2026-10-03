import { useEffect, useState } from 'react';
import { listAccountingSourceCandidates, postAccountingSource, type AccountingSourceCandidate } from './api';

const money = (pence: number | null) => pence === null ? '—' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

export default function AccountingSources({ token, onRefresh }: { token: string; onRefresh: () => Promise<void> }) {
  const [candidates, setCandidates] = useState<AccountingSourceCandidate[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  async function load() { setCandidates(await listAccountingSourceCandidates(token)); }
  useEffect(() => { let active = true; listAccountingSourceCandidates(token).then((items) => { if (active) setCandidates(items); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load Exdox records.'); }); return () => { active = false; }; }, [token]);
  async function post(id: number) {
    setBusy(true); setError(''); setFeedback('');
    try {
      const result = await postAccountingSource(token, id);
      await Promise.all([load(), onRefresh()]);
      setFeedback(result.alreadyPosted ? 'This record was already posted. No duplicate entry was created.' : 'Exdox record posted once to Accounting.');
      setSourceId(''); setConfirmed(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not post Exdox record.'); }
    finally { setBusy(false); }
  }
  const selected = candidates.find((item) => String(item.id) === sourceId);
  return <>
    {error && <div className="notice-banner" role="alert">{error}</div>}{feedback && <div className="success-banner" role="status">{feedback}</div>}
    <section className="panel"><h3>Post an existing Exdox record</h3><p>Choose a reviewed GBP Cost or Sale. Accounting takes a snapshot and creates one ledger entry; the original Exdox record stays as it is. Check that this transaction has not already been entered manually in Accounting. Payments are recorded separately.</p><div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>ID</th><th>Type</th><th>Date</th><th>Description</th><th>Gross</th><th>Status</th></tr></thead><tbody>{candidates.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.workspaceContext}</td><td>{item.date}</td><td>{item.description}</td><td>{money(item.totalAmount)}</td><td>{item.postedAt ? item.sourceChangedAfterPosting ? 'Posted · source changed since posting' : 'Posted' : item.eligible ? 'Ready' : item.reason || 'Unavailable'}</td></tr>)}</tbody></table></div>{candidates.length === 0 && <p>No recent Costs or Sales found.</p>}</section>
    <section className="panel"><form className="accounting-form" onSubmit={(event) => { event.preventDefault(); if (confirmed && Number.isSafeInteger(Number(sourceId))) void post(Number(sourceId)); }}><label>Exdox record<select required value={sourceId} onChange={(event) => { setSourceId(event.target.value); setConfirmed(false); }}><option value="">Choose eligible record</option>{candidates.filter((item) => item.eligible && !item.postedAt).map((item) => <option key={item.id} value={item.id}>{item.workspaceContext} #{item.id} · {item.description} · {money(item.totalAmount)}</option>)}</select></label><label className="accounting-confirm"><input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I have checked this transaction is not already in the Accounting ledger.</label><button type="submit" className="primary-action" disabled={busy || !selected?.eligible || Boolean(selected?.postedAt) || !confirmed}>{busy ? 'Posting…' : 'Post to Accounting'}</button></form><p>The list includes up to 500 recent Costs and 500 recent Sales.</p></section>
  </>;
}
