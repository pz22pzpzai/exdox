import { useEffect, useState } from 'react';
import { saveAccountingReminderSettings, type AccountingData, type AccountingEmailRecord } from './api';

const allowedDays = [7, 14, 30];
const statusText: Record<AccountingEmailRecord['status'], string> = { pending: 'Sending status pending', accepted: 'Accepted for delivery', delivered: 'Delivered to mail server', delayed: 'Delivery delayed', bounced: 'Bounced', complained: 'Spam complaint', rejected: 'Rejected', uncertain: 'Check delivery before retrying' };

export default function AccountingInvoiceReminders({ token, data, onRefresh }: { token: string; data: AccountingData; onRefresh: () => Promise<void> }) {
  const [enabled, setEnabled] = useState(data.reminderSettings.enabled);
  const [days, setDays] = useState(data.reminderSettings.days);
  const [replyToEmail, setReplyToEmail] = useState(data.reminderSettings.replyToEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setEnabled(data.reminderSettings.enabled); setDays(data.reminderSettings.days); setReplyToEmail(data.reminderSettings.replyToEmail); }, [data.reminderSettings]);
  async function update(payload: { enabled: boolean; days: number[]; replyToEmail: string } | { action: 'exclude' | 'include'; documentId: string }) {
    setBusy(true); setError(''); setMessage('');
    try { await saveAccountingReminderSettings(token, payload); await onRefresh(); setMessage('Reminder settings saved.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save reminder settings.'); }
    finally { setBusy(false); }
  }
  const latest = (documentId: string, kind: AccountingEmailRecord['kind']) => data.emailRecords.filter((item) => item.documentId === documentId && item.kind === kind).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0];
  return <section className="panel"><h3>Invoice email and overdue reminders</h3><p>Email status shows whether the recipient’s mail server accepted the message. It does not show whether the customer opened it. Automatic reminders are off until you enable them. They go only to the address used for an invoice delivered through Accounting, and stop when the invoice is fully paid, fully credited, voided, or excluded.</p>
    {error && <p className="notice-banner" role="alert">{error}</p>}{message && <p className="success-banner" role="status">{message}</p>}
    <form onSubmit={(event) => { event.preventDefault(); void update({ enabled, days, replyToEmail }); }}><div className="accounting-form"><label><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /> Enable automatic reminders</label><label>Business reply-to email<input type="email" required={enabled} value={replyToEmail} onChange={(event) => setReplyToEmail(event.target.value)} /></label><fieldset><legend>Days after due date</legend>{allowedDays.map((day) => <label key={day}><input type="checkbox" checked={days.includes(day)} onChange={(event) => setDays(event.target.checked ? [...days, day].sort((a, b) => a - b) : days.filter((item) => item !== day))} /> {day} days</label>)}</fieldset></div><button type="submit" className="primary-action" disabled={busy || !days.length}>Save reminder settings</button></form>
    <div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Last invoice email</th><th>Last reminder</th><th>Reminders</th><th></th></tr></thead><tbody>{data.documents.filter((item) => item.kind === 'invoice').map((invoice) => { const sent = latest(invoice.id, 'invoice'); const reminder = latest(invoice.id, 'reminder'); const excluded = data.reminderSettings.excludedDocumentIds.includes(invoice.id); return <tr key={invoice.id}><td>{invoice.number}</td><td>{invoice.contactName}</td><td>{sent ? `${statusText[sent.status]} · ${sent.recipient}` : 'Not emailed through Accounting'}</td><td>{reminder ? `${reminder.milestoneDay} days · ${statusText[reminder.status]}` : 'None'}</td><td>{excluded ? 'Off for this invoice' : data.reminderSettings.enabled ? 'On' : 'Off globally'}</td><td><button type="button" disabled={busy} onClick={() => void update({ action: excluded ? 'include' : 'exclude', documentId: invoice.id })}>{excluded ? 'Allow' : 'Exclude'}</button></td></tr>; })}</tbody></table></div>
  </section>;
}
