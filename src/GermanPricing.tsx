import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { countryCurrency, useGbpReferenceRate, useSelectedCountry } from './region';
import type { SessionState } from './types';

const baseSteps = [
  { users: 1, documents: 100, price: 3 },
  { users: 5, documents: 250, price: 15 },
  { users: 10, documents: 500, price: 30 },
  { users: 15, documents: 750, price: 45 },
  { users: 20, documents: 1000, price: 60 },
  { users: 25, documents: 1250, price: 75 },
];

// Keep these public review values aligned with the English pricing slider in App.tsx.
const pricingSteps = [
  ...baseSteps,
  ...Array.from({ length: 14 }, (_, index) => {
    const users = 30 + index * 5;
    let price: number;
    if (users <= 60) price = 75 + ((users - 25) / 5) * 14;
    else if (users <= 80) price = 173 + ((users - 60) / 5) * 14.405;
    else price = 230.62 + ((users - 80) / 5) * 14.405;
    return { users, documents: users * 50, price: Number(price.toFixed(2)) };
  }),
  { users: 100, documents: 5000, price: 288.24 },
  ...Array.from({ length: 10 }, (_, index) => {
    const users = 110 + index * 10;
    return { users, documents: users * 50 + 5000, price: Number((377.05 + index * 28.81).toFixed(2)) };
  }),
];

const workspaces = ['Kosten', 'Umsätze', 'Archiv', 'Anträge', 'Lieferantenregeln', 'Kundenregeln'];
const features = [
  'Belege und Rechnungen mobil erfassen',
  'Kosten- und Umsatz-Posteingänge mit Prüfung im Web',
  'Spesenanträge und Freigabeabläufe',
  'Lieferanten- und Kundenregeln',
  'Dokumentenarchiv und geschützter Dateizugriff',
  'Steuerfelder, CSV-Exporte und Hinweise zur Datenqualität',
];
const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
const formatNumber = (value: number) => new Intl.NumberFormat('de-DE').format(value);

export function GermanPricing({ session }: { session: SessionState | null }) {
  const country = useSelectedCountry();
  const referenceRate = useGbpReferenceRate(country);
  const audience = new URLSearchParams(useLocation().search).get('audience');
  const [sliderIndex, setSliderIndex] = useState(0);
  const step = pricingSteps[sliderIndex] ?? pricingSteps[0]!;
  const registration = audience === 'sole_trader' ? '/de/register?audience=sole_trader' : '/de/register';
  const billingRoute = session && (session.user.isOwner || session.allowedWebRoutes?.includes('/billing')) ? '/billing' : '/overview';
  const displayedPrice = step.users === 1
    ? formatMoney(3, countryCurrency(country))
    : referenceRate
      ? `≈ ${formatMoney(step.price * referenceRate.value, referenceRate.currency)}`
      : formatMoney(step.price, 'GBP');
  const billingNote = step.users === 1
    ? `${countryCurrency(country)} pro Monat${country === 'GB' ? ', einschließlich britischer Umsatzsteuer' : ''}. Prüfen Sie den endgültigen Betrag bei Stripe.`
    : country === 'GB'
      ? 'Abrechnung in GBP, einschließlich britischer Umsatzsteuer.'
      : `Abrechnung in GBP: ${formatMoney(step.price, 'GBP')} pro Monat. ${referenceRate ? `Der Betrag in Ihrer Währung ist eine Schätzung zum Referenzkurs vom ${referenceRate.date}; den endgültigen Wechselkurs bestimmt Ihr Kartenanbieter.` : 'Eine Schätzung in Ihrer Währung ist derzeit nicht verfügbar.'} Prüfen Sie den endgültigen Betrag bei Stripe.`;

  return <section className="pricing-band pricing-page-band de-pricing">
    <div className="section-heading">
      <div>
        <p className="section-kicker">Preise</p>
        {session ? <h2>Wählen Sie das passende Kontingent für Ihr Unternehmen.</h2> : <h1>Wählen Sie das passende Kontingent für Ihr Unternehmen.</h1>}
        <p className="pricing-trial-highlight">Kostenlos testen – keine Kartendaten nötig</p>
        <p className="pricing-trial-cancel">Jederzeit kündbar.</p>
      </div>
      <p>Jeder Preis umfasst die Exdox-Kernfunktionen. Wählen Sie die passende Zahl an Nutzern und Dokumenten pro Monat.</p>
    </div>
    <div className="pricing-page-layout">
      <div className="pricing-page-main">
        <article className="slider-pricing-card">
          <div className="slider-price-row"><strong>{displayedPrice}</strong><span>pro Monat</span></div>
          <span className="slider-vat-note">{billingNote}</span>
          <div className="slider-capacity-copy"><strong>{formatNumber(step.documents)}</strong><span>Dokumente pro Monat</span></div>
          <div className="slider-capacity-copy"><strong>{formatNumber(step.users)}</strong><span>Nutzer enthalten</span></div>
          <input className="pricing-slider" type="range" min={0} max={pricingSteps.length - 1} step={1} value={sliderIndex} onChange={event => setSliderIndex(Number(event.target.value))} aria-label="Nutzer- und Dokumentenkontingent wählen" />
          <p className="slider-helper">Verschieben Sie den Regler, um Nutzerzahl und monatliches Dokumentenkontingent zu wählen.</p>
          <Link className="public-button" to={session ? billingRoute : registration}>{session ? (billingRoute === '/billing' ? 'Abrechnung öffnen' : 'Zum Arbeitsbereich') : 'Kostenlos testen'}</Link>
        </article>
        <div className="pricing-notes-grid">
          <article className="company-card"><strong>Alles Wesentliche enthalten</strong><p>Kosten, Umsätze, Anträge, Freigaben, Lieferanten- und Kundenregeln sowie das Archiv stehen zu jedem Preis bereit.</p></article>
          <article className="company-card"><strong>14 Tage kostenlos testen</strong><p>Zum Start ist keine Karte nötig. Zahlen Sie nach 14 Tagen für den ersten Monat, wenn Sie Exdox weiter nutzen möchten; die monatliche Abrechnung beginnt mit dieser Zahlung.</p></article>
          <article className="company-card"><strong>Xero verbinden</strong><p>Wählen Sie den Xero-Zugang in Ihrem Arbeitsbereich, wenn Sie ihn benötigen.</p></article>
        </div>
      </div>
      <div className="pricing-page-side"><div className="slider-side-stack">
        <article className="slider-info-card"><h2>Ihr gewähltes Kontingent</h2><ul className="slider-credit-list"><li><strong>{formatNumber(step.documents)}</strong><span>verarbeitete Dokumente pro Monat</span></li><li><strong>{formatNumber(step.users)}</strong><span>enthaltene Nutzer</span></li></ul></article>
        <article className="slider-info-card slider-access-card"><h2>In jedem Tarif enthalten</h2><p>Der Exdox-Arbeitsbereich mit seinen Kernfunktionen ist in jedem Tarif enthalten.</p><div className="slider-access-group"><strong>Bereiche im Arbeitsbereich</strong><div className="slider-access-tags">{workspaces.map(item => <span key={item}>{item}</span>)}</div></div><ul className="slider-feature-list">{features.map(item => <li key={item}>{item}</li>)}</ul><p className="slider-enterprise-note">Xero ist bei Tarifen ab fünf Nutzern enthalten. Selbstständige mit einem Nutzer können es in ihrem Arbeitsbereich hinzubuchen.</p></article>
      </div></div>
    </div>
    <aside className="pricing-bespoke-callout"><div><h2>Benötigen Sie einen individuellen Tarif?</h2><p>Teilen Sie uns mit, wie viele Nutzer und Dokumente Sie monatlich brauchen. Wir besprechen gern ein passendes Angebot für Ihr Unternehmen.</p></div><Link className="public-button" to={`/de/contact?subject=${encodeURIComponent('Anfrage zu individuellen Preisen')}`}>Individuellen Preis anfragen</Link></aside>
  </section>;
}
