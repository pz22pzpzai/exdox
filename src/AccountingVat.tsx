import { useEffect, useState } from 'react';
import { classifyAccountingVat, closeAccountingVatPeriod, getAccountingHmrcStatus, getAccountingVatReport, startAccountingHmrcConnect, type AccountingData, type AccountingHmrcStatus, type AccountingVatBoxes, type AccountingVatClose, type AccountingVatFilingPreview, type AccountingVatReport } from './api';

const money = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
const amount = (pence: number) => (pence / 100).toFixed(2);
const boxKeys = ['box1', 'box2', 'box4', 'box6', 'box7', 'box8', 'box9'] as const;
type InputBox = typeof boxKeys[number];
const blankBoxes = () => ({ box1: '', box2: '', box4: '', box6: '', box7: '', box8: '', box9: '' });
function dateDefaults() {
  const now = new Date();
  const currentQuarter = Math.floor(now.getUTCMonth() / 3);
  const end = new Date(Date.UTC(now.getUTCFullYear(), currentQuarter * 3, 0));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 2, 1));
  return { fromDate: start.toISOString().slice(0, 10), toDate: end.toISOString().slice(0, 10) };
}
function signedPence(value: string) {
  if (!value.trim()) return 0;
  if (!/^-?\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter pounds with no more than two decimal places.');
  const pence = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(pence)) throw new Error('Amount is too large.');
  return pence;
}
function exportCsv(report: AccountingVatReport) {
  const safe = (value: string | number) => {
    const text = String(value);
    const protectedText = typeof value === 'string' && (/^[=+@\t\r]/.test(text) || /^-(?!\d+(\.\d+)?$)/.test(text)) ? `'${text}` : text;
    return `"${protectedText.replaceAll('"', '""')}"`;
  };
  const rows: Array<Array<string | number>> = [
    ['Exdox Accounting VAT review', report.fromDate, report.toDate],
    ['Draft only - not submitted to HMRC'],
    ['Box', 'GBP'],
    ...Array.from({ length: 9 }, (_, index) => [`Box ${index + 1}`, amount(report.boxes[`box${index + 1}` as keyof AccountingVatBoxes])]),
    [],
    ['Tax date', 'Entry ID', 'Reference', 'Description', 'VAT code', ...boxKeys.map((key) => key.toUpperCase())],
    ...report.rows.map((row) => [row.taxDate, row.entryId, row.reference, row.description, row.code, ...boxKeys.map((key) => amount(row.boxes[key]))]),
    [],
    ['Items needing review'],
    ...report.issues.map((issue) => [issue.date, issue.entryId, issue.reference, issue.description, issue.reason]),
  ];
  const blob = new Blob(['\uFEFF', rows.map((row) => row.map(safe).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `exdox-vat-review-${report.fromDate}-${report.toDate}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AccountingVat({ token, data }: { token: string; data: AccountingData }) {
  const [range, setRange] = useState(dateDefaults);
  const [report, setReport] = useState<AccountingVatReport | null>(null);
  const [closes, setCloses] = useState<AccountingVatClose[]>([]);
  const [filingPreview, setFilingPreview] = useState<AccountingVatFilingPreview | null>(null);
  const [hmrcStatus, setHmrcStatus] = useState<AccountingHmrcStatus | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [taxDate, setTaxDate] = useState('');
  const [reason, setReason] = useState('');
  const [boxInput, setBoxInput] = useState(blankBoxes);
  const [reviewed, setReviewed] = useState(false);
  const [detailId, setDetailId] = useState('');
  async function load() {
    const result = await getAccountingVatReport(token, range.fromDate, range.toDate);
    setReport(result.report); setCloses(result.closes); setFilingPreview(result.filingPreview);
  }
  useEffect(() => { let active = true; getAccountingVatReport(token, range.fromDate, range.toDate).then((result) => { if (active) { setReport(result.report); setCloses(result.closes); setFilingPreview(result.filingPreview); } }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load VAT report.'); }); return () => { active = false; }; }, [token]);
  useEffect(() => { let active = true; getAccountingHmrcStatus(token).then((result) => { if (active) setHmrcStatus(result); }).catch(() => { if (active) setHmrcStatus(null); }); return () => { active = false; }; }, [token]);
  async function connectHmrc() {
    setBusy(true); setError('');
    try { window.location.assign(await startAccountingHmrcConnect(token)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start HMRC sandbox connection.'); setBusy(false); }
  }
  async function refresh() { setBusy(true); setError(''); setFeedback(''); try { await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load VAT report.'); } finally { setBusy(false); } }
  const detailEntry = data.entries.find((item) => item.id === detailId);
  const showingSelectedRange = report?.fromDate === range.fromDate && report?.toDate === range.toDate;
  const closed = closes.find((item) => item.fromDate === report?.fromDate && item.toDate === report?.toDate);
  async function saveClassification(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setFeedback('');
    try {
      const boxes = Object.fromEntries(boxKeys.map((key) => [key, signedPence(boxInput[key])])) as Omit<AccountingVatBoxes, 'box3' | 'box5'>;
      await classifyAccountingVat(token, { entryId: selectedId, taxDate, reason, boxes });
      await load(); setSelectedId(''); setReason(''); setBoxInput(blankBoxes()); setFeedback('VAT classification saved with the journal entry.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not classify entry.'); }
    finally { setBusy(false); }
  }
  async function close(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setFeedback('');
    try { if (!showingSelectedRange) throw new Error('Show the selected period before closing it.'); await closeAccountingVatPeriod(token, range.fromDate, range.toDate); await load(); setReviewed(false); setFeedback('VAT period closed in Accounting. No return was sent to HMRC.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not close VAT period.'); }
    finally { setBusy(false); }
  }
  return <>
    <section className="panel"><h3>VAT review</h3><p>Draft UK standard invoice-basis VAT figures from Accounting entries. Check recoverability, tax points, special schemes, international transactions, and supporting invoices before relying on these figures. This page does not submit a return to HMRC.</p><div className="accounting-form"><label>From<input type="date" value={range.fromDate} onChange={(event) => setRange({ ...range, fromDate: event.target.value })} /></label><label>To<input type="date" value={range.toDate} onChange={(event) => setRange({ ...range, toDate: event.target.value })} /></label><button type="button" className="primary-action" disabled={busy} onClick={() => void refresh()}>Show period</button></div></section>
    <section className="panel"><h3>HMRC VAT sandbox</h3><p>{hmrcStatus?.connectionState === 'connected' ? `Test account connected ${hmrcStatus.connectedAt?.slice(0, 10)}.` : hmrcStatus?.connectionState === 'reconnect_required' ? 'HMRC authorisation has expired or was revoked. Reconnect the test user.' : hmrcStatus?.connectionState === 'temporarily_unavailable' ? 'HMRC authorisation could not be checked right now. Try again shortly.' : hmrcStatus?.configured ? 'Ready to connect an HMRC test user.' : 'Sandbox credentials need to be added to the protected server configuration.'} This is a test connection only. VAT obligations and submission are not enabled yet.</p>{new URLSearchParams(window.location.search).get('hmrc') === 'connected' && <div className="success-banner" role="status">HMRC sandbox authorised this Accounting workspace.</div>}{new URLSearchParams(window.location.search).get('hmrc') === 'failed' && <div className="notice-banner" role="alert">HMRC sandbox connection failed. Check the redirect URI and credentials.</div>}{new URLSearchParams(window.location.search).get('hmrc') === 'denied' && <div className="notice-banner" role="alert">HMRC sandbox authorisation was declined.</div>}<button type="button" className="secondary-action" disabled={busy || !hmrcStatus?.configured} onClick={() => void connectHmrc()}>{hmrcStatus?.connected ? 'Reconnect test user' : 'Connect HMRC test user'}</button></section>
    {error && <div className="notice-banner" role="alert">{error}</div>}{feedback && <div className="success-banner" role="status">{feedback}</div>}
    {report && <>
      <section className="panel"><div className="accounting-section-heading"><h3>Nine-box VAT review</h3><button type="button" className="secondary-action" onClick={() => exportCsv(report)}>Export evidence CSV</button></div><p>{report.ready ? 'All VAT-relevant entries in this selected period are classified.' : `${report.issues.length} item(s) need VAT review before this period can be closed.`} {closed ? `Closed ${closed.closedAt.slice(0, 10)}.` : 'Open draft.'}</p>{closed && closed.digest !== report.digest && <div className="notice-banner" role="alert">The current report differs from its closed snapshot. Review the audit history.</div>}<div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Box</th><th>Description</th><th>GBP</th></tr></thead><tbody>{([
        [1, 'VAT due on sales'], [2, 'VAT due on NI acquisitions'], [3, 'Total VAT due'], [4, 'VAT reclaimed on purchases'], [5, 'Net VAT to pay or reclaim'], [6, 'Sales excluding VAT'], [7, 'Purchases excluding VAT'], [8, 'NI supplies of goods to EU'], [9, 'NI acquisitions of goods from EU'],
      ] as Array<[number, string]>).map(([number, label]) => <tr key={number}><td>{number}</td><td>{label}</td><td>{money(report.boxes[`box${number}` as keyof AccountingVatBoxes])}</td></tr>)}</tbody></table></div><p>Boxes 3 and 5 are calculated from boxes 1, 2, and 4. Boxes 2, 8, and 9 require explicit reviewed classification where applicable.</p></section>
      {closed && <section className="panel"><h3>Closed snapshot</h3><p>Closed by {closed.closedBy} at {closed.closedAt}. {closed.rowCount} transaction rows. Snapshot digest: <code>{closed.digest}</code></p><p>Stored net VAT: <strong>{money(closed.boxes.box5)}</strong>. {closed.digest === report.digest ? 'Current source rows match this snapshot.' : 'Current source rows need investigation.'}</p></section>}
      {filingPreview && showingSelectedRange && <section className="panel"><h3>HMRC filing preparation</h3><p>{filingPreview.internallyReady ? 'This closed Accounting snapshot passes the internal filing checks.' : 'This period cannot be prepared for HMRC yet.'} {filingPreview.connectionMessage}</p>{filingPreview.blockers.length > 0 && <ul>{filingPreview.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}<div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>HMRC field</th><th>Value</th></tr></thead><tbody>{Object.entries(filingPreview.fields).map(([key, value]) => <tr key={key}><td>{key}</td><td>{key.startsWith('totalValue') || key === 'totalAcquisitionsExVAT' ? `£${value.toFixed(0)}` : `£${value.toFixed(2)}`}</td></tr>)}</tbody></table></div><p>Boxes 6–9 are shown to whole pounds for the HMRC payload; box 5 is unsigned even when Accounting shows a repayment. This is a preview only. No HMRC obligation was retrieved and no return was submitted.</p></section>}
      <section className="panel"><h3>Transaction detail</h3><div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Tax date</th><th>Reference</th><th>Entry</th><th>Description</th><th>Code</th>{boxKeys.map((key) => <th key={key}>{key.toUpperCase()}</th>)}</tr></thead><tbody>{report.rows.map((row) => <tr key={row.id}><td>{row.taxDate}</td><td>{row.reference}</td><td><button type="button" onClick={() => setDetailId(row.entryId)}>{row.entryId}</button></td><td>{row.description}</td><td>{row.code}</td>{boxKeys.map((key) => <td key={key}>{row.boxes[key] ? money(row.boxes[key]) : '—'}</td>)}</tr>)}</tbody></table></div>{!report.rows.length && <p>No classified VAT transactions in this period.</p>}</section>
      {detailEntry && <section className="panel"><div className="accounting-section-heading"><h3>Ledger entry {detailEntry.reference || detailEntry.id}</h3><button type="button" onClick={() => setDetailId('')}>Close detail</button></div><p>{detailEntry.date} · {detailEntry.description} · Posted by {detailEntry.createdBy} at {detailEntry.createdAt}</p><div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>{detailEntry.lines.map((line, index) => <tr key={index}><td>{data.accounts.find((item) => item.id === line.accountId)?.name ?? line.accountId}</td><td>{line.debitPence ? money(line.debitPence) : '—'}</td><td>{line.creditPence ? money(line.creditPence) : '—'}</td></tr>)}</tbody></table></div></section>}
      <section className="panel"><h3>Items needing classification</h3>{report.issues.length ? <div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Date</th><th>Reference</th><th>Entry</th><th>Reason</th></tr></thead><tbody>{report.issues.map((issue, index) => <tr key={`${issue.entryId}-${index}`}><td>{issue.date}</td><td>{issue.reference}</td><td>{issue.entryId}</td><td>{issue.reason}</td></tr>)}</tbody></table></div> : <p>Nothing to review in this period.</p>}{report.issues.length > 0 && !closed && <form onSubmit={saveClassification}><p>Classify an older posting or manual journal. The VAT due and reclaim amounts must equal that entry’s VAT ledger movement. Enter zeroes for an entry that is excluded from this VAT return, with a clear reason.</p><div className="accounting-form"><label>Entry<select required value={selectedId} onChange={(event) => { const id = event.target.value; const issue = report.issues.find((item) => item.entryId === id); const entry = data.entries.find((item) => item.id === id); const due = entry?.lines.filter((line) => line.accountId === '2100').reduce((sum, line) => sum + line.creditPence - line.debitPence, 0) ?? 0; const reclaim = entry?.lines.filter((line) => line.accountId === '1200').reduce((sum, line) => sum + line.debitPence - line.creditPence, 0) ?? 0; setSelectedId(id); setTaxDate(issue?.date ?? ''); setBoxInput({ ...blankBoxes(), box1: amount(due), box4: amount(reclaim) }); }}><option value="">Choose entry</option>{report.issues.filter((item, index, items) => items.findIndex((candidate) => candidate.entryId === item.entryId) === index).map((issue) => <option key={issue.entryId} value={issue.entryId}>{issue.date} · {issue.reference || issue.entryId} · {issue.description}</option>)}</select></label><label>Tax date<input type="date" required value={taxDate} onChange={(event) => setTaxDate(event.target.value)} /></label><label>Reason<input required minLength={5} maxLength={240} value={reason} onChange={(event) => setReason(event.target.value)} /></label></div><div className="accounting-form">{boxKeys.map((key) => <label key={key}>{key.toUpperCase()} £<input inputMode="decimal" value={boxInput[key]} onChange={(event) => setBoxInput({ ...boxInput, [key]: event.target.value })} /></label>)}</div><button type="submit" className="primary-action" disabled={busy || !selectedId}>Save classification</button></form>}</section>
      <section className="panel"><h3>Close VAT period</h3><p>Closing freezes VAT tax dates within this range. Later corrections must use an open tax date. Closing is an Accounting control only; it does not submit a VAT return or certify that the figures meet HMRC rules.</p><form onSubmit={close}><label className="accounting-confirm"><input type="checkbox" required checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} /> I have reviewed the figures and confirm this is a UK standard invoice-basis VAT period.</label><div className="accounting-actions"><button type="submit" className="primary-action" disabled={busy || !report.ready || Boolean(closed) || !reviewed || !showingSelectedRange}>Close VAT period</button></div></form>{closes.length > 0 && <p>Closed periods: {closes.slice().sort((a, b) => b.toDate.localeCompare(a.toDate)).map((item) => `${item.fromDate} to ${item.toDate}`).join('; ')}</p>}</section>
    </>}
  </>;
}
