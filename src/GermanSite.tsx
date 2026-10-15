import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authenticateWithGoogle, confirmEmailWithToken, loginWithEmail, registerWithEmail, requestPasswordReset, resetPasswordWithToken, resendConfirmationEmail, saveStoredSession, submitContactForm } from './api';
import { GoogleSignInButton } from './GoogleSignInButton';
import { GermanPricing } from './GermanPricing';
import { cookieConsentStorageKey, setGoogleAnalyticsConsent, type CookieConsentChoice } from './googleAnalytics';
import { countries, selectCountry, useSelectedCountry, type Country } from './region';
import type { SessionState } from './types';
import './german.css';

const base = '/de';
const de = (path = '') => `${base}${path}`;
const germanRegions = new Intl.DisplayNames(['de'], { type: 'region' });
const countryLabel = (country: { code: Country; name: string }) => germanRegions.of(country.code) ?? country.name;
const germanError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes('email addresses do not match')) return 'Die E-Mail-Adressen stimmen nicht überein.';
  if (lower.includes('passwords do not match')) return 'Die Passwörter stimmen nicht überein.';
  if (lower.includes('at least 8 characters')) return 'Das Passwort benötigt mindestens acht Zeichen, einen Großbuchstaben und ein Sonderzeichen.';
  if (lower.includes('already') && (lower.includes('email') || lower.includes('account'))) return 'Diese E-Mail-Adresse wird bereits verwendet. Melden Sie sich mit der vorhandenen Methode an.';
  if (lower.includes('invalid') && lower.includes('password')) return 'E-Mail-Adresse oder Passwort ist nicht korrekt.';
  if (lower.includes('confirm your email')) return 'Bestätigen Sie zuerst Ihre E-Mail-Adresse. Öffnen Sie dazu die aktuelle Exdox-E-Mail.';
  return message;
};
const pages = [
  ['/', 'Startseite'], ['/platform', 'Plattform'], ['/pricing', 'Preise'], ['/faq', 'Häufige Fragen'], ['/company', 'Über uns'], ['/contact', 'Kontakt'],
] as const;
const legal = [
  ['/terms', 'Nutzungsbedingungen'], ['/privacy', 'Datenschutz'], ['/data-processing-agreement', 'Auftragsverarbeitung'],
  ['/subprocessors', 'Unterauftragsverarbeiter'], ['/data-retention', 'Aufbewahrung'], ['/cookies', 'Cookies'], ['/account-deletion', 'Konto löschen'],
] as const;

function Seo({ path }: { path: string }) {
  useEffect(() => {
    const oldLanguage = document.documentElement.lang;
    document.documentElement.lang = 'de';
    const oldTitle = document.title;
    document.title = `${[...pages, ...legal].find(([url]) => url === path)?.[1] ?? (path === '/register' ? 'Registrieren' : path === '/login' ? 'Anmelden' : 'Exdox')} | Exdox`;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
    const oldRobots = robots.content;
    robots.content = 'noindex, nofollow, noarchive';
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `https://www.exdox.co.uk${de(path === '/' ? '/' : path)}`;
    return () => { document.documentElement.lang = oldLanguage; document.title = oldTitle; robots!.content = oldRobots; };
  }, [path]);
  return null;
}

function Shell({ children, session }: { children: ReactNode; session: SessionState | null }) {
  const country = useSelectedCountry();
  const [consent, setConsent] = useState<CookieConsentChoice | null>(() => {
    const saved = localStorage.getItem(cookieConsentStorageKey);
    return saved === 'all_cookies' || saved === 'essential_only' ? saved : null;
  });
  const [showCookies, setShowCookies] = useState(consent === null);
  const chooseConsent = (choice: CookieConsentChoice) => {
    localStorage.setItem(cookieConsentStorageKey, choice);
    setGoogleAnalyticsConsent(choice);
    setConsent(choice);
    setShowCookies(false);
  };
  return <div className="de-site">
    <header className="de-header">
      <div className="de-brand-stack"><Link className="de-brand" to={de('/')}><img src="/branding/exdox-mark-header-v2-96.webp" alt="" />Exdox</Link><a className="public-security-badge" href="https://internet.nl/site/exdox.co.uk/4323228/" target="_blank" rel="noopener noreferrer"><img src="/branding/internetnl-website-test-100.svg" width="204" height="38" alt="Internet.nl-Websitetest: Exdox erreichte am 29. September 2026 100 Prozent. Bericht ansehen." /></a></div>
      <nav className="de-desktop-nav" aria-label="Deutschsprachige Seiten">{pages.map(([url, label]) => <Link key={url} to={de(url)}>{label}</Link>)}</nav>
      <details className="de-mobile-menu"><summary>Menü</summary><nav aria-label="Deutschsprachige Seiten">{pages.map(([url, label]) => <Link key={url} to={de(url)}>{label}</Link>)}</nav></details>
      <div className="de-header-actions"><label>Land <select value={country} onChange={e => selectCountry(e.target.value as Country)}>{countries.map(item => <option key={item.code} value={item.code}>{countryLabel(item)}</option>)}</select></label><Link to={de('/login')}>Anmelden</Link><Link className="de-button" to={session ? '/overview' : de('/register')}>{session ? 'Zum Arbeitsbereich' : 'Kostenlos testen'}</Link><Link to="/" lang="en">English</Link></div>
    </header>
    <main>{children}</main>
    <footer className="de-footer"><div className="de-footer-main"><div className="de-footer-brand"><strong>Exdox</strong><p>Belegerfassung, Prüfung, Anträge, Archiv und Finanzkontrollen in einem verbundenen Ablauf.</p><span>Mobile Erfassung, Web-Prüfung, Freigaben und CSV-Exporte</span><div className="de-socials" aria-label="Soziale Medien"><a href="https://www.facebook.com/profile.php?id=61594025846475" target="_blank" rel="noreferrer">Facebook</a><a href="https://www.youtube.com/@exdox_expenses" target="_blank" rel="noreferrer">YouTube</a><a href="https://www.tiktok.com/@terry.reed" target="_blank" rel="noreferrer">TikTok</a><a href="https://x.com/exdox_expenses" target="_blank" rel="noreferrer">X</a><a href="https://www.instagram.com/exdox.co.uk/" target="_blank" rel="noreferrer">Instagram</a><a href="https://www.linkedin.com/in/terry-reed-109031220/" target="_blank" rel="noreferrer">LinkedIn</a></div></div><div className="de-footer-columns"><nav aria-label="Produkt"><strong>Produkt</strong><Link to={de('/')}>Startseite</Link><Link to={de('/platform')}>Plattform</Link><Link to={de('/pricing')}>Preise</Link><Link to={de('/compare/dext')}>Exdox und Dext</Link></nav><nav aria-label="Hilfe"><strong>Hilfe</strong><Link to={de('/faq')}>Häufige Fragen</Link><Link to={de('/company')}>Über uns</Link><Link to={de('/contact')}>Kontakt</Link><button type="button" onClick={() => setShowCookies(true)}>Cookie-Einstellungen</button></nav><nav aria-label="Rechtliches"><strong>Rechtliches</strong>{legal.map(([url, label]) => <Link key={url} to={de(url)}>{label}</Link>)}</nav></div></div><div className="de-footer-company"><strong>EXDOX LTD</strong><span>Registriert in England und Wales · Unternehmensnummer <a href="https://find-and-update.company-information.service.gov.uk/company/17488771" target="_blank" rel="noreferrer">17488771</a></span><address>Eingetragener Sitz: 1 Cannon Hill, Bracknell, United Kingdom, RG12 7QA</address></div><div className="de-footer-bottom"><span>© {new Date().getFullYear()} exdox.co.uk</span><span>{consent === 'all_cookies' ? 'Cookie-Auswahl: Alle Cookies akzeptiert' : consent === 'essential_only' ? 'Cookie-Auswahl: Nur notwendige Cookies' : 'Cookie-Auswahl: Noch nicht festgelegt'}</span></div></footer>
    {showCookies && <div className="de-cookie" role="dialog" aria-label="Cookie-Einstellungen"><strong>Cookie-Einstellungen</strong><p>Notwendige Cookies halten die Website funktionsfähig. Analyse- und Werbe-Cookies verwenden wir nur mit Ihrer Zustimmung. Mehr dazu in der <Link to={de('/cookies')}>Cookie-Richtlinie</Link>.</p><div><button type="button" onClick={() => chooseConsent('essential_only')}>Nur notwendige Cookies</button><button type="button" onClick={() => chooseConsent('all_cookies')}>Alle Cookies akzeptieren</button></div></div>}
  </div>;
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <section className="de-panel"><span className="de-eyebrow">{eyebrow}</span><h1>{title}</h1>{children}</section>;
}
function Cards({ items }: { items: { title: string; text: string }[] }) {
  return <div className="de-cards">{items.map(item => <article key={item.title}><h2>{item.title}</h2><p>{item.text}</p></article>)}</div>;
}
const receiptSteps = [
  { number: '01', title: 'Scan starten', detail: 'Tippen Sie in der Exdox-App auf „Beleg oder Rechnung scannen“.', image: '/branding/exdox-receipt-scan.webp', alt: 'Exdox-Uploadmenü mit der Option zum Scannen eines Belegs oder einer Rechnung' },
  { number: '02', title: 'Beleg erfassen', detail: 'Der Originalbeleg bleibt mit dem Ausgabeneintrag verknüpft.', image: '/branding/exdox-receipt-example.webp', alt: 'Beispielbeleg von Green Leaf Station Kiosk' },
  { number: '03', title: 'Prüfen und einreichen', detail: 'Prüfen Sie die Ausgabenangaben und die Zahlungsmethode und reichen Sie den Beleg ein.', image: '/branding/exdox-receipt-review.webp', alt: 'Exdox-Ansicht zur Prüfung und Einreichung eines Einkaufs' },
  { number: '04', title: 'Unter Einkäufe wiederfinden', detail: 'Der gescannte Beleg erscheint unter Einkäufe und wartet auf die Prüfung.', image: '/branding/exdox-receipt-purchases.webp', alt: 'Gescannter Green-Leaf-Beleg unter Einkäufe mit dem Status „Zu prüfen“' },
  { number: '05', title: 'Im Web-Dashboard prüfen', detail: 'Im Posteingang für Kosten stehen Lieferant, Umsatzsteuer, Gesamtbetrag und Prüfstatus des Belegs.', image: '/branding/exdox-receipt-dashboard-review.webp', alt: 'Exdox-Web-Dashboard mit dem Green-Leaf-Beleg, der auf Prüfung wartet' },
  { number: '06', title: 'Berichte öffnen', detail: 'Sehen Sie in Berichte die Zahlungsrunden und die Belege jeder Runde an.', image: '/branding/exdox-receipt-reports.webp', alt: 'Exdox-Berichte mit Zahlungsrunden' },
];
const mileageSteps = [
  { number: '01', title: 'Fahrt eingeben', detail: 'Geben Sie in der App Ihre britischen Postleitzahlen ein und sehen Sie die Strecke auf der Karte.', image: '/branding/exdox-mileage-entry.webp', alt: 'Exdox-Fahrtkostenantrag mit Postleitzahlen und Karte' },
  { number: '02', title: 'Strecke wählen', detail: 'Vergleichen Sie die vorgeschlagene Strecke mit einer Alternative, bevor Sie den Antrag einreichen.', image: '/branding/exdox-mileage-routes.webp', alt: 'Exdox zeigt mehrere Strecken für einen Fahrtkostenantrag' },
  { number: '03', title: 'Antrag einreichen', detail: 'Bestätigen Sie die gefahrenen Meilen und senden Sie den Antrag zur Prüfung in Ihren gemeinsamen Arbeitsbereich.', image: '/branding/exdox-mileage-claim.webp', alt: 'Exdox-Fahrtkostenantrag vor dem Einreichen' },
];
function HomeJourney({ kind, session, platformPage = false }: { kind: 'receipt' | 'mileage'; session: SessionState | null; platformPage?: boolean }) {
  const receipt = kind === 'receipt';
  const steps = receipt ? receiptSteps : mileageSteps;
  const titleId = `de-${platformPage ? 'platform' : 'home'}-${receipt ? 'receipt-story' : 'journey'}-title`;
  return <section className={`product-journey${receipt ? ' receipt-story' : ''}${platformPage ? ' product-journey-platform' : ''}`} aria-labelledby={titleId}>
    <div className="section-heading"><div><p className="section-kicker">{receipt ? 'Belegerfassung in der App' : 'Ein echter Exdox-Ablauf'}</p><h2 id={titleId}>{receipt ? 'Vom gescannten Beleg zum besseren Überblick über Ausgaben' : 'So entsteht ein Fahrtkostenantrag'}</h2></div><p>{receipt ? 'Sehen Sie den Scan und die Ansicht „Einkäufe“, prüfen Sie den Beleg im Web und erkunden Sie anschließend Zahlungsrunden in „Berichte“.' : 'Die Bilder zeigen die echte App. Auf dem Smartphone eingereichte Anträge stehen im Exdox-Arbeitsbereich zur Prüfung bereit.'}</p></div>
    <div className={`product-journey-grid${receipt ? ' receipt-story-grid' : ''}`}>{steps.map(step => <article className={`product-journey-step${receipt ? ' receipt-story-step' : ''}${receipt && step.number === '05' ? ' receipt-story-dashboard' : ''}`} key={step.number}><div className={`product-journey-image${receipt && step.number === '02' ? ' receipt-story-paper' : ''}`}><img src={step.image} alt={step.alt} width={receipt ? undefined : 593} height={receipt ? undefined : 1280} loading="lazy" /></div><div className="product-journey-copy"><span>{step.number}</span><h3>{step.title}</h3><p>{step.detail}</p></div></article>)}</div>
    <div className="product-journey-action"><Link className="public-button" to={session ? '/overview' : de('/register')}>{session ? 'Arbeitsbereich öffnen' : '14 Tage kostenlos testen'}</Link><span>Für den Einstieg sind keine Kartendaten erforderlich.</span></div>
  </section>;
}
const teaserFeatures = [
  'Belege und Rechnungen mobil erfassen',
  'Kosten und Umsätze im Web prüfen',
  'Spesenanträge und Freigabeabläufe',
  'Lieferanten- und Kundenregeln',
  'Dokumentenarchiv mit geschütztem Zugriff auf Originaldateien',
  'Steuerfelder, CSV-Exporte und Hinweise zur Datenqualität',
];
function Home({ session }: { session: SessionState | null }) { return <div className="de-home">
  <section className="public-hero"><div className="public-hero-copy">
    <span className="public-availability">Jetzt verfügbar in Großbritannien, den USA, Australien, Kanada und der EU</span>
    <h1>Belege und Spesenanträge bearbeiten – vom Smartphone bis zum Arbeitsbereich.</h1>
    <p>Scannen Sie einen Beleg, erstellen Sie einen Fahrtkostenantrag oder laden Sie eine Rechnung in der App hoch. Prüfen und genehmigen Sie alles im selben Exdox-Arbeitsbereich im Web.</p>
    <div className="hero-actions"><Link className="public-primary" to={session ? '/overview' : de('/register')}>{session ? 'Arbeitsbereich öffnen' : '14 Tage kostenlos testen'}</Link><Link className="secondary-inline-link" to={session ? '/settings' : de('/platform')}>{session ? 'Konto verwalten' : 'So funktioniert Exdox'}</Link></div>
    <div className="store-badges" aria-label="Verfügbarkeit der Exdox-App"><a className="store-badge store-badge-image" href="https://play.google.com/store/apps/details?id=uk.co.exdox.mobile" target="_blank" rel="noreferrer" aria-label="Exdox bei Google Play herunterladen"><img src="/branding/google-play-store-badge-480.webp" alt="Bei Google Play herunterladen" width="480" height="144" /></a><Link className="store-badge store-badge-disabled store-badge-interest" to={`${de('/contact')}?subject=${encodeURIComponent('Interesse an der iPhone-App anmelden')}`} aria-label="Interesse an der Exdox-iPhone-App anmelden"><span className="store-badge-caption">iPhone-App</span><strong>In Kürze verfügbar</strong><span className="store-badge-interest-action">Interesse anmelden</span></Link></div>
    <span className="hero-trial-note">Keine Karte erforderlich. Wenn Sie Exdox nach der Testphase weiter nutzen möchten, wählen Sie dann einen Tarif.</span>
  </div><div className="hero-product-visual" aria-label="Exdox-App mit Fahrtkostenantrag und Streckenoptionen"><div className="hero-product-label"><strong>Die App im Einsatz</strong><span>Echte Exdox-Ansichten</span></div><img className="hero-phone hero-phone-back" src="/branding/exdox-mileage-routes.webp" width="593" height="1280" alt="Exdox-App mit Streckenoptionen für einen Fahrtkostenantrag" /><img className="hero-phone hero-phone-front" src="/branding/exdox-mileage-entry.webp" width="593" height="1280" alt="Exdox-App mit Postleitzahlen und Karte für einen Fahrtkostenantrag" fetchPriority="high" /></div></section>
  <section className="xero-integration-strip" aria-label="Mit Xero integriert"><span>Integriert mit</span><img src="/branding/xero-logo-240x80.webp" alt="Xero" width="240" height="80" /></section>
  <section className="receipt-demo-band" aria-labelledby="de-receipt-demo-title"><div className="receipt-demo-inner"><div className="receipt-demo-copy"><span className="eyebrow">Exdox im Einsatz</span><h2 id="de-receipt-demo-title">Belege in Echtzeit scannen – schnell, detailliert und präzise.</h2><p>Sehen Sie, wie Exdox einen Beleg in Echtzeit erfasst und ausliest.</p></div><video className="receipt-demo-video" controls playsInline preload="none" poster="/videos/exdox-receipt-demo-poster.webp" width="592" height="1280" aria-label="Exdox-Demonstration zum Scannen eines Belegs in Echtzeit"><source src="/videos/exdox-realtime-receipt-scanning.mp4" type="video/mp4" />Ihr Browser unterstützt die Videowiedergabe nicht.</video></div></section>
  <HomeJourney kind="receipt" session={session} />
  <HomeJourney kind="mileage" session={session} />
  <section className="home-benefits" aria-labelledby="de-home-benefits-title"><div className="section-heading"><div><p className="section-kicker">Mehr als Erfassung</p><h2 id="de-home-benefits-title">Ein Ort für die Arbeit nach dem Hochladen</h2></div><p>Geben Sie Ihrem Team einen klaren Weg vom eingereichten Beleg zum geprüften Datensatz.</p></div><div className="home-benefits-grid"><article><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l2 5-2 5H6L4 8l2-5ZM8 17h8M9 21h6" /></svg><h3>Belege und Rechnungen</h3><p>Senden Sie Dokumente per Smartphone oder Web und prüfen Sie anschließend die erkannten Angaben.</p></article><article><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h8v5H4zM12 13h8v5h-8zM12 8h4M16 8v5M8 11v4h4" /></svg><h3>Prüfung und Freigabe</h3><p>Sehen Sie, was ansteht, und bearbeiten Sie Anträge und Dokumente weiter.</p></article><article><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7zM15 3v5h5M10 13h6M10 17h6" /></svg><h3>Originale an einem Ort</h3><p>Bewahren Sie die Originaldatei beim Datensatz auf, damit Sie sie später leicht wiederfinden.</p></article></div><Link className="secondary-inline-link" to={de('/platform')}>Alle Exdox-Funktionen ansehen</Link></section>
  <section className="pricing-band"><div className="section-heading"><div><p className="section-kicker">Preise</p><h2>Alle Werkzeuge – mit der Kapazität, die Ihr Unternehmen braucht</h2></div><p>Jeder Tarif umfasst die Erfassung von Belegen und Rechnungen, die Prüfung von Kosten und Umsätzen, Anträge, Lieferanten- und Kundenregeln sowie das Dokumentenarchiv. Wählen Sie die benötigte Nutzerzahl und das monatliche Dokumentenkontingent.</p></div><ul className="pricing-teaser-features">{teaserFeatures.map(feature => <li key={feature}>{feature}</li>)}</ul><div className="section-actions"><Link className="public-button" to={de('/pricing')}>Preise ansehen</Link><Link className="secondary-inline-link" to={session ? '/overview' : de('/register')}>{session ? 'Arbeitsbereich öffnen' : 'Kostenlose Testphase starten'}</Link></div></section>
</div>; }
const platformCapabilities = [
  ['costs', 'Belege und Rechnungen erfassen', 'Einreichung per App und Web'],
  ['workflow', 'Freigabeabläufe', 'An einem Ort prüfen, freigeben und veröffentlichen'],
  ['rules', 'Lieferantenregeln', 'Einheitliche Kategorien und Steuervorgaben'],
  ['claims', 'Fahrtkosten und Spesenanträge', 'Einreichung, Fahrten und Freigabe für Mitarbeitende'],
  ['health', 'Datenqualität', 'Unleserliche, doppelte und unsicher erkannte Belege nachverfolgen'],
  ['claims', 'Dokumentenarchiv', 'Originalbelege schnell archivieren und wiederfinden'],
  ['integrations', 'App und Web synchron', 'Einreichungs- und Prüfstatus bleiben abgestimmt'],
  ['open-banking', 'Exporte aus Warteschlangen', 'CSV-Exporte für Posteingänge und Anträge'],
] as const;
const platformDocuments = [
  ['Belege', 'Mobile Erfassung, Einreichung durch Mitarbeitende und Web-Upload'],
  ['Eingangsrechnungen', 'Strukturierte Beträge, Steuerfelder und prüfbare Kategorien'],
  ['Verkaufsdokumente', 'Separater Bereich für Umsätze mit demselben synchronisierten Prüfablauf'],
  ['Fahrtkostenanträge', 'Fahrten durch Mitarbeitende erfassen und zur Freigabe vorbereiten'],
  ['Begleitdokumente', 'Referenzbelege beim jeweiligen Prüfablauf aufbewahren'],
  ['Archivdateien', 'Gespeicherte Referenzdokumente mit geschütztem Zugriff'],
] as const;
const platformProcess = [
  ['1. Erfassen', 'Belege, Rechnungen und Begleitdateien sammeln', 'Nutzen Sie die mobile Erfassung, den Web-Upload und die Einreichung durch Mitarbeitende.'],
  ['2. Auslesen', 'Beträge, Steuern, Lieferanten und Positionen auslesen', 'Strukturierte Erkennung, Steuerfelder und Dokumentdetails bleiben zur Prüfung sichtbar.'],
  ['3. Prüfen', 'Ausnahmen bearbeiten statt alles neu einzutippen', 'Hinweise auf Prüfbedarf, Duplikate, unleserliche und unsicher erkannte Dokumente zeigen offene Punkte.'],
  ['4. Archivieren', 'Originalbelege leicht wiederfinden', 'Archivspeicher, geschützter Dokumentenzugriff und Suchansichten halten die Quelldateien griffbereit.'],
  ['5. Freigeben und veröffentlichen', 'Anträge, Prüfungen und Übergaben weiterführen', 'Anträge zur Freigabe, prüfbereite Einträge und Exportwege unterstützen die folgenden Schritte.'],
] as const;
const platformWorkflows = [
  ['Über alle Einreichungswege erfassen', [
    'Belege mobil in der App erfassen',
    'Dateien per Drag-and-drop in Kosten- und Umsatz-Posteingänge laden',
    'Eigener Einreichungsbereich für Mitarbeitende ohne Adminrechte',
    'Fahrten und Spesenanträge durch Mitarbeitende erfassen',
    'Klaren Status für jedes eingereichte Dokument verfolgen',
    'Getrennte Bereiche für Einkaufs- und Verkaufsdokumente',
  ]],
  ['Prüfung automatisieren', [
    'Lieferantenregeln für Kategorie, Steuersatz und Zahlungsmethode',
    'Steuerprüfung mit bearbeitbaren Gesamt-, Netto- und Steuerbeträgen',
    'Warteschlangen für Kosten, Umsätze und Anträge mit Prüfbedarf',
    'Unleserliche und unsicher erkannte Dokumente nachverfolgen',
    'Duplikate vor dem endgültigen Veröffentlichen erkennen',
    'Dokumentdetails vor dem Veröffentlichen nachvollziehbar bearbeiten',
  ]],
  ['Mit Finanzkontrollen abschließen', [
    'Eigener Archivbereich für durchsuchbare Originalbelege',
    'Anträge zur Freigabe und Übergabe geprüfter Dokumente',
    'Gefilterte CSV-Exporte aus Warteschlangen und Dokumentansichten',
    'Steuereinstellungen und Prüfvorgaben auf Unternehmensebene',
    'Synchronisierung derselben Belegdatensätze mit der App',
  ]],
] as const;
function PlatformIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    costs: <><path d="M6 3h12l2 5-2 5H6L4 8l2-5Z" /><path d="M8 17h8M9 21h6" /></>,
    workflow: <><path d="M4 6h8v5H4zM12 13h8v5h-8z" /><path d="M12 8h4M16 8v5M8 11v4h4" /></>,
    rules: <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="16" r="3" /><path d="M10.5 10.5 13.5 13.5M16 3v4M3 16h4" /></>,
    claims: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v5h5M10 13h6M10 17h6" /></>,
    health: <><path d="M12 21s-6-4.35-8.5-8.16C1.94 10.55 3.1 7 6.4 7c2 0 3.1 1.08 3.6 2 .5-.92 1.6-2 3.6-2 3.3 0 4.46 3.55 2.9 5.84C18 16.65 12 21 12 21Z" /><path d="M8 12h2l1.2-2.2L13 15l1.1-2H16" /></>,
    integrations: <><path d="M7 12h10M12 7v10" /><path d="M5 5h4v4H5zM15 5h4v4h-4zM5 15h4v4H5zM15 15h4v4h-4z" /></>,
    'open-banking': <><path d="M4 7h16v13H4zM8 4h8l2 3H6l2-3Z" /><path d="M8 11h8M8 15h5" /></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}
function Platform({ session }: { session: SessionState | null }) { return <div className="de-platform">
  <section className="public-page-intro"><p className="section-kicker">Plattform</p><h1>Sehen Sie, wie Belege und Fahrtkostenanträge durch Exdox laufen.</h1><p>Erfassen Sie Belege, erstellen Sie Fahrtkostenanträge und prüfen Sie die Angaben in einem Arbeitsbereich, der App und Website synchron hält.</p></section>
  <HomeJourney kind="receipt" session={session} platformPage />
  <HomeJourney kind="mileage" session={session} platformPage />
  <section className="capabilities-band"><h2>Die wichtigsten Funktionen der Plattform</h2><div className="capabilities-grid">{platformCapabilities.map(([icon, title, detail]) => <article className="capability-card" key={title}><PlatformIcon name={icon} /><strong>{title}</strong><span>{detail}</span></article>)}<Link className="capability-card" to={de('/pricing')}><PlatformIcon name="overview" /><strong>Preise</strong><span>Wählen Sie Ihr Dokumenten- und Nutzerkontingent; prüfen Sie tarifabhängige Zusatzoptionen.</span></Link></div></section>
  <section className="workflow-band"><div className="section-heading"><div><p className="section-kicker">Unterstützte Dokumente</p><h2>Für die Dokumente, mit denen Ihr Finanzteam bereits arbeitet</h2></div><p>Exdox zeigt Einreichungen aus App und Web an einem Ort – von Belegen und Rechnungen bis zu Fahrtkostenanträgen und archivierten Begleitdateien.</p></div><div className="document-grid">{platformDocuments.map(([title, detail]) => <article className="document-card" key={title}><strong>{title}</strong><span>{detail}</span></article>)}</div></section>
  <section className="workflow-band"><div className="section-heading"><div><p className="section-kicker">Ablauf</p><h2>Von der Erfassung bis zur Veröffentlichung – in einem Arbeitsbereich</h2></div><p>Exdox unterstützt die tägliche Buchhaltungsarbeit: Belege sammeln, Daten auslesen, Ausnahmen prüfen, Originaldateien aufbewahren und Freigaben im selben synchronisierten Arbeitsbereich weiterführen.</p></div><div className="process-grid">{platformProcess.map(([step, title, detail]) => <article className="process-card" key={step}><span>{step}</span><strong>{title}</strong><p>{detail}</p></article>)}</div></section>
  <section className="workflow-band"><div className="section-heading"><div><p className="section-kicker">Funktionsumfang</p><h2>Auf den Arbeitsablauf ausgerichtet, den Finanzteams von Dext kennen</h2></div><p>Erfassung, Prüfung, Regeln, Freigaben, Archiv und Exporte stehen im selben Exdox-Web-Arbeitsbereich zur Verfügung, der sich mit der App synchronisiert.</p></div><div className="workflow-grid">{platformWorkflows.map(([title, items]) => <article className="workflow-card" key={title}><strong>{title}</strong><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></article>)}</div></section>
</div>; }
const questions = [
  ['Brauche ich für die Testphase eine Karte?', 'Nein. Ein neuer Unternehmens- oder Selbstständigen-Arbeitsbereich startet mit einer 14-tägigen Testphase ohne Karte und ohne gewählten Tarif.'],
  ['Wird nach 14 Tagen automatisch abgebucht?', 'Nein. Erst wenn der Inhaber einen Tarif auswählt und die erste Zahlung abschließt, beginnt ein kostenpflichtiges Abonnement.'],
  ['Kann ich Google zur Registrierung nutzen?', 'Ja. Verwenden Sie dasselbe Google-Konto auf Website und Android-App. Ein bestehendes Konto mit E-Mail und Passwort wird nicht automatisch mit Google zusammengeführt.'],
  ['Können Mitarbeitende einen eigenen Arbeitsbereich anlegen?', 'Mitarbeitende treten über eine Einladung dem vorhandenen Arbeitsbereich ihres Unternehmens bei. Eine Einladung startet keine eigene Testphase.'],
  ['Welche Währung gilt?', 'Die Sprache der Website ändert Ihre Abrechnungswährung nicht. Diese richtet sich nach dem Land des Arbeitsbereichs und dem gewählten Tarif. Größere Tarife werden derzeit in GBP berechnet.'],
  ['Kann Exdox deutsche Steuerregeln automatisch prüfen?', 'Exdox hilft bei Erfassung und Prüfung von Dokumenten. Es ersetzt keine steuerliche Beratung und bestimmt die richtige Behandlung für Ihr Unternehmen nicht automatisch.'],
];
function Faq() { return <Panel eyebrow="Häufige Fragen" title="Antworten zur Nutzung von Exdox."><div className="de-faq">{questions.map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div><p>Weitere Hilfe? <Link to={de('/contact')}>Kontaktieren Sie uns.</Link></p></Panel>; }
function Company() { return <Panel eyebrow="Über uns" title="Exdox verbindet Erfassung, Prüfung und Belege."><p>EXDOX LTD entwickelt einen gemeinsamen Ablauf für mobile Erfassung, Web-Prüfung, Freigaben und das Wiederfinden von Originaldokumenten.</p><Cards items={[{title:'Gemeinsamer Arbeitsbereich',text:'App und Website greifen auf denselben Unternehmens-Arbeitsbereich zu.'},{title:'Nachvollziehbare Prüfung',text:'Erkannte Angaben lassen sich mit dem Originalbeleg abgleichen.'},{title:'Kontakt',text:'Für Fragen zu Produkt, Zugang oder Abrechnung erreichen Sie unser Team über das Kontaktformular.'}]} /><Link className="de-button" to={de('/contact')}>Kontakt aufnehmen</Link></Panel>; }
function Comparison() { return <Panel eyebrow="Vergleich" title="Exdox und Dext im Überblick."><p>Exdox bietet mobile Belegerfassung, eine Web-Prüfung, Anträge und eine Xero-Anbindung. Dext bietet ebenfalls Funktionen zur Belegverarbeitung und hat ein breiteres Angebot an Integrationen. Umfang, Preise und Abrechnung hängen vom gewählten Tarif ab.</p><p>Dieser Testtext enthält bewusst keine aktuellen Vergleichspreise. Prüfen Sie vor einer Entscheidung die veröffentlichten Tarifdetails beider Anbieter und den endgültigen Preis im Bezahlvorgang.</p><Link className="de-button" to={de('/pricing')}>Exdox-Tarife ansehen</Link></Panel>; }
function Contact() {
  const location = useLocation();
  const [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [error,setError]=useState('');
  async function send(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form=new FormData(event.currentTarget); setBusy(true); setError(''); setMessage(''); try { await submitContactForm({fullName:String(form.get('name')).trim(),email:String(form.get('email')).trim(),organisationName:String(form.get('company')).trim(),subject:String(form.get('subject')).trim(),message:String(form.get('message')).trim()}); setMessage('Ihre Nachricht wurde gesendet.'); event.currentTarget.reset(); } catch(e) { setError(e instanceof Error ? e.message : 'Die Nachricht konnte nicht gesendet werden.'); } finally { setBusy(false); } }
  return <Panel eyebrow="Kontakt" title="Wie können wir Ihnen helfen?"><p>Fragen zu Zugang, Abrechnung, Datenschutz oder Exdox senden Sie an unser Team. Sie können auch an contact@exdox.co.uk schreiben.</p><form className="de-form" onSubmit={send}><label>Vollständiger Name<input name="name" required /></label><label>E-Mail-Adresse<input name="email" type="email" required /></label><label>Unternehmen (optional)<input name="company" /></label><label>Betreff<input name="subject" defaultValue={new URLSearchParams(location.search).get('subject') ?? ''} required /></label><label>Nachricht<textarea name="message" rows={6} required /></label>{error && <p role="alert" className="de-error">{error}</p>}{message && <p role="status" className="de-success">{message}</p>}<button className="de-button" disabled={busy}>Nachricht senden</button></form></Panel>;
}

function Auth({ kind }: { kind: 'register' | 'login' | 'confirm' | 'forgot' | 'reset' }) {
  const location=useLocation(), params=new URLSearchParams(location.search);
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [message,setMessage]=useState('');
  const [accountType,setAccountType]=useState<'owner'|'sole_trader'|'employee'>(params.get('inviteToken') ? 'employee' : params.get('audience') === 'sole_trader' ? 'sole_trader' : 'owner');
  const [country,setCountry]=useState<Country>('DE'), [organisationName,setOrganisationName]=useState(''), [terms,setTerms]=useState(false);
  const [twoFactor,setTwoFactor]=useState(false), [code,setCode]=useState(''), [method,setMethod]=useState<'email'|'authenticator'|'recovery'>('email');
  const titles={register:'Exdox kostenlos testen',login:'Bei Exdox anmelden',confirm:'E-Mail-Adresse bestätigen',forgot:'Passwort zurücksetzen',reset:'Neues Passwort festlegen'};
  const afterAuth=() => { window.location.assign('/overview'); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage(''); const data=new FormData(event.currentTarget);
    const email=String(data.get('email') ?? '').trim(), password=String(data.get('password') ?? '');
    try {
      if(kind==='register') {
        localStorage.setItem('exdox-preferred-language','de');
        const result=await registerWithEmail({locale:'de',country, accountType, email,confirmEmail:String(data.get('confirmEmail') ?? ''),password,confirmPassword:String(data.get('confirmPassword') ?? ''),fullName:String(data.get('fullName') ?? ''),organisationName,inviteToken:params.get('inviteToken') ?? undefined,termsAccepted:terms,termsVersion:'2026-10-06'});
        if(result.kind==='confirmed') afterAuth(); else setMessage('Prüfen Sie Ihr E-Mail-Postfach und bestätigen Sie Ihre Adresse. Danach können Sie sich anmelden.');
      } else if(kind==='login') {
        const result=await loginWithEmail({email,password,twoFactorCode:twoFactor ? code : undefined,twoFactorMethod:twoFactor ? method : undefined});
        if(result.kind==='two_factor') setTwoFactor(true); else if(result.kind==='confirmed') { saveStoredSession(result.session); afterAuth(); } else setError(germanError(result.message));
      } else if(kind==='confirm') { await confirmEmailWithToken({email,token:String(data.get('token') ?? '')}); setMessage('Ihre E-Mail-Adresse wurde bestätigt. Sie können sich jetzt anmelden.'); }
      else if(kind==='forgot') { localStorage.setItem('exdox-preferred-language','de'); await requestPasswordReset({email,locale:'de'}); setMessage('Wenn die Adresse zu einem Konto gehört, erhalten Sie eine E-Mail mit weiteren Schritten.'); }
      else { await resetPasswordWithToken({email,token:String(data.get('token') ?? ''),password}); setMessage('Ihr Passwort wurde geändert. Sie können sich jetzt anmelden.'); }
    } catch(e) { setError(germanError(e)); } finally { setBusy(false); }
  }
  async function google(idToken:string) { setBusy(true);setError('');try {localStorage.setItem('exdox-preferred-language','de');const result=await authenticateWithGoogle(kind==='register'?{idToken,mode:'register',accountType:accountType==='employee'?'owner':accountType,organisationName,country,termsAccepted:terms}:{idToken,mode:'login',twoFactorCode:twoFactor?code:undefined,twoFactorMethod:twoFactor?method:undefined});if(result.kind==='confirmed') afterAuth(); else if(result.kind==='two_factor') setTwoFactor(true); else setError(germanError(result.message));}catch(e){setError(germanError(e));}finally{setBusy(false);}}
  return <Panel eyebrow="Ihr Exdox-Konto" title={titles[kind]}><div className="de-auth"><form className="de-form" onSubmit={submit}>
    {kind==='register' && <><p>14 Tage kostenlos, ohne Karte und ohne automatische Umwandlung in ein Abo.</p><label>Kontotyp<select value={accountType} onChange={e=>setAccountType(e.target.value as typeof accountType)}><option value="owner">Unternehmen</option><option value="sole_trader">Selbstständig</option>{params.get('inviteToken') && <option value="employee">Mitarbeitende</option>}</select></label>{accountType!=='employee' && <><label>Land des Arbeitsbereichs<select value={country} onChange={e=>{setCountry(e.target.value as Country);selectCountry(e.target.value as Country);}}>{countries.map(item=><option key={item.code} value={item.code}>{countryLabel(item)}</option>)}</select></label><label>{accountType==='sole_trader'?'Geschäftsname (optional)':'Name des Unternehmens'}<input value={organisationName} onChange={e=>setOrganisationName(e.target.value)} required={accountType==='owner'} /></label></>}<label>Vollständiger Name<input name="fullName" required /></label></>}
    <label>E-Mail-Adresse<input name="email" type="email" defaultValue={params.get('email') ?? ''} required /></label>
    {kind==='register' && <label>E-Mail-Adresse wiederholen<input name="confirmEmail" type="email" required /></label>}
    {(kind==='register'||kind==='login'||kind==='reset') && <label>Passwort<input name="password" type="password" autoComplete={kind==='login'?'current-password':'new-password'} minLength={kind==='login'?undefined:8} required /></label>}
    {kind==='register' && <label>Passwort wiederholen<input name="confirmPassword" type="password" minLength={8} required /></label>}
    {(kind==='confirm'||kind==='reset') && <label>Bestätigungscode<input name="token" defaultValue={params.get('token') ?? ''} required /></label>}
    {twoFactor && <><label>Bestätigungsmethode<select value={method} onChange={e=>setMethod(e.target.value as typeof method)}><option value="email">E-Mail-Code</option><option value="authenticator">Authenticator-App</option><option value="recovery">Wiederherstellungscode</option></select></label><label>Code<input value={code} onChange={e=>setCode(e.target.value)} required /></label></>}
    {kind==='register' && <label className="de-check"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)} required /><span>Ich akzeptiere die <Link to={de('/terms')}>Nutzungsbedingungen</Link> einschließlich der dort verlinkten englischen Originalfassung und habe die <Link to={de('/privacy')}>Datenschutzhinweise</Link> gelesen.</span></label>}
    {error && <p className="de-error" role="alert">{error}</p>}{message && <p className="de-success" role="status">{message}</p>}
    <button className="de-button" disabled={busy || (kind==='register' && !terms)}>{busy?'Bitte warten …':kind==='register'?'Mit E-Mail registrieren':kind==='login'?'Anmelden':kind==='confirm'?'E-Mail bestätigen':kind==='forgot'?'Link anfordern':'Passwort speichern'}</button>
  </form>
  {kind==='register' && accountType!=='employee' && <div className="de-google"><p>Oder mit Ihrem Google-Konto registrieren:</p><GoogleSignInButton text="signup_with" supportText="Verwenden Sie auf Website und App dasselbe Google-Konto." disabled={busy||!terms||(accountType==='owner'&&!organisationName.trim())} onCredential={google} /></div>}
  {kind==='login' && <div className="de-google"><p>Oder mit Google anmelden:</p><GoogleSignInButton text="signin_with" supportText="Verwenden Sie auf Website und App dasselbe Google-Konto." disabled={busy} onCredential={google} /></div>}
  <p>{kind==='register'?'Schon registriert?':'Neu bei Exdox?'} <Link to={de(kind==='register'?'/login':'/register')}>{kind==='register'?'Anmelden':'Kostenlos registrieren'}</Link></p>
  {kind==='login' && <p><Link to={de('/forgot-password')}>Passwort vergessen?</Link></p>}
  {kind==='confirm' && <button type="button" onClick={async()=>{setBusy(true);try{await resendConfirmationEmail({email:params.get('email')??'',locale:'de'});setMessage('Wenn diese Adresse noch bestätigt werden muss, wurde eine neue E-Mail gesendet.');}catch(e){setError(e instanceof Error?e.message:'E-Mail konnte nicht gesendet werden.');}finally{setBusy(false);}}}>Bestätigungs-E-Mail erneut senden</button>}
  </div></Panel>;
}

const terms = [
  ['Geltungsbereich','Diese Bedingungen gelten für Personen, die Exdox über Website, App oder verbundene Dienste registrieren oder nutzen. Wer einen Arbeitsbereich anlegt oder Exdox verwendet, akzeptiert sie für sich und gegebenenfalls für die eigene Organisation.'],
  ['Kontoerstellung','Unternehmen und Selbstständige können sich mit E-Mail und Passwort oder Google anmelden. Mitarbeitende treten einem vorhandenen Arbeitsbereich bei. Ein Google-Konto wird anhand seiner bestätigten Identität demselben Arbeitsbereich in App und Web zugeordnet. Ein vorhandenes E-Mail/Passwort-Konto wird nicht automatisch mit Google verbunden. Nach E-Mail/Passwort-Registrierung muss die Adresse innerhalb von drei Tagen bestätigt werden.'],
  ['Testphase und Zahlung','Neue Arbeitsbereiche beginnen mit einer kostenlosen Testphase von 14 Tagen. Tarif und Karte sind dafür nicht nötig. Die Testphase wird nicht automatisch kostenpflichtig. Um danach weiterzuarbeiten, wählt der Inhaber im Web einen Tarif und schließt die erste Zahlung über Stripe ab. Ohne Zahlung ruht der Arbeitsbereich; der Abrechnungsbereich bleibt erreichbar. Für ältere Testphasen mit hinterlegter Karte gelten die damals akzeptierten Zahlungsbedingungen.'],
  ['Verlängerung und Kündigung','Ein kostenpflichtiges Abo beginnt mit erfolgreicher erster Zahlung und verlängert sich gemäß den beim Kauf gezeigten Bedingungen, bis es vor der nächsten Verlängerung gekündigt wird. Die Kündigung verhindert weitere Verlängerungszahlungen; der Zugang bleibt normalerweise bis zum Ende des bezahlten Zeitraums bestehen. Eine kostenlose Testphase ohne Karte muss nicht gekündigt werden.'],
  ['Rückerstattung und gesetzliche Rechte','Melden Sie eine versehentliche erste Zahlung nach einer Testphase innerhalb von 14 Kalendertagen. Wir prüfen den Fall und erstatten normalerweise, wenn der Arbeitsbereich nach der Zahlung nicht wesentlich genutzt wurde. Spätere Verlängerungen beurteilen wir einzeln. Eine Kündigung erstattet bereits gezahlte Beträge nicht automatisch. Gesetzliche Rechte bleiben unberührt.'],
  ['Nutzung und Sicherheit','Nutzen Sie Exdox rechtmäßig. Missbrauch, schädliche Inhalte und unbefugter Zugriff sind untersagt. Für Richtigkeit, Rechtmäßigkeit und Zugriffsberechtigungen Ihrer eingereichten Daten sind Sie verantwortlich. Halten Sie Zugangsdaten vertraulich. Exdox kann bei Sicherheitsrisiken, Betrug, ausstehenden Zahlungen, rechtlichen Pflichten oder wesentlichen Vertragsverstößen den Zugang einschränken.'],
  ['Kunden außerhalb des Vereinigten Königreichs','Exdox wird im Vereinigten Königreich betrieben. Der Ein-Nutzer-Tarif wird für neue Abos in der beim Arbeitsbereich angezeigten Währung berechnet; größere Tarife werden in GBP abgerechnet. Banken können Wechselkurse und Gebühren anwenden. Prüfen Sie Preise und Währung vor dem Kauf. Exdox ist ein Werkzeug für Dokumente und Abläufe; Sie bleiben für die steuerliche und buchhalterische Behandlung verantwortlich. Nicht abdingbare Rechte bleiben bestehen.'],
  ['Verarbeitung von Kundendaten','Bei personenbezogenen Daten in Belegen, Rechnungen, Anträgen oder Kontakten ist die Kundenorganisation Verantwortliche und Exdox Auftragsverarbeiter. Die Vereinbarung zur Auftragsverarbeitung ist Bestandteil dieser Bedingungen.'],
  ['Verfügbarkeit, Änderungen und Haftung','Funktionen können geändert oder eingestellt werden. Ununterbrochene Verfügbarkeit wird nicht garantiert. Wesentliche Änderungen an Preisen gelten für die Zukunft. Soweit gesetzlich zulässig, haftet Exdox nicht für indirekte oder Folgeschäden; zwingende Haftung bleibt unberührt.'],
];
function Legal({ path }: { path: string }) {
  const title=legal.find(([url])=>url===path)?.[1] ?? 'Rechtliche Hinweise';
  if(path==='/terms') return <Panel eyebrow="Rechtliches" title="Nutzungsbedingungen"><p>Stand: 6. Oktober 2026</p><p className="de-legal-note">Diese deutsche Testfassung fasst die Bedingungen zusammen. Lesen Sie vor der Registrierung auch die <a href="/terms">vollständige englische Originalfassung</a>.</p><div className="de-legal">{terms.map(([heading,text])=><section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}<p>Weitere Informationen finden Sie unter <Link to={de('/data-processing-agreement')}>Auftragsverarbeitung</Link> und <Link to={de('/contact')}>Kontakt</Link>.</p></div></Panel>;
  const sections:Record<string,[string,string][]>={
    '/privacy':[['Wer verantwortlich ist','EXDOX LTD betreibt Website, App und Web-Arbeitsbereich. Für eigene Konto-, Support- und Abrechnungsdaten ist Exdox verantwortlich. Für hochgeladene Geschäftsunterlagen verarbeitet Exdox Daten im Auftrag der Kundenorganisation.'],['Welche Daten verarbeitet werden','Dazu gehören Konto- und Kontaktdaten, Rechnungs- und Zahlungsdaten, hochgeladene Belege und Dokumente, Nutzungs- und Sicherheitsdaten sowie Supportnachrichten.'],['Wofür Daten verwendet werden','Wir stellen den Dienst bereit, schützen Konten, bearbeiten Supportanfragen, verwalten Abrechnung und erfüllen gesetzliche Pflichten. Analyse- und Werbe-Cookies auf öffentlichen Seiten benötigen Ihre Auswahl.'],['Dienstleister und Übermittlungen','Für Betrieb, Zahlung, Kommunikation und optionale Integrationen werden Dienstleister eingesetzt. Einzelheiten stehen in der Liste der Unterauftragsverarbeiter und der Vereinbarung zur Auftragsverarbeitung.'],['Ihre Rechte','Sie können nach anwendbarem Datenschutzrecht Auskunft, Berichtigung, Löschung oder weitere Rechte geltend machen. Wenden Sie sich über das Kontaktformular an Exdox; bei Daten im Arbeitsbereich kann auch Ihre Organisation zuständig sein.']],
    '/data-processing-agreement':[['Rollen und Gegenstand','Die Kundenorganisation ist Verantwortliche für personenbezogene Daten in ihrem Arbeitsbereich; Exdox ist Auftragsverarbeiter. Die Verarbeitung dient der Bereitstellung des Exdox-Dienstes während der Vertragslaufzeit.'],['Weisungen und Vertraulichkeit','Exdox verarbeitet Kundendaten nach dokumentierten Weisungen und verpflichtet berechtigte Personen zur Vertraulichkeit.'],['Sicherheit und Unterstützung','Exdox setzt geeignete technische und organisatorische Maßnahmen ein und unterstützt die Organisation bei Betroffenenrechten und Datenschutzvorfällen im Rahmen der Vereinbarung.'],['Unterauftragsverarbeiter und internationale Übermittlungen','Eingesetzte Dienstleister und optionale Integrationen werden offengelegt. Internationale Übermittlungen benötigen die vorgesehenen rechtlichen Schutzmaßnahmen.'],['Löschung und Rückgabe','Nach Vertragsende werden Kundendaten gemäß Vereinbarung und Aufbewahrungsplan gelöscht oder zurückgegeben, soweit keine gesetzliche Aufbewahrungspflicht besteht.']],
    '/subprocessors':[['Infrastruktur und Dokumentverarbeitung','Exdox nutzt Dienstleister für Hosting, Speicherung, Kommunikation und Dokumentverarbeitung. Die jeweils aktuellen Anbieter und Verarbeitungsorte sind für eine verbindliche Prüfung in der englischen Fassung aufgeführt.'],['Optionale Integrationen','Kunden können zusätzliche Dienste wie Xero verbinden. Die Datenweitergabe hängt davon ab, welche Integrationen die Organisation aktiviert.']],
    '/data-retention':[['Arbeitsbereich und Unterlagen','Dokumente und Kontodaten werden während der Nutzung gespeichert. Nach Löschung eines Arbeitsbereichs erfolgen Entfernung und verbleibende Aufbewahrung gemäß dem geltenden Plan und gesetzlichen Pflichten.'],['Abrechnung, Support und Sicherheit','Zahlungsnachweise, Supportanfragen und Sicherheitsprotokolle können aus rechtlichen oder betrieblichen Gründen länger aufbewahrt werden.']],
    '/cookies':[['Notwendige Cookies','Diese sichern Sitzung, Anmeldung und grundlegende Funktionen.'],['Analyse und Werbung','Auf öffentlichen Seiten können nach Ihrer Zustimmung Analyse- und Werbetechnologien eingesetzt werden.'],['Ihre Auswahl','Sie können nur notwendige Cookies zulassen oder alle Cookies akzeptieren und Ihre Auswahl später über Cookie-Einstellungen ändern.']],
    '/account-deletion':[['Konto und Arbeitsbereich schließen','Ein Unternehmensadministrator kann den Arbeitsbereich in Profil/Einstellungen löschen. Damit wird das zugehörige Stripe-Abonnement gekündigt und der Arbeitsbereich entfernt.'],['Vor der Löschung','Exportieren Sie benötigte Unterlagen und prüfen Sie gesetzliche Aufbewahrungspflichten. Für Unterstützung nutzen Sie das Kontaktformular.']],
  };
  return <Panel eyebrow="Rechtliches" title={title}><p className="de-legal-note">Diese deutsche Testfassung fasst die Regelungen zusammen. Für die vollständigen rechtlichen Einzelheiten lesen Sie bitte auch die <a href={path}>englische Originalfassung</a>. Vor einer öffentlichen Einführung wird die vollständige deutsche Fassung rechtlich geprüft.</p><div className="de-legal">{(sections[path]??[]).map(([heading,text])=><section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}</div><p><Link to={de('/contact')}>Frage an Exdox senden</Link></p></Panel>;
}

export function GermanSite({ session }: { session: SessionState | null }) {
  const location=useLocation(); const raw=location.pathname.slice(base.length); const path=raw===''||raw==='/'?'/':raw.replace(/\/+$/,'');
  let content:ReactNode;
  if(path==='/') content=<Home session={session}/>; else if(path==='/platform') content=<Platform session={session}/>; else if(path==='/pricing') content=<GermanPricing session={session}/>; else if(path==='/faq') content=<Faq/>; else if(path==='/company') content=<Company/>; else if(path==='/contact') content=<Contact/>;
  else if(path==='/register'||path==='/login'||path==='/confirm-email'||path==='/forgot-password'||path==='/reset-password') content=<Auth key={path} kind={path==='/register'?'register':path==='/login'?'login':path==='/confirm-email'?'confirm':path==='/forgot-password'?'forgot':'reset'}/>;
  else if(path==='/compare/dext') content=<Comparison/>;
  else if(legal.some(([url])=>url===path)) content=<Legal path={path}/>;
  else content=<Panel eyebrow="404" title="Seite nicht gefunden"><p>Diese Seite ist nicht verfügbar.</p><Link to={de('/')}>Zur Startseite</Link></Panel>;
  return <><Seo path={path}/><Shell session={session}>{content}</Shell></>;
}
