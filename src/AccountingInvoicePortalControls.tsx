import { useEffect, useState } from 'react';
import { getAccountingInvoicePaymentConnection, resolveAccountingInvoicePaymentReview, saveAccountingInvoiceLink, startAccountingInvoicePaymentConnection, type AccountingData } from './api';

export default function AccountingInvoicePortalControls({ token, data, onRefresh }: { token: string; data: AccountingData; onRefresh: () => Promise<void> }) {
  const [connection, setConnection] = useState<{ configured: boolean; connected: boolean; accountReady: boolean; eventsReady: boolean; ready: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resolution, setResolution] = useState('');
  const [reviewDocumentId, setReviewDocumentId] = useState('');
  useEffect(() => { let live = true; getAccountingInvoicePaymentConnection(token).then((result) => { if (live) setConnection(result); }).catch(() => { if (live) setConnection({ configured: false, connected: false, accountReady: false, eventsReady: false, ready: false }); }); return () => { live = false; }; }, [token]);
  async function changeLink(documentId: string, action: 'create' | 'revoke') {
    setBusy(true); setError(''); setMessage('');
    try { await saveAccountingInvoiceLink(token, documentId, action); await onRefresh(); setMessage(action === 'revoke' ? 'Invoice link revoked.' : 'Invoice link ready to share.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update invoice link.'); }
    finally { setBusy(false); }
  }
  async function connect() {
    setBusy(true); setError('');
    try {
      const url = new URL(await startAccountingInvoicePaymentConnection(token));
      if (url.protocol !== 'https:' || url.hostname !== 'connect.stripe.com') throw new Error('Stripe returned an unexpected onboarding address.');
      window.location.assign(url.toString());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start Stripe connection.'); setBusy(false); }
  }
  async function resolveReview(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await resolveAccountingInvoicePaymentReview(token, reviewDocumentId, resolution); await onRefresh(); setResolution(''); setReviewDocumentId(''); setMessage('Payment review recorded and online payment hold cleared.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not resolve payment review.'); }
    finally { setBusy(false); }
  }
  return <section className="panel"><h3>Customer invoice links and payments</h3><p>Share a private invoice link or email the invoice with a PDF attachment. Anyone with the link can view the invoice, so send it only to the customer. You can revoke a link at any time.</p><p>Online invoice payments go directly to your connected Stripe account. Your business pays Stripe's payment processing fees.</p>
    <p>{connection?.ready ? 'Stripe is ready to take customer payments for your business.' : connection?.accountReady ? 'Your Stripe account is ready. Exdox still needs its invoice payment, refund, and dispute webhook events enabled before Pay now can appear.' : connection?.connected ? 'Stripe connection needs more information before Pay now can appear.' : connection?.configured ? 'Connect your business Stripe account to offer Pay now on invoices.' : 'Online payments are unavailable until Stripe Connect is configured.'}</p>
    {connection?.configured && !connection.accountReady && <button type="button" disabled={busy} onClick={() => void connect()}>{connection.connected ? 'Continue Stripe setup' : 'Connect Stripe for invoice payments'}</button>}
    {error && <p className="notice-banner" role="alert">{error}</p>}{message && <p className="success-banner" role="status">{message}</p>}
    {!!data.invoicePaymentExceptions.length && <div className="notice-banner" role="alert"><strong>Payments needing review</strong>{data.invoicePaymentExceptions.map((item, index) => <p key={`${item.documentId}-${index}`}>Invoice {data.documents.find((doc) => doc.id === item.documentId)?.number ?? item.documentId}: {item.reason} Stripe amount £{(item.receivedPence / 100).toFixed(2)}; current balance £{(item.duePence / 100).toFixed(2)}.</p>)}<form onSubmit={(event) => void resolveReview(event)}><label>Invoice<select required value={reviewDocumentId} onChange={(event) => setReviewDocumentId(event.target.value)}><option value="">Choose invoice</option>{[...new Set(data.invoicePaymentExceptions.map((item) => item.documentId))].map((id) => <option key={id} value={id}>{data.documents.find((doc) => doc.id === id)?.number ?? id}</option>)}</select></label><label>How was this payment corrected?<textarea required minLength={15} maxLength={500} value={resolution} onChange={(event) => setResolution(event.target.value)} /></label><button type="submit" disabled={busy}>Mark review resolved</button></form></div>}
    <div className="accounting-table-wrap"><table className="accounting-table"><thead><tr><th>Invoice</th><th>Customer link</th><th>Actions</th></tr></thead><tbody>{data.documents.filter((item) => item.kind === 'invoice').map((invoice) => { const link = data.invoiceLinks.find((item) => item.documentId === invoice.id); return <tr key={invoice.id}><td>{invoice.number}</td><td>{link ? <a href={link.url} target="_blank" rel="noreferrer">View customer invoice</a> : 'No active link'}</td><td>{link ? <><button type="button" disabled={busy} onClick={() => void navigator.clipboard.writeText(link.url).then(() => setMessage('Invoice link copied.')).catch(() => setError('Could not copy the link.'))}>Copy link</button> <button type="button" disabled={busy} onClick={() => void changeLink(invoice.id, 'revoke')}>Revoke</button></> : <button type="button" disabled={busy} onClick={() => void changeLink(invoice.id, 'create')}>Create link</button>}</td></tr>; })}</tbody></table></div>
  </section>;
}
