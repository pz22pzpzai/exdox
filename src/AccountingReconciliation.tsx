import { useMemo, useState } from 'react';
import { importAccountingBankStatement, matchAccountingBankLine, postAccountingBankRule, postAccountingBankTransfer, saveAccountingBankRule, unmatchAccountingBankLine, type AccountingData, type AccountingStatementLine } from './api';

const pounds = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
type ImportedLine = Omit<AccountingStatementLine, 'index'>;

function parseMoney(value: string) {
  const clean = value.trim().replace(/[,£\s]/g, '').replace(/^\((.*)\)$/, '-$1');
  if (!clean) return 0;
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) throw new Error(`Invalid amount: ${value}`);
  const negative = clean.startsWith('-');
  const [whole, decimals = ''] = (negative ? clean.slice(1) : clean).split('.');
  const amount = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount)) throw new Error('Amount is too large.');
  return negative ? -amount : amount;
}
function csvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (char === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csv[i + 1] === '\n') i += 1;
      row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('CSV has an unfinished quoted value.');
  row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}
function isoDate(value: string) {
  const date = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const match = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(date);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  throw new Error(`Unsupported date: ${value}. Use YYYY-MM-DD or DD/MM/YYYY.`);
}
function parseStatement(csv: string): ImportedLine[] {
  const rows = csvRows(csv.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('CSV needs a header and at least one transaction.');
  const headers = rows[0].map((value) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
  const column = (...names: string[]) => headers.findIndex((value) => names.includes(value));
  const dateCol = column('date', 'transactiondate', 'bookingdate', 'valuedate');
  const descriptionCol = column('description', 'details', 'narrative', 'merchant', 'transactiondescription');
  const amountCol = column('amount', 'transactionamount', 'amountgbp');
  const debitCol = column('debit', 'withdrawal', 'moneyout', 'paidout');
  const creditCol = column('credit', 'deposit', 'moneyin', 'paidin');
  const referenceCol = column('reference', 'transactionid', 'transactionreference');
  if (dateCol < 0 || descriptionCol < 0 || (amountCol < 0 && (debitCol < 0 || creditCol < 0))) throw new Error('CSV needs Date, Description, and Amount columns, or separate Debit and Credit columns.');
  if (rows.length > 501) throw new Error('Import up to 500 transactions at a time.');
  return rows.slice(1).map((row, index) => {
    const value = (columnIndex: number) => columnIndex < 0 ? '' : row[columnIndex] ?? '';
    const amountPence = amountCol >= 0 ? parseMoney(value(amountCol)) : parseMoney(value(creditCol)) - parseMoney(value(debitCol));
    if (!amountPence) throw new Error(`Row ${index + 2} has no bank movement.`);
    return { date: isoDate(value(dateCol)), description: value(descriptionCol).trim(), reference: value(referenceCol).trim(), amountPence };
  });
}

export default function AccountingReconciliation({ data, token, onRefresh }: { data: AccountingData; token: string; onRefresh: () => Promise<void> }) {
  const bankAccounts = data.accounts.filter((item) => item.bank);
  const statements = data.bankStatements ?? [];
  const matches = data.bankMatches ?? [];
  const [selectedId, setSelectedId] = useState('');
  const [accountId, setAccountId] = useState('1000');
  const [name, setName] = useState('');
  const [opening, setOpening] = useState('');
  const [closing, setClosing] = useState('');
  const [lines, setLines] = useState<ImportedLine[]>([]);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [rule, setRule] = useState({ id: '', version: 0, accountId: '1000', contains: '', direction: 'both' as 'in' | 'out' | 'both', counterAccountId: '', enabled: true });
  const [transfer, setTransfer] = useState({ requestId: crypto.randomUUID(), fromAccountId: '1000', toAccountId: '', date: new Date().toISOString().slice(0, 10), amount: '', reference: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const selected = statements.find((item) => item.id === selectedId) ?? statements[0];
  const statementMatches = matches.filter((item) => item.statementId === selected?.id);
  const usedBankIds = new Set(matches.map((item) => item.bankEntryId));
  const bankEntries = useMemo(() => data.entries.flatMap((entry) => entry.lines.flatMap((line, index) => bankAccounts.some((account) => account.id === line.accountId) ? [{ id: `${entry.id}:${index}`, accountId: line.accountId, date: entry.date, reference: entry.reference, description: entry.description, amountPence: line.debitPence - line.creditPence }] : [])), [data.entries, data.accounts]);
  const selectedEntries = selected ? bankEntries.filter((item) => item.accountId === (selected.accountId ?? '1000')) : [];
  const bankBalance = selected ? selectedEntries.filter((item) => item.date <= selected.toDate).reduce((sum, item) => sum + item.amountPence, 0) : 0;
  const unmatchedLedger = selected ? selectedEntries.filter((item) => item.date >= selected.fromDate && item.date <= selected.toDate && !usedBankIds.has(item.id)).length : 0;
  const remaining = selected ? selected.lines.length - statementMatches.length : 0;
  const difference = selected ? selected.closingPence - bankBalance : 0;

  async function act(work: () => Promise<void>, success: string) {
    setBusy(true); setError(''); setMessage('');
    try { await work(); setMessage(success); try { await onRefresh(); } catch { setError('Saved, but the bank list could not refresh. Reload before posting anything else.'); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Bank action failed.'); }
    finally { setBusy(false); }
  }
  async function loadFile(file: File | undefined) {
    if (!file) return;
    setError(''); setMessage('');
    try {
      if (file.size > 1024 * 1024) throw new Error('CSV must be under 1 MB.');
      const parsed = parseStatement(await file.text());
      setLines(parsed); setName(file.name.replace(/\.csv$/i, ''));
      setMessage(`${parsed.length} transactions ready. Enter balances and review before import.`);
    } catch (cause) { setLines([]); setError(cause instanceof Error ? cause.message : 'Could not read CSV.'); }
  }
  async function importStatement() {
    await act(async () => {
      const result = await importAccountingBankStatement(token, { accountId, name, openingPence: parseMoney(opening), closingPence: parseMoney(closing), lines });
      setSelectedId(result.statement.id); setLines([]);
    }, 'Statement available. Review suggested matches and rules below.');
  }
  async function updateMatch(lineIndex: number, bankEntryId?: string) {
    if (!selected) return;
    await act(async () => {
      if (bankEntryId) await matchAccountingBankLine(token, { statementId: selected.id, lineIndex, bankEntryId });
      else await unmatchAccountingBankLine(token, { statementId: selected.id, lineIndex });
      setChoices((current) => ({ ...current, [lineIndex]: '' }));
    }, bankEntryId ? 'Statement line matched.' : 'Match removed.');
  }
  async function saveRule(event: React.FormEvent) {
    event.preventDefault();
    await act(async () => {
      await saveAccountingBankRule(token, { ...rule, id: rule.id || undefined, version: rule.version || undefined });
      setRule({ id: '', version: 0, accountId: rule.accountId, contains: '', direction: 'both', counterAccountId: '', enabled: true });
    }, 'Bank rule saved. It suggests a posting; each line still needs review.');
  }
  async function applyRule(lineIndex: number, ruleId: string) {
    if (!selected) return;
    await act(() => postAccountingBankRule(token, { statementId: selected.id, lineIndex, ruleId }), 'Rule journal posted and statement line matched. Review VAT treatment if applicable.');
  }
  async function saveTransfer(event: React.FormEvent) {
    event.preventDefault();
    await act(async () => {
      await postAccountingBankTransfer(token, { fromAccountId: transfer.fromAccountId, toAccountId: transfer.toAccountId, date: transfer.date, amountPence: parseMoney(transfer.amount), reference: transfer.reference });
      setTransfer({ ...transfer, requestId: crypto.randomUUID(), amount: '', reference: '' });
    }, 'Transfer posted as equal and opposite bank movements. Match each side to its statement.');
  }

  return <>
    <section className="panel"><h3>Import a bank statement</h3><p>Upload a GBP CSV for a selected bank account. This is a manual import, not a live bank feed. Exact reimports are recognised; overlapping transaction exports are rejected so they cannot be counted twice.</p><div className="accounting-form">
      <label>Bank account<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.code} {item.name}</option>)}</select></label>
      <label>CSV file<input type="file" accept=".csv,text/csv" onChange={(event) => void loadFile(event.target.files?.[0])} /></label>
      <label>Statement name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Opening balance £<input inputMode="decimal" value={opening} onChange={(event) => setOpening(event.target.value)} /></label>
      <label>Closing balance £<input inputMode="decimal" value={closing} onChange={(event) => setClosing(event.target.value)} /></label>

      <button className="primary-action" type="button" disabled={busy || !lines.length || !name || !opening || !closing} onClick={() => void importStatement()}>Import statement</button>
    </div>{lines.length > 0 && <p>Preview: {lines.length} lines, net movement {pounds(lines.reduce((sum, line) => sum + line.amountPence, 0))}. Opening plus movement must equal closing.</p>}</section>
    {error && <div className="notice-banner" role="alert">{error}</div>}{message && <div className="success-banner" role="status">{message}</div>}
    <section className="panel"><h3>Bank rules</h3><p>Rules suggest a ledger account for repeated descriptions. Applying a rule posts one journal and matches the statement line after you review it. VAT treatment remains in VAT review.</p>
      {(data.bankRules ?? []).length > 0 && <div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Bank</th><th>Contains</th><th>Direction</th><th>Post against</th><th>Status</th><th></th></tr></thead><tbody>{data.bankRules.map((item) => <tr key={item.id}><td>{bankAccounts.find((account) => account.id === item.accountId)?.name ?? item.accountId}</td><td>{item.contains}</td><td>{item.direction}</td><td>{data.accounts.find((account) => account.id === item.counterAccountId)?.name ?? item.counterAccountId}</td><td>{item.enabled ? 'Enabled' : 'Disabled'}</td><td><button type="button" onClick={() => setRule(item)}>Edit</button></td></tr>)}</tbody></table></div>}
      <form className="accounting-form" onSubmit={saveRule}><label>Bank account<select value={rule.accountId} onChange={(event) => setRule({ ...rule, accountId: event.target.value })}>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Description contains<input required minLength={3} value={rule.contains} onChange={(event) => setRule({ ...rule, contains: event.target.value })} /></label><label>Direction<select value={rule.direction} onChange={(event) => setRule({ ...rule, direction: event.target.value as typeof rule.direction })}><option value="both">Both</option><option value="in">Money in</option><option value="out">Money out</option></select></label><label>Counter account<select required value={rule.counterAccountId} onChange={(event) => setRule({ ...rule, counterAccountId: event.target.value })}><option value="">Choose account</option>{data.accounts.filter((item) => !item.bank && !['1100', '1200', '2000', '2100'].includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.code} {item.name}</option>)}</select></label><label><input type="checkbox" checked={rule.enabled} onChange={(event) => setRule({ ...rule, enabled: event.target.checked })} /> Enabled</label><button className="secondary-action" disabled={busy}>{rule.id ? 'Update rule' : 'Add rule'}</button></form>
    </section>
    {bankAccounts.length > 1 && <section className="panel"><h3>Transfer between bank accounts</h3><form className="accounting-form" onSubmit={saveTransfer}><label>From<select value={transfer.fromAccountId} onChange={(event) => setTransfer({ ...transfer, fromAccountId: event.target.value })}>{bankAccounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>To<select required value={transfer.toAccountId} onChange={(event) => setTransfer({ ...transfer, toAccountId: event.target.value })}><option value="">Choose account</option>{bankAccounts.filter((item) => item.id !== transfer.fromAccountId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Date<input required type="date" value={transfer.date} onChange={(event) => setTransfer({ ...transfer, date: event.target.value })} /></label><label>Amount £<input required inputMode="decimal" value={transfer.amount} onChange={(event) => setTransfer({ ...transfer, amount: event.target.value })} /></label><label>Reference<input value={transfer.reference} onChange={(event) => setTransfer({ ...transfer, reference: event.target.value })} /></label><button className="primary-action" disabled={busy}>Post transfer</button></form></section>}
    {statements.length > 0 && <section className="panel"><div className="accounting-section-heading"><h3>Review and reconcile</h3><label>Statement<select value={selected?.id ?? ''} onChange={(event) => { setSelectedId(event.target.value); setChoices({}); }}>{statements.map((item) => <option key={item.id} value={item.id}>{bankAccounts.find((account) => account.id === (item.accountId ?? '1000'))?.name ?? 'Bank'} · {item.name} ({item.fromDate} to {item.toDate})</option>)}</select></label></div>{selected && <>
      <div className="accounting-cards"><div><span>Statement closing</span><strong>{pounds(selected.closingPence)}</strong></div><div><span>Ledger bank balance at {selected.toDate}</span><strong>{pounds(bankBalance)}</strong></div><div><span>Difference</span><strong>{pounds(difference)}</strong></div><div><span>Unmatched statement lines</span><strong>{remaining}</strong></div><div><span>Unmatched ledger movements</span><strong>{unmatchedLedger}</strong></div></div>
      <p>{remaining === 0 && unmatchedLedger === 0 && difference === 0 ? 'Reconciled: every statement line and ledger movement is matched, and the closing balance agrees.' : 'Review the suggested matches or rules. Post any missing transaction before matching it.'}</p>
      <div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Suggested match or rule</th><th>Action</th></tr></thead><tbody>{selected.lines.map((line) => {
        const match = statementMatches.find((item) => item.lineIndex === line.index);
        const suggested = (data.bankSuggestions ?? []).find((item) => item.statementId === selected.id && item.lineIndex === line.index);
        const ruleSuggestion = (data.ruleSuggestions ?? []).find((item) => item.statementId === selected.id && item.lineIndex === line.index);
        const candidates = selectedEntries.filter((item) => item.amountPence === line.amountPence && !usedBankIds.has(item.id)).sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(line.date)) - Math.abs(Date.parse(b.date) - Date.parse(line.date)));
        const choice = choices[line.index] ?? suggested?.bankEntryId ?? '';
        return <tr key={line.index}><td>{line.date}</td><td>{line.description}{line.reference && <small> · {line.reference}</small>}</td><td>{pounds(line.amountPence)}</td><td>{match ? selectedEntries.find((item) => item.id === match.bankEntryId)?.description ?? 'Matched entry' : <><select aria-label={`Match statement row ${line.index + 1}`} value={choice} onChange={(event) => setChoices((current) => ({ ...current, [line.index]: event.target.value }))}><option value="">Choose exact amount</option>{candidates.map((item) => <option key={item.id} value={item.id}>{item.date} · {item.description} · {pounds(item.amountPence)}</option>)}</select>{suggested && <small> Suggested: {suggested.reason}. Review before matching.</small>}{ruleSuggestion && <small> Rule suggests {data.accounts.find((item) => item.id === ruleSuggestion.counterAccountId)?.name ?? 'account'}.</small>}</>}</td><td>{match ? <button type="button" disabled={busy} onClick={() => void updateMatch(line.index)}>Unmatch</button> : <><button type="button" disabled={busy || !choice} onClick={() => void updateMatch(line.index, choice)}>Match</button>{ruleSuggestion && !suggested && <button type="button" disabled={busy} onClick={() => void applyRule(line.index, ruleSuggestion.ruleId)}>Apply rule &amp; match</button>}</>}</td></tr>;
      })}</tbody></table></div>
    </>}</section>}
    {!statements.length && <section className="panel"><p>No bank statements imported yet.</p></section>}
  </>;
}
