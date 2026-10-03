import { useMemo, useState } from 'react';
import { importAccountingBankStatement, matchAccountingBankLine, unmatchAccountingBankLine, type AccountingData, type AccountingStatementLine } from './api';

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
  const statements = data.bankStatements ?? [];
  const matches = data.bankMatches ?? [];
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [opening, setOpening] = useState('');
  const [closing, setClosing] = useState('');
  const [lines, setLines] = useState<ImportedLine[]>([]);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const selected = statements.find((item) => item.id === selectedId) ?? statements[0];
  const statementMatches = matches.filter((item) => item.statementId === selected?.id);
  const usedBankIds = new Set(matches.map((item) => item.bankEntryId));
  const bankEntries = useMemo(() => data.entries.flatMap((entry) => entry.lines.flatMap((line, index) => line.accountId === '1000' ? [{ id: `${entry.id}:${index}`, date: entry.date, reference: entry.reference, description: entry.description, amountPence: line.debitPence - line.creditPence }] : [])), [data.entries]);
  const bankBalance = selected ? bankEntries.filter((item) => item.date <= selected.toDate).reduce((sum, item) => sum + item.amountPence, 0) : 0;
  const unmatchedLedger = selected ? bankEntries.filter((item) => item.date >= selected.fromDate && item.date <= selected.toDate && !usedBankIds.has(item.id)).length : 0;
  const remaining = selected ? selected.lines.length - statementMatches.length : 0;
  const difference = selected ? selected.closingPence - bankBalance : 0;

  async function loadFile(file: File | undefined) {
    if (!file) return;
    setError(''); setMessage('');
    try {
      if (file.size > 1024 * 1024) throw new Error('CSV must be under 1 MB.');
      const parsed = parseStatement(await file.text());
      setLines(parsed); setName(file.name.replace(/\.csv$/i, ''));
      setMessage(`${parsed.length} transactions ready. Enter the statement balances, then import.`);
    } catch (cause) { setLines([]); setError(cause instanceof Error ? cause.message : 'Could not read CSV.'); }
  }
  async function importStatement() {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await importAccountingBankStatement(token, { name, openingPence: parseMoney(opening), closingPence: parseMoney(closing), lines });
      await onRefresh(); setSelectedId(result.statement.id); setLines([]);
      setMessage(result.alreadyImported ? 'This exact statement was already imported.' : 'Statement imported. Match its lines to bank transactions in the ledger.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not import statement.'); }
    finally { setBusy(false); }
  }
  async function updateMatch(lineIndex: number, bankEntryId?: string) {
    if (!selected) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (bankEntryId) await matchAccountingBankLine(token, { statementId: selected.id, lineIndex, bankEntryId });
      else await unmatchAccountingBankLine(token, { statementId: selected.id, lineIndex });
      await onRefresh(); setChoices((current) => ({ ...current, [lineIndex]: '' }));
      setMessage(bankEntryId ? 'Statement line matched.' : 'Match removed.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update match.'); }
    finally { setBusy(false); }
  }

  return <>
    <section className="panel"><h3>Import a bank statement</h3><p>Use a GBP CSV with Date, Description, and signed Amount columns, or separate Debit and Credit columns. Dates can be YYYY-MM-DD or DD/MM/YYYY. Importing does not post anything to the ledger.</p><div className="accounting-form"><label>CSV file<input type="file" accept=".csv,text/csv" onChange={(event) => void loadFile(event.target.files?.[0])} /></label><label>Statement name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Opening balance £<input inputMode="decimal" value={opening} onChange={(event) => setOpening(event.target.value)} /></label><label>Closing balance £<input inputMode="decimal" value={closing} onChange={(event) => setClosing(event.target.value)} /></label><button className="primary-action" type="button" disabled={busy || !lines.length || !name || !opening || !closing} onClick={() => void importStatement()}>Import statement</button></div>{lines.length > 0 && <p>Preview: {lines.length} lines, net movement {pounds(lines.reduce((sum, line) => sum + line.amountPence, 0))}. Opening plus movement must equal closing.</p>}</section>
    {error && <div className="notice-banner" role="alert">{error}</div>}{message && <div className="success-banner" role="status">{message}</div>}
    {statements.length > 0 && <section className="panel"><div className="accounting-section-heading"><h3>Reconcile statement</h3><label>Statement<select value={selected?.id ?? ''} onChange={(event) => { setSelectedId(event.target.value); setChoices({}); }}>{statements.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.fromDate} to {item.toDate})</option>)}</select></label></div>{selected && <><div className="accounting-cards"><div><span>Statement closing</span><strong>{pounds(selected.closingPence)}</strong></div><div><span>Ledger bank balance at {selected.toDate}</span><strong>{pounds(bankBalance)}</strong></div><div><span>Difference</span><strong>{pounds(difference)}</strong></div><div><span>Unmatched statement lines</span><strong>{remaining}</strong></div><div><span>Unmatched ledger movements in period</span><strong>{unmatchedLedger}</strong></div></div><p>{remaining === 0 && unmatchedLedger === 0 && difference === 0 ? 'Reconciled: every statement line and ledger movement is matched, and the closing balance agrees.' : 'Match each statement movement to a posted bank transaction. Post any missing transaction as a journal or payment first, then refresh this page.'}</p><div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Ledger match</th><th>Action</th></tr></thead><tbody>{selected.lines.map((line) => { const match = statementMatches.find((item) => item.lineIndex === line.index); const candidates = bankEntries.filter((item) => item.amountPence === line.amountPence && !usedBankIds.has(item.id)).sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(line.date)) - Math.abs(Date.parse(b.date) - Date.parse(line.date))); return <tr key={line.index}><td>{line.date}</td><td>{line.description}{line.reference && <small> · {line.reference}</small>}</td><td>{pounds(line.amountPence)}</td><td>{match ? bankEntries.find((item) => item.id === match.bankEntryId)?.description ?? 'Matched entry' : <select aria-label={`Match statement row ${line.index + 1}`} value={choices[line.index] ?? ''} onChange={(event) => setChoices((current) => ({ ...current, [line.index]: event.target.value }))}><option value="">Choose exact amount</option>{candidates.map((item) => <option key={item.id} value={item.id}>{item.date} · {item.description} · {pounds(item.amountPence)}</option>)}</select>}</td><td>{match ? <button type="button" disabled={busy} onClick={() => void updateMatch(line.index)}>Unmatch</button> : <button type="button" disabled={busy || !choices[line.index]} onClick={() => void updateMatch(line.index, choices[line.index])}>Match</button>}</td></tr>; })}</tbody></table></div></>}</section>}
    {!statements.length && <section className="panel"><p>No bank statements imported yet.</p></section>}
  </>;
}
