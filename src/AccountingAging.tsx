import { useEffect, useState } from 'react';
import { getAccountingAging, type AccountingAgingReport, type AccountingAgingSide } from './api';

const money = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
const columns: Array<[keyof AccountingAgingSide['buckets'], string]> = [['current', 'Current'], ['days1to30', '1–30 days'], ['days31to60', '31–60 days'], ['days61to90', '61–90 days'], ['days91plus', '91+ days'], ['credit', 'Credit balance']];

function downloadCsv(report: AccountingAgingReport) {
  const rows: string[][] = [['As of', 'Type', 'Contact', 'Number', 'Issued', 'Due', 'Days overdue', 'Original GBP', 'Outstanding GBP']];
  for (const [name, side] of [['Receivable', report.receivables], ['Payable', report.payables]] as const) {
    for (const row of side.rows) rows.push([report.asOf, name, row.contactName, row.number, row.issueDate, row.dueDate, String(row.daysOverdue), (row.originalPence / 100).toFixed(2), (row.outstandingPence / 100).toFixed(2)]);
    rows.push([report.asOf, name, 'Document total', '', '', '', '', '', (side.documentBalancePence / 100).toFixed(2)]);
    rows.push([report.asOf, name, 'Control account difference', '', '', '', '', '', (side.differencePence / 100).toFixed(2)]);
  }
  const csv = rows.map((row) => row.map((cell) => {
    const safe = /^[=+@\t\r]/.test(cell) || (/^-/.test(cell) && !/^-\d+(\.\d+)?$/.test(cell)) ? `'${cell}` : cell;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `exdox-aged-balances-${report.asOf}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Side({ title, side }: { title: string; side: AccountingAgingSide }) {
  return <section className="panel"><h3>{title}</h3><div className="accounting-cards">{columns.map(([key, label]) => <div key={key}><span>{label}</span><strong>{money(key === 'credit' ? -side.buckets[key] : side.buckets[key])}</strong></div>)}</div>
    <div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Contact</th><th>Number</th><th>Issued</th><th>Due</th><th>Days overdue</th><th>Outstanding</th></tr></thead><tbody>{side.rows.map((row) => <tr key={row.documentId}><td>{row.contactName}</td><td>{row.number}</td><td>{row.issueDate}</td><td>{row.dueDate}</td><td>{row.outstandingPence < 0 ? 'Credit' : row.daysOverdue}</td><td>{money(row.outstandingPence)}</td></tr>)}</tbody><tfoot><tr><th colSpan={5}>Open document balance</th><th>{money(side.documentBalancePence)}</th></tr></tfoot></table></div>
    {!side.rows.length && <p>No open documents at this date.</p>}{side.differencePence !== 0 && <p className="notice-banner">Control account differs by {money(side.differencePence)}. Review manual journals and one-time Exdox postings that are outside the invoice and bill list.</p>}
  </section>;
}

export default function AccountingAging({ token, asOf }: { token: string; asOf: string }) {
  const [report, setReport] = useState<AccountingAgingReport | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setReport(null); setError('');
    getAccountingAging(token, asOf).then((value) => { if (active) setReport(value); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load aged balances.'); });
    return () => { active = false; };
  }, [token, asOf]);
  if (error) return <section className="panel"><h3>Aged balances</h3><p role="alert">{error}</p></section>;
  if (!report) return <section className="panel"><h3>Aged balances</h3><p>Loading…</p></section>;
  return <><section className="panel"><div className="accounting-section-heading"><h3>Aged receivables and payables</h3><button type="button" className="secondary-action" onClick={() => downloadCsv(report)}>Export CSV</button></div><p>Open posted invoices and bills at {report.asOf}, grouped by days past their due date. Drafts are excluded. Credit balances are shown separately.</p></section><Side title="Customer invoices owed to this business" side={report.receivables} /><Side title="Supplier bills this business owes" side={report.payables} /></>;
}
