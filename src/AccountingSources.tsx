import { useEffect, useState } from 'react';
import { listAccountingSourceCandidates, postAccountingSource, type AccountingSourceCandidate, type AccountingVatCode } from './api';

const money = (pounds: number | null) => pounds === null ? '—' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pounds);

export default function AccountingSources({ token, onRefresh }: { token: string; onRefresh: () => Promise<void> }) {
  const [candidates, setCandidates] = useState<AccountingSourceCandidate[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [vatCode, setVatCode] = useState<AccountingVatCode>('P20');
  const [taxDate, setTaxDate] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  async function load() { setCandidates(await listAccountingSourceCandidates(token)); }
  useEffect(() => { let active = true; listAccountingSourceCandidates(token).then((items) => { if (active) setCandidates(items); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load Exdox records.'); }); return () => { active = false; }; }, [token]);
  async function post(id: number) {
    setBusy(true); setError(''); setFeedback('');
    try {
      const result = await postAccountingSource(token, id, vatCode, taxDate);
      await Promise.all([load(), onRefresh()]);
      setFeedback(result.alreadyPosted ? 'This record was already posted. No duplicate entry was created.' : 'Exdox record posted once to Accounting.');
      setSourceId(''); setTaxDate(''); setConfirmed(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not post Exdox record.'); }
    finally { setBusy(false); }
  }
  const selected = candidates.find((item) => String(item.id) === sourceId);
  return <>
    {error && <div className="notice-banner" role="alert">{error}</div>}{feedback && <div className="success-banner" role="status">{feedback}</div>}
    <section className="panel"><h3>Post an existing Exdox record</h3><p>Choose a reviewed GBP Cost or Sale. Accounting takes a snapshot and creates one ledger entry; the original stays as it is. Check for an existing manual Accounting entry. Payments are recorded separately.</p><div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>ID</th><th>Type</th><th>Date</th><th>Description</th><th>Net</th><th>VAT</th><th>Gross</th><th>Status</th></tr></thead><tbody>{candidates.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.workspaceContext}</td><td>{item.date}</td><td>{item.description}</td><td>{money(item.netAmount)}</td><td>{money(item.vatAmount)}</td><td>{money(item.totalAmount)}</td><td>{item.postedAt ? item.sourceChangedAfterPosting ? 'Posted · source changed since posting' : 'Posted' : item.eligible ? 'Ready' : item.reason || 'Unavailable'}</td></tr>)}</tbody></table></div>{candidates.length === 0 && <p>No recent Costs or Sales found.</p>}</section>
    <section className="panel"><form className="accounting-form" onSubmit={(event) => { event.preventDefault(); if (confirmed && Number.isSafeInteger(Number(sourceId))) void post(Number(sourceId)); }}><label>Exdox record<select required value={sourceId} onChange={(event) => { const item = candidates.find((candidate) => String(candidate.id) === event.target.value); setSourceId(event.target.value); setTaxDate(item?.date ?? ''); const prefix = item?.workspaceContext === 'sales' ? 'S' : 'P'; const rate = !item?.vatAmount ? '0' : item.netAmount && Math.abs(item.vatAmount / item.netAmount - 0.05) < 0.001 ? '5' : '20'; setVatCode(`${prefix}${rate}` as AccountingVatCode); setConfirmed(false); }}><option value="">Choose eligible record</option>{candidates.filter((item) => item.eligible && !item.postedAt).map((item) => <option key={item.id} value={item.id}>{item.workspaceContext} #{item.id} · {item.description} · {money(item.totalAmount)}</option>)}</select></label><label>VAT code<select required value={vatCode} onChange={(event) => setVatCode(event.target.value as AccountingVatCode)}>{(selected?.workspaceContext === 'sales' ? [['S20', 'Sales 20%'], ['S5', 'Sales 5%'], ['S0', 'Sales zero rated'], ['SE', 'Sales exempt']] : [['P20', 'Purchase 20%'], ['P5', 'Purchase 5%'], ['P0', 'Purchase zero rated'], ['PE', 'Purchase exempt']]).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label><label>VAT tax date<input type="date" required value={taxDate} onChange={(event) => setTaxDate(event.target.value)} /></label><label className="accounting-confirm"><input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I have checked this transaction is not already in the Accounting ledger and reviewed its VAT code.</label><button type="submit" className="primary-action" disabled={busy || !selected?.eligible || Boolean(selected?.postedAt) || !confirmed}>{busy ? 'Posting…' : 'Post to Accounting'}</button></form><p>The list includes up to 500 recent Costs and 500 recent Sales. A mixed-rate record needs a reviewed manual journal.</p></section>
  </>;
}
