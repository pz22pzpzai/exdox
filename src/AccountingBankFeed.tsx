import { useEffect, useMemo, useState } from 'react';
import { getAccountingFeedStatus, matchAccountingFeed, startAccountingFeedConnect, syncAccountingFeed, unmatchAccountingFeed, type AccountingData, type AccountingFeedStatus } from './api';

const money = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
const nextDay = (value: string) => new Date(Date.parse(`${value}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

export default function AccountingBankFeed({ data, token, onRefresh }: { data: AccountingData; token: string; onRefresh: () => Promise<void> }) {
  const [status, setStatus] = useState<AccountingFeedStatus | null>(null);
  const [remoteId, setRemoteId] = useState('');
  const [localId, setLocalId] = useState('1000');
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [choices, setChoices] = useState<Record<string, string>>({});
  useEffect(() => { let active = true; getAccountingFeedStatus(token).then((value) => { if (active) setStatus(value); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not check bank connection.'); }); return () => { active = false; }; }, [token]);
  useEffect(() => { if (status?.accounts.length && !status.accounts.some((item) => item.id === remoteId)) setRemoteId(status.accounts[0].id); }, [status, remoteId]);
  useEffect(() => { if (status?.pendingRequest) { setRemoteId(status.pendingRequest.remoteId); setLocalId(status.pendingRequest.localId); setFrom(status.pendingRequest.from); setTo(status.pendingRequest.to); } }, [status?.pendingRequest]);
  useEffect(() => { const mapped = status?.mappings.find((item) => item.remoteId === remoteId); if (mapped) setLocalId(mapped.localId); }, [status, remoteId]);
  const latestStatement = data.bankStatements.filter((item) => (item.accountId ?? '1000') === localId).sort((a, b) => b.toDate.localeCompare(a.toDate))[0];
  const minimumFrom = latestStatement ? nextDay(latestStatement.toDate) : '';
  useEffect(() => { if (minimumFrom && from < minimumFrom && !status?.pending) setFrom(minimumFrom); }, [minimumFrom, from, status?.pending]);
  const mapped = status?.mappings.find((item) => item.remoteId === remoteId);
  const usedEntries = new Set([...(data.bankMatches ?? []).map((item) => item.bankEntryId), ...(data.feedMatches ?? []).map((item) => item.bankEntryId)]);
  const entries = useMemo(() => data.entries.flatMap((entry) => entry.lines.flatMap((line, index) => line.accountId === localId ? [{ id: `${entry.id}:${index}`, date: entry.date, description: entry.description, amountPence: line.debitPence - line.creditPence }] : [])), [data.entries, localId]);
  const feedRows = (data.feedTransactions ?? []).filter((item) => item.localAccountId === localId);
  async function action(work: () => Promise<void>) { setBusy(true); setError(''); setMessage(''); try { await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Bank feed action failed.'); } finally { setBusy(false); } }
  async function connect() { await action(async () => { window.location.assign(await startAccountingFeedConnect(token)); }); }
  async function sync() {
    await action(async () => {
      if (minimumFrom && from < minimumFrom) throw new Error(`Start after the last imported statement: ${minimumFrom}.`);
      const result = await syncAccountingFeed(token, { remoteAccountId: remoteId, localAccountId: localId, from, to });
      setMessage(result.status === 'pending' ? 'Bank is preparing transactions. Select Check progress in a moment.' : `${result.imported} new bank transactions added for review.`);
      setStatus(await getAccountingFeedStatus(token));
      if (result.imported || result.status === 'complete') await onRefresh();
    });
  }
  async function match(transactionId: string, bankEntryId?: string) {
    await action(async () => {
      if (bankEntryId) await matchAccountingFeed(token, { transactionId, bankEntryId }); else await unmatchAccountingFeed(token, transactionId);
      setChoices((current) => ({ ...current, [transactionId]: '' }));
      await onRefresh();
      setMessage(bankEntryId ? 'Bank transaction matched to the ledger.' : 'Match removed.');
    });
  }
  return <section className="panel"><h3>Connected bank feed</h3>
    <p>Connect a UK bank through TrueLayer to bring settled GBP transactions into Accounting. Bank access is read-only. Transactions stay in review until you match them to posted ledger movements.</p>
    {error && <div className="notice-banner" role="alert">{error}</div>}{message && <div className="success-banner" role="status">{message}</div>}
    {!status && !error && <p>Checking bank feed…</p>}
    {status && <>
      <p>Provider: TrueLayer {status.environment === 'sandbox' ? 'test environment' : 'live environment'} · {status.connectionState.replaceAll('_', ' ')}</p>
      {!status.configured ? <p>The bank feed is awaiting provider credentials. CSV import remains available below.</p> : status.connectionState !== 'connected' ? <><button className="secondary-action" type="button" disabled={busy} onClick={() => void connect()}>{status.connectionState === 'not_connected' ? 'Connect bank' : 'Reconnect bank'}</button>{status.connectionState === 'authorization_pending' && <p>Finish the bank authorization, then return here to check the connection.</p>}</> : <>
        <div className="accounting-form">
          <label>Connected GBP bank<select value={remoteId} disabled={status.pending} onChange={(event) => setRemoteId(event.target.value)}>{status.accounts.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>Accounting bank account<select value={localId} disabled={status.pending || Boolean(mapped)} onChange={(event) => setLocalId(event.target.value)}>{data.accounts.filter((item) => item.bank).map((item) => <option key={item.id} value={item.id}>{item.code} {item.name}</option>)}</select></label>
          <label>From<input type="date" value={from} disabled={status.pending} min={minimumFrom || undefined} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>To<input type="date" value={to} disabled={status.pending} min={from} max={today()} onChange={(event) => setTo(event.target.value)} /></label>
          <button className="primary-action" type="button" disabled={busy || !remoteId || !from || !to || from > to} onClick={() => void sync()}>{status.pending ? 'Check progress' : 'Sync transactions'}</button>
        </div>
        {minimumFrom && <p>Manual statements cover this bank through {latestStatement.toDate}; start feed imports from {minimumFrom}.</p>}
      </>}
    </>}
    {feedRows.length > 0 && <div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Date</th><th>Bank description</th><th>Amount</th><th>Ledger movement</th><th>Action</th></tr></thead><tbody>{feedRows.map((row) => {
      const existing = (data.feedMatches ?? []).find((item) => item.transactionId === row.id);
      const candidates = entries.filter((item) => item.amountPence === row.amountPence && !usedEntries.has(item.id)).sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(row.date)) - Math.abs(Date.parse(b.date) - Date.parse(row.date)));
      const choice = choices[row.id] ?? candidates[0]?.id ?? '';
      return <tr key={row.id}><td>{row.date}</td><td>{row.description}</td><td>{money(row.amountPence)}</td><td>{existing ? entries.find((item) => item.id === existing.bankEntryId)?.description ?? 'Matched ledger movement' : <select aria-label={`Match bank feed transaction ${row.date} ${row.description}`} value={choice} onChange={(event) => setChoices((current) => ({ ...current, [row.id]: event.target.value }))}><option value="">Choose exact amount</option>{candidates.map((item) => <option key={item.id} value={item.id}>{item.date} · {item.description} · {money(item.amountPence)}</option>)}</select>}</td><td><button type="button" disabled={busy || (!existing && !choice)} onClick={() => void match(row.id, existing ? undefined : choice)}>{existing ? 'Unmatch' : 'Match'}</button></td></tr>;
    })}</tbody></table></div>}
  </section>;
}
