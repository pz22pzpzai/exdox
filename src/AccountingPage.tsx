import { useEffect, useMemo, useState } from 'react';
import { addAccountingAccount, getAccounting, postAccountingDocument, postAccountingJournal, postAccountingPayment, type AccountingAccount, type AccountingData, type AccountingDocument, type AccountingEntry } from './api';
import AccountingReconciliation from './AccountingReconciliation';
import AccountingControls from './AccountingControls';
import AccountingSources from './AccountingSources';

const money = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
const today = () => new Date().toISOString().slice(0, 10);
type DraftLine = { accountId: string; debit: string; credit: string };
const emptyLine = (): DraftLine => ({ accountId: '', debit: '', credit: '' });

function toPence(value: string) {
  if (!value.trim()) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) throw new Error('Amounts must be positive with no more than two decimal places.');
  const [whole, decimal = ''] = value.trim().split('.');
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount)) throw new Error('Amount is too large.');
  return amount;
}
function csvDownload(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AccountingPage({ token, unlocked, organisationName }: { token: string; unlocked: boolean; organisationName: string }) {
  const [data, setData] = useState<AccountingData | null>(null);
  const [section, setSection] = useState<'overview' | 'documents' | 'reconciliation' | 'accounts' | 'journals' | 'reports' | 'corrections' | 'exdox'>('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [account, setAccount] = useState({ code: '', name: '', type: 'expense' as AccountingAccount['type'] });
  const [journal, setJournal] = useState({ date: today(), reference: '', description: '' });
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);
  const [through, setThrough] = useState(today());
  const [document, setDocument] = useState({ kind: 'invoice' as 'invoice' | 'bill', number: '', contactName: '', issuerName: organisationName, issuerAddress: '', contactAddress: '', vatNumber: '', paymentInstructions: '', date: today(), dueDate: today() });
  const [documentItems, setDocumentItems] = useState([{ description: '', quantity: '1', unitPrice: '', vatRate: '20' }]);
  const [payment, setPayment] = useState({ documentId: '', date: today(), amount: '', reference: '' });
  const [printDocument, setPrintDocument] = useState<AccountingDocument | null>(null);

  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    getAccounting(token).then((result) => { if (active) setData(result); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load accounting.'); });
    return () => { active = false; };
  }, [token, unlocked]);
  useEffect(() => {
    const clearPrint = () => setPrintDocument(null);
    window.addEventListener('afterprint', clearPrint);
    return () => window.removeEventListener('afterprint', clearPrint);
  }, []);
  useEffect(() => {
    if (organisationName) setDocument((current) => current.issuerName ? current : { ...current, issuerName: organisationName });
  }, [organisationName]);

  const report = useMemo(() => {
    if (!data) return null;
    const entries = data.entries.filter((entry) => entry.date <= through);
    const balances = data.accounts.map((item) => {
      let debitPence = 0; let creditPence = 0;
      for (const entry of entries) for (const line of entry.lines) if (line.accountId === item.id) { debitPence += line.debitPence; creditPence += line.creditPence; }
      return { ...item, debitPence, creditPence, balancePence: debitPence - creditPence };
    });
    const net = (type: AccountingAccount['type']) => balances.filter((item) => item.type === type).reduce((sum, item) => sum + item.balancePence, 0);
    const profitPence = -net('income') - net('expense');
    return { balances, entries, profitPence, assetsPence: net('asset'), liabilitiesPence: -net('liability'), equityPence: -net('equity') + profitPence };
  }, [data, through]);

  if (!unlocked) return <div className="stack-page"><section className="panel accounting-locked"><h2>Accounting</h2><p>This workspace is locked for your account.</p><span className="sidebar-lock-tag">Locked</span></section></div>;

  async function saveAccount(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await addAccountingAccount(token, account);
      setData(await getAccounting(token)); setAccount({ code: '', name: '', type: 'expense' });
      setMessage('Account added to the chart.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add account.'); }
    finally { setBusy(false); }
  }
  async function saveJournal(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const payload = { ...journal, lines: lines.map((line) => ({ accountId: line.accountId, debitPence: toPence(line.debit), creditPence: toPence(line.credit) })) };
      await postAccountingJournal(token, payload);
      setData(await getAccounting(token)); setJournal({ date: today(), reference: '', description: '' }); setLines([emptyLine(), emptyLine()]);
      setMessage('Balanced journal posted. It is retained in the audit history.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not post journal.'); }
    finally { setBusy(false); }
  }
  function exportJournal() {
    if (!data) return;
    const accountNames = new Map(data.accounts.map((item) => [item.id, `${item.code} ${item.name}`]));
    csvDownload('exdox-accounting-journal.csv', [['Date', 'Reference', 'Description', 'Account', 'Debit GBP', 'Credit GBP', 'Posted at', 'Posted by'], ...data.entries.flatMap((entry: AccountingEntry) => entry.lines.map((line) => [entry.date, entry.reference, entry.description, accountNames.get(line.accountId) ?? line.accountId, (line.debitPence / 100).toFixed(2), (line.creditPence / 100).toFixed(2), entry.createdAt, entry.createdBy]))]);
  }
  async function saveDocument(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await postAccountingDocument(token, { ...document, items: documentItems.map((item) => ({ description: item.description, quantity: Number(item.quantity), unitPricePence: toPence(item.unitPrice), vatRate: Number(item.vatRate) as 0 | 5 | 20 })) });
      setData(await getAccounting(token));
      setDocument({ ...document, number: '', contactName: '' }); setDocumentItems([{ description: '', quantity: '1', unitPrice: '', vatRate: '20' }]);
      setMessage(`${document.kind === 'invoice' ? 'Invoice' : 'Bill'} posted to the ledger.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save document.'); }
    finally { setBusy(false); }
  }
  async function savePayment(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await postAccountingPayment(token, { documentId: payment.documentId, date: payment.date, amountPence: toPence(payment.amount), reference: payment.reference });
      setData(await getAccounting(token)); setPayment({ documentId: '', date: today(), amount: '', reference: '' });
      setMessage('Payment recorded in the ledger.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not record payment.'); }
    finally { setBusy(false); }
  }
  const reversedIds = new Set((data?.reversals ?? []).map((item) => item.targetEntryId));
  const amountDue = (item: AccountingDocument) => reversedIds.has(`document-${item.id}`) ? 0 : item.totalPence - (data?.payments ?? []).filter((entry) => entry.documentId === item.id && !reversedIds.has(`payment-${entry.id}`)).reduce((sum, entry) => sum + entry.amountPence, 0) - (data?.creditNotes ?? []).filter((entry) => entry.documentId === item.id && !reversedIds.has(`credit-${entry.id}`)).reduce((sum, entry) => sum + entry.totalPence, 0);
  function printInvoice(item: AccountingDocument) {
    setPrintDocument(item);
    setTimeout(() => window.print(), 80);
  }

  return <div className="stack-page accounting-page">
    <section className="panel accounting-heading"><div><span className="eyebrow">Private accounting workspace</span><h2>Accounting</h2><p>Double entry books for the selected Exdox organisation. Figures below are in GBP.</p></div><span className="accounting-pilot">Private pilot</span></section>
    <nav className="accounting-tabs" aria-label="Accounting sections">
      {(['overview', 'documents', 'reconciliation', 'accounts', 'journals', 'reports', 'corrections', 'exdox'] as const).map((item) => <button type="button" key={item} className={section === item ? 'active' : ''} onClick={() => { setSection(item); setError(''); setMessage(''); }}>{item === 'journals' ? 'Journal & ledger' : item === 'documents' ? 'Invoices & bills' : item === 'reconciliation' ? 'Bank reconciliation' : item === 'corrections' ? 'Corrections & locks' : item === 'exdox' ? 'Post Exdox records' : item[0].toUpperCase() + item.slice(1)}</button>)}
    </nav>
    {error && <div className="notice-banner" role="alert">{error}</div>}{message && <div className="success-banner" role="status">{message}</div>}
    {!data ? <section className="panel">Loading accounting records…</section> : null}
    {data && section === 'overview' ? <>
      <div className="accounting-cards"><section className="panel"><span>Bank balance</span><strong>{money(data.report.balances.find((item) => item.code === '1000')?.balancePence ?? 0)}</strong></section><section className="panel"><span>Profit to date</span><strong>{money(data.report.profitPence)}</strong></section><section className="panel"><span>Journal entries</span><strong>{data.report.journalCount}</strong></section></div>
      <section className="panel"><h3>Books at a glance</h3><p>Post a balanced journal to record opening balances, sales, purchases, tax, or payments. The chart of accounts and reports update from posted entries.</p><div className="accounting-actions"><button className="primary-action" type="button" onClick={() => setSection('journals')}>Post a journal</button><button className="secondary-action" type="button" onClick={() => setSection('reports')}>View reports</button></div></section>
      <section className="panel"><h3>Recent entries</h3>{data.entries.length ? <div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Amount</th></tr></thead><tbody>{data.entries.slice(0, 8).map((entry) => <tr key={entry.id}><td>{entry.date}</td><td>{entry.reference || '—'}</td><td>{entry.description}</td><td>{money(entry.lines.reduce((sum, line) => sum + line.debitPence, 0))}</td></tr>)}</tbody></table></div> : <p>No journals have been posted.</p>}</section>
    </> : null}
    {data && section === 'reconciliation' ? <AccountingReconciliation data={data} token={token} onRefresh={async () => setData(await getAccounting(token))} /> : null}
    {data && section === 'corrections' ? <AccountingControls data={data} token={token} onRefresh={async () => setData(await getAccounting(token))} /> : null}
    {data && section === 'exdox' ? <AccountingSources token={token} onRefresh={async () => setData(await getAccounting(token))} /> : null}
    {data && section === 'documents' ? <>
      <section className="panel"><h3>Invoices and bills</h3><p>Posted documents create receivables or payables in the accounting ledger. Record payments separately as money moves.</p><div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Type</th><th>Number</th><th>Contact</th><th>Issued</th><th>Due</th><th>Total</th><th>Outstanding</th><th>Status</th><th></th></tr></thead><tbody>{data.documents.map((item) => <tr key={item.id}><td>{item.kind}</td><td>{item.number}</td><td>{item.contactName}</td><td>{item.date}</td><td>{item.dueDate}</td><td>{money(item.totalPence)}</td><td>{money(amountDue(item))}</td><td>{reversedIds.has(`document-${item.id}`) ? 'Voided' : 'Posted'}</td><td>{item.kind === 'invoice' && !reversedIds.has(`document-${item.id}`) && <button type="button" onClick={() => printInvoice(item)}>Print</button>}</td></tr>)}</tbody></table></div>{!data.documents.length && <p>No invoices or bills posted yet.</p>}</section>
      <section className="panel"><h3>Create invoice or bill</h3><form onSubmit={saveDocument}><div className="accounting-form"><label>Type<select value={document.kind} onChange={(event) => setDocument({ ...document, kind: event.target.value as 'invoice' | 'bill' })}><option value="invoice">Sales invoice</option><option value="bill">Purchase bill</option></select></label><label>Number<input required value={document.number} maxLength={80} onChange={(event) => setDocument({ ...document, number: event.target.value })} /></label><label>{document.kind === 'invoice' ? 'Customer' : 'Supplier'}<input required value={document.contactName} maxLength={120} onChange={(event) => setDocument({ ...document, contactName: event.target.value })} /></label><label>Issue date<input type="date" required value={document.date} onChange={(event) => setDocument({ ...document, date: event.target.value })} /></label><label>Due date<input type="date" required value={document.dueDate} onChange={(event) => setDocument({ ...document, dueDate: event.target.value })} /></label></div>{document.kind === 'invoice' && <div className="accounting-form accounting-invoice-details"><label>Your business name<input required value={document.issuerName} onChange={(event) => setDocument({ ...document, issuerName: event.target.value })} /></label><label>Your business address<textarea required rows={3} value={document.issuerAddress} onChange={(event) => setDocument({ ...document, issuerAddress: event.target.value })} /></label><label>Customer address<textarea required rows={3} value={document.contactAddress} onChange={(event) => setDocument({ ...document, contactAddress: event.target.value })} /></label><label>VAT number, if registered<input value={document.vatNumber} onChange={(event) => setDocument({ ...document, vatNumber: event.target.value })} /></label><label>Payment instructions<textarea rows={3} value={document.paymentInstructions} onChange={(event) => setDocument({ ...document, paymentInstructions: event.target.value })} /></label></div>}<div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Description</th><th>Quantity</th><th>Unit price £</th><th>VAT</th><th></th></tr></thead><tbody>{documentItems.map((item, index) => <tr key={index}><td><input required aria-label={`Item ${index + 1} description`} value={item.description} onChange={(event) => setDocumentItems(documentItems.map((current, position) => position === index ? { ...current, description: event.target.value } : current))} /></td><td><input required inputMode="numeric" aria-label={`Item ${index + 1} quantity`} value={item.quantity} onChange={(event) => setDocumentItems(documentItems.map((current, position) => position === index ? { ...current, quantity: event.target.value } : current))} /></td><td><input required inputMode="decimal" aria-label={`Item ${index + 1} unit price`} value={item.unitPrice} onChange={(event) => setDocumentItems(documentItems.map((current, position) => position === index ? { ...current, unitPrice: event.target.value } : current))} /></td><td><select aria-label={`Item ${index + 1} VAT`} value={item.vatRate} onChange={(event) => setDocumentItems(documentItems.map((current, position) => position === index ? { ...current, vatRate: event.target.value } : current))}><option value="20">20%</option><option value="5">5%</option><option value="0">0%</option></select></td><td>{documentItems.length > 1 && <button type="button" onClick={() => setDocumentItems(documentItems.filter((_, position) => position !== index))}>Remove</button>}</td></tr>)}</tbody></table></div><div className="accounting-actions"><button type="button" className="secondary-action" onClick={() => setDocumentItems([...documentItems, { description: '', quantity: '1', unitPrice: '', vatRate: '20' }])}>Add item</button><button type="submit" className="primary-action" disabled={busy}>{busy ? 'Posting…' : 'Post document'}</button></div></form></section>
      <section className="panel"><h3>Record a payment</h3><form className="accounting-form" onSubmit={savePayment}><label>Document<select required value={payment.documentId} onChange={(event) => setPayment({ ...payment, documentId: event.target.value })}><option value="">Choose unpaid document</option>{data.documents.filter((item) => amountDue(item) > 0).map((item) => <option key={item.id} value={item.id}>{item.kind} {item.number} — {money(amountDue(item))} due</option>)}</select></label><label>Date<input type="date" required value={payment.date} onChange={(event) => setPayment({ ...payment, date: event.target.value })} /></label><label>Amount £<input required inputMode="decimal" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} /></label><label>Reference<input value={payment.reference} maxLength={80} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} /></label><button className="primary-action" type="submit" disabled={busy}>Record payment</button></form></section>
    </> : null}
    {data && section === 'accounts' ? <>
      <section className="panel"><h3>Chart of accounts</h3><div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Balance</th></tr></thead><tbody>{data.accounts.slice().sort((a, b) => a.code.localeCompare(b.code)).map((item) => <tr key={item.id}><td>{item.code}</td><td>{item.name}</td><td>{item.type}</td><td>{money(data.report.balances.find((balance) => balance.id === item.id)?.balancePence ?? 0)}</td></tr>)}</tbody></table></div></section>
      <section className="panel"><h3>Add account</h3><form className="accounting-form" onSubmit={saveAccount}><label>Code<input required inputMode="numeric" minLength={4} maxLength={6} value={account.code} onChange={(event) => setAccount({ ...account, code: event.target.value })} /></label><label>Name<input required value={account.name} maxLength={100} onChange={(event) => setAccount({ ...account, name: event.target.value })} /></label><label>Type<select value={account.type} onChange={(event) => setAccount({ ...account, type: event.target.value as AccountingAccount['type'] })}>{(['asset', 'liability', 'equity', 'income', 'expense'] as const).map((type) => <option key={type} value={type}>{type}</option>)}</select></label><button className="primary-action" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add account'}</button></form></section>
    </> : null}
    {data && section === 'journals' ? <>
      <section className="panel"><h3>Post a journal</h3><p>Enter a debit or a credit on each line. Totals must match before posting.</p><form onSubmit={saveJournal}><div className="accounting-form"><label>Date<input type="date" required value={journal.date} onChange={(event) => setJournal({ ...journal, date: event.target.value })} /></label><label>Reference<input value={journal.reference} maxLength={80} onChange={(event) => setJournal({ ...journal, reference: event.target.value })} /></label><label>Description<input required value={journal.description} maxLength={240} onChange={(event) => setJournal({ ...journal, description: event.target.value })} /></label></div><div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Account</th><th>Debit £</th><th>Credit £</th><th></th></tr></thead><tbody>{lines.map((line, index) => <tr key={index}><td><select required aria-label={`Line ${index + 1} account`} value={line.accountId} onChange={(event) => setLines(lines.map((current, position) => position === index ? { ...current, accountId: event.target.value } : current))}><option value="">Choose account</option>{data.accounts.slice().sort((a, b) => a.code.localeCompare(b.code)).map((item) => <option key={item.id} value={item.id}>{item.code} {item.name}</option>)}</select></td><td><input inputMode="decimal" aria-label={`Line ${index + 1} debit`} value={line.debit} onChange={(event) => setLines(lines.map((current, position) => position === index ? { ...current, debit: event.target.value, credit: '' } : current))} /></td><td><input inputMode="decimal" aria-label={`Line ${index + 1} credit`} value={line.credit} onChange={(event) => setLines(lines.map((current, position) => position === index ? { ...current, credit: event.target.value, debit: '' } : current))} /></td><td>{lines.length > 2 && <button type="button" onClick={() => setLines(lines.filter((_, position) => position !== index))}>Remove</button>}</td></tr>)}</tbody><tfoot><tr><th>Total</th><th>{money(lines.reduce((sum, line) => { try { return sum + toPence(line.debit); } catch { return sum; } }, 0))}</th><th>{money(lines.reduce((sum, line) => { try { return sum + toPence(line.credit); } catch { return sum; } }, 0))}</th><th></th></tr></tfoot></table></div><div className="accounting-actions"><button type="button" className="secondary-action" onClick={() => setLines([...lines, emptyLine()])}>Add line</button><button type="submit" className="primary-action" disabled={busy}>{busy ? 'Posting…' : 'Post journal'}</button></div></form></section>
      <section className="panel"><div className="accounting-section-heading"><h3>Posted journal</h3><button type="button" className="secondary-action" onClick={exportJournal}>Export CSV</button></div>{data.entries.length ? <div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>{data.entries.flatMap((entry) => entry.lines.map((line, index) => <tr key={`${entry.id}-${index}`}><td>{index === 0 ? entry.date : ''}</td><td>{index === 0 ? entry.reference : ''}</td><td>{index === 0 ? entry.description : ''}</td><td>{data.accounts.find((item) => item.id === line.accountId)?.name ?? line.accountId}</td><td>{line.debitPence ? money(line.debitPence) : ''}</td><td>{line.creditPence ? money(line.creditPence) : ''}</td></tr>))}</tbody></table></div> : <p>No journals have been posted.</p>}</section>
    </> : null}
    {data && report && section === 'reports' ? <>
      <section className="panel"><div className="accounting-section-heading"><h3>Financial reports</h3><label>Through date <input type="date" value={through} onChange={(event) => setThrough(event.target.value)} /></label></div><p>Reports include posted journals dated on or before the selected date.</p><div className="accounting-cards"><div><span>Profit and loss</span><strong>{money(report.profitPence)}</strong></div><div><span>Assets</span><strong>{money(report.assetsPence)}</strong></div><div><span>Liabilities</span><strong>{money(report.liabilitiesPence)}</strong></div><div><span>Equity including profit</span><strong>{money(report.equityPence)}</strong></div></div><div className="accounting-actions"><button type="button" className="secondary-action" onClick={() => csvDownload(`exdox-trial-balance-${through}.csv`, [['Code', 'Account', 'Type', 'Debit GBP', 'Credit GBP'], ...report.balances.map((item) => [item.code, item.name, item.type, (Math.max(item.balancePence, 0) / 100).toFixed(2), (Math.max(-item.balancePence, 0) / 100).toFixed(2)])])}>Export trial balance</button></div></section>
      <section className="panel"><h3>Trial balance</h3><div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Code</th><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>{report.balances.filter((item) => item.balancePence !== 0).sort((a, b) => a.code.localeCompare(b.code)).map((item) => <tr key={item.id}><td>{item.code}</td><td>{item.name}</td><td>{item.balancePence > 0 ? money(item.balancePence) : ''}</td><td>{item.balancePence < 0 ? money(-item.balancePence) : ''}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Total</th><th>{money(report.balances.reduce((sum, item) => sum + Math.max(item.balancePence, 0), 0))}</th><th>{money(report.balances.reduce((sum, item) => sum + Math.max(-item.balancePence, 0), 0))}</th></tr></tfoot></table></div></section>
      <section className="panel"><h3>Profit and loss</h3><div className="accounting-table-wrap"><table className="accounting-table"><tbody>{report.balances.filter((item) => item.type === 'income' || item.type === 'expense').map((item) => <tr key={item.id}><td>{item.code} {item.name}</td><td>{money(item.type === 'income' ? -item.balancePence : item.balancePence)}</td></tr>)}<tr><th>Net profit</th><th>{money(report.profitPence)}</th></tr></tbody></table></div></section>
      <section className="panel"><h3>Balance sheet</h3><div className="accounting-table-wrap"><table className="accounting-table"><tbody><tr><th>Assets</th><td>{money(report.assetsPence)}</td></tr><tr><th>Liabilities</th><td>{money(report.liabilitiesPence)}</td></tr><tr><th>Equity including current profit</th><td>{money(report.equityPence)}</td></tr></tbody></table></div></section>
    </> : null}
    {printDocument && <div className="accounting-print"><h1>Invoice</h1><p><strong>{printDocument.issuerName}</strong><br />{printDocument.issuerAddress}</p><p><strong>Bill to:</strong> {printDocument.contactName}<br />{printDocument.contactAddress}</p><p>Invoice number: {printDocument.number}<br />Issued: {printDocument.date}<br />Due: {printDocument.dueDate}{printDocument.vatNumber && <><br />VAT number: {printDocument.vatNumber}</>}</p><table><thead><tr><th>Description</th><th>Quantity</th><th>Unit price</th><th>VAT</th><th>Net</th></tr></thead><tbody>{printDocument.items.map((item, index) => <tr key={index}><td>{item.description}</td><td>{item.quantity}</td><td>{money(item.unitPricePence)}</td><td>{item.vatRate}%</td><td>{money(item.quantity * item.unitPricePence)}</td></tr>)}</tbody></table><p>Net: {money(printDocument.netPence)}<br />VAT: {money(printDocument.vatPence)}<br /><strong>Total: {money(printDocument.totalPence)}</strong></p>{printDocument.paymentInstructions && <p><strong>Payment instructions</strong><br />{printDocument.paymentInstructions}</p>}</div>}
  </div>;
}
