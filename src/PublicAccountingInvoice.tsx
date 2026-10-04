import { useEffect, useState } from 'react';
import { accountingInvoicePdfUrl, getPublicAccountingInvoice, startPublicAccountingInvoiceCheckout, type PublicAccountingInvoice } from './api';
import './publicAccountingInvoice.css';

const money = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

export default function PublicAccountingInvoice({ token }: { token: string }) {
  const [invoice, setInvoice] = useState<PublicAccountingInvoice | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const paymentReturned = new URLSearchParams(window.location.search).get('payment') === 'success';
  useEffect(() => {
    const priorTitle = document.title; document.title = 'Customer invoice | Exdox';
    const meta = document.createElement('meta'); meta.name = 'robots'; meta.content = 'noindex,nofollow'; document.head.appendChild(meta);
    const referrer = document.createElement('meta'); referrer.name = 'referrer'; referrer.content = 'no-referrer'; document.head.appendChild(referrer);
    let live = true;
    getPublicAccountingInvoice(token).then((result) => { if (live) setInvoice(result); }).catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : 'Could not load invoice.'); });
    return () => { live = false; meta.remove(); referrer.remove(); document.title = priorTitle; };
  }, [token]);
  async function pay() {
    setBusy(true); setError('');
    try {
      const url = new URL(await startPublicAccountingInvoiceCheckout(token));
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Stripe returned an unexpected payment address.');
      window.location.assign(url.toString());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not start payment.'); setBusy(false); }
  }
  async function downloadPdf() {
    setError('');
    try {
      const response = await fetch(accountingInvoicePdfUrl(token), { headers: { Accept: 'application/pdf' }, cache: 'no-store', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error('Could not download the PDF.');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `invoice-${invoice?.document.number ?? 'document'}.pdf`; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not download the PDF.'); }
  }
  const doc = invoice?.document;
  return <main className="public-accounting-invoice"><header><span className="invoice-brand">Exdox</span><span>Secure customer invoice</span></header><article>{paymentReturned && <p role="status">You returned from checkout. {invoice?.outstandingPence === 0 ? 'This invoice shows no balance due.' : 'Payment confirmation may take a moment. Refresh this page to check the balance.'}</p>}{error && <p className="invoice-error" role="alert">{error}</p>}{!doc && !error && <p>Loading invoice…</p>}{doc && <><div className="invoice-heading"><div><p className="invoice-eyebrow">INVOICE</p><h1>{doc.issuerName}</h1><p className="invoice-address">{doc.issuerAddress}</p></div><div className="invoice-meta"><strong>#{doc.number}</strong><span>Issued {doc.date}</span><span>Due {doc.dueDate}</span>{doc.vatNumber && <span>VAT {doc.vatNumber}</span>}</div></div><div className="invoice-customer"><span>Bill to</span><strong>{doc.contactName}</strong><p>{doc.contactAddress}</p></div><div className="invoice-table-wrap"><table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>VAT</th><th>Net</th></tr></thead><tbody>{doc.items.map((item, index) => <tr key={index}><td>{item.description}</td><td>{item.quantity}</td><td>{money(item.unitPricePence)}</td><td>{item.vatRate}%</td><td>{money(item.quantity * item.unitPricePence)}</td></tr>)}</tbody></table></div><div className="invoice-totals"><div><span>Subtotal</span><strong>{money(doc.netPence)}</strong></div><div><span>VAT</span><strong>{money(doc.vatPence)}</strong></div><div className="invoice-total"><span>Invoice total</span><strong>{money(doc.totalPence)}</strong></div><div className="invoice-total"><span>Outstanding</span><strong>{money(invoice.outstandingPence)}</strong></div></div>{doc.paymentInstructions && <section className="invoice-instructions"><h2>Payment instructions</h2><p>{doc.paymentInstructions}</p></section>}<div className="invoice-actions"><button type="button" onClick={() => void downloadPdf()}>Download PDF</button><button type="button" onClick={() => window.print()}>Print</button>{invoice.canPay && <button className="invoice-pay" type="button" disabled={busy} onClick={() => void pay()}>{busy ? 'Opening payment…' : `Pay ${money(invoice.outstandingPence)} securely`}</button>}</div><p className="invoice-note">Payment status is confirmed after processing. If you have already paid by another method, contact {doc.issuerName} before paying again.</p></>}</article></main>;
}
