import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authenticateWithGoogle, confirmEmailWithToken, loginWithEmail, registerWithEmail, requestPasswordReset, resetPasswordWithToken, resendConfirmationEmail, saveStoredSession, submitContactForm } from './api';
import { GoogleSignInButton } from './GoogleSignInButton';
import { cookieConsentStorageKey, setGoogleAnalyticsConsent, type CookieConsentChoice } from './googleAnalytics';
import { countries, selectCountry, useSelectedCountry, type Country } from './region';
import type { SessionState } from './types';
import './german.css';

const base = '/de';
const de = (path = '') => `${base}${path}`;
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
      <Link className="de-brand" to={de('/')}><img src="/branding/exdox-mark-header-v2-96.webp" alt="" />Exdox</Link>
      <nav aria-label="Deutschsprachige Seiten">{pages.map(([url, label]) => <Link key={url} to={de(url)}>{label}</Link>)}</nav>
      <div className="de-header-actions"><label>Land <select value={country} onChange={e => selectCountry(e.target.value as Country)}>{countries.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><Link to={de('/login')}>Anmelden</Link><Link className="de-button" to={session ? '/overview' : de('/register')}>{session ? 'Zum Arbeitsbereich' : 'Kostenlos testen'}</Link><Link to="/" lang="en">English</Link></div>
    </header>
    <main>{children}</main>
    <footer className="de-footer"><div><strong>Exdox</strong><p>Belege, Ausgaben und Freigaben an einem Ort.</p><p>EXDOX LTD · England und Wales · Unternehmensnummer 17488771</p><p>1 Cannon Hill, Bracknell, United Kingdom, RG12 7QA</p></div><nav aria-label="Rechtliches">{legal.map(([url, label]) => <Link key={url} to={de(url)}>{label}</Link>)}<button type="button" onClick={() => setShowCookies(true)}>Cookie-Einstellungen</button></nav></footer>
    {showCookies && <div className="de-cookie" role="dialog" aria-label="Cookie-Einstellungen"><strong>Cookie-Einstellungen</strong><p>Notwendige Cookies halten die Website funktionsfähig. Analyse- und Werbe-Cookies verwenden wir nur mit Ihrer Zustimmung. Mehr dazu in der <Link to={de('/cookies')}>Cookie-Richtlinie</Link>.</p><div><button type="button" onClick={() => chooseConsent('essential_only')}>Nur notwendige Cookies</button><button type="button" onClick={() => chooseConsent('all_cookies')}>Alle Cookies akzeptieren</button></div></div>}
  </div>;
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <section className="de-panel"><span className="de-eyebrow">{eyebrow}</span><h1>{title}</h1>{children}</section>;
}
function Cards({ items }: { items: { title: string; text: string }[] }) {
  return <div className="de-cards">{items.map(item => <article key={item.title}><h2>{item.title}</h2><p>{item.text}</p></article>)}</div>;
}
function Home() { return <>
  <section className="de-hero"><div><span className="de-eyebrow">Für Unternehmen und Selbstständige</span><h1>Belege und Spesen vom Smartphone bis zur Freigabe im Blick.</h1><p>Erfassen Sie Belege und Rechnungen in der App. Prüfen Sie Ausgaben, Fahrtkosten und Anträge anschließend im selben Exdox-Arbeitsbereich im Web.</p><div className="de-actions"><Link className="de-button" to={de('/register')}>14 Tage kostenlos testen</Link><Link to={de('/platform')}>So funktioniert Exdox</Link></div><small>Keine Kreditkarte erforderlich. Nach der Testphase wählen Sie nur dann einen kostenpflichtigen Tarif, wenn Sie Exdox weiter nutzen möchten.</small></div><img src="/branding/exdox-mileage-entry.webp" alt="Exdox-App: Erfassung einer Fahrtkostenabrechnung" /></section>
  <Cards items={[{title:'Belege und Rechnungen',text:'Laden Sie Dokumente per App oder Web hoch und prüfen Sie die erkannten Angaben.'},{title:'Prüfen und freigeben',text:'Behalten Sie offene Aufgaben im Blick und führen Sie Ausgaben und Anträge durch den Freigabeprozess.'},{title:'Originale wiederfinden',text:'Das Originaldokument bleibt beim zugehörigen Datensatz und kann später erneut geöffnet werden.'}]} />
  <section className="de-cta"><h2>Ein Arbeitsbereich für Ihr Team</h2><p>Mobil erfassen, im Web prüfen und bei Bedarf mit Xero weiterarbeiten.</p><Link className="de-button" to={de('/pricing')}>Tarife ansehen</Link></section>
  </>; }
function Platform() { return <Panel eyebrow="Plattform" title="Von der Erfassung bis zum geprüften Datensatz."><p>Exdox verbindet mobile Belegerfassung mit einem Web-Arbeitsbereich für Kosten, Umsätze, Dokumente und Anträge.</p><Cards items={[{title:'1. Erfassen',text:'Fotografieren Sie einen Beleg in der App oder laden Sie eine Datei im Web hoch.'},{title:'2. Prüfen',text:'Kontrollieren Sie erkannte Angaben, Steuern und das Original, bevor Sie den Datensatz freigeben.'},{title:'3. Weiterverarbeiten',text:'Verfolgen Sie den Status, nutzen Sie Exporte und verbinden Sie unterstützte Abläufe mit Xero.'},{title:'Fahrtkosten',text:'Erfassen Sie Fahrten und reichen Sie Kilometeranträge ein. Verfügbare Streckenhilfen unterscheiden sich je nach Land.'},{title:'Dokumentenarchiv',text:'Bewahren Sie die Originaldatei beim passenden Vorgang auf.'},{title:'Team und Regeln',text:'Rollen, Freigaben sowie Lieferanten- und Kundenregeln unterstützen wiederkehrende Abläufe.'}]} /><p><Link className="de-button" to={de('/register')}>Kostenlos registrieren</Link></p></Panel>; }
function Pricing() { return <Panel eyebrow="Preise" title="14 Tage kostenlos testen. Danach bewusst entscheiden."><p>Für einen neuen Arbeitsbereich brauchen Sie weder einen Tarif noch eine Karte. Nach 14 Tagen wählen Sie bei Bedarf im Bereich „Abrechnung“ einen Tarif und bezahlen erst dann.</p><Cards items={[{title:'1 Nutzer · 100 Dokumente',text:'Für einen neuen Arbeitsbereich mit Land Deutschland: 3 € pro Monat. Xero ist bei diesem Tarif eine gesonderte kostenpflichtige Option.'},{title:'5 Nutzer · 250 Dokumente',text:'15 £ pro Monat inklusive britischer Umsatzsteuer. Die Zahlung erfolgt in GBP; Ihre Bank kann Währungsumrechnung und Gebühren berechnen.'},{title:'Größere Teams',text:'Weitere Nutzer- und Dokumentkontingente sind im Arbeitsbereich verfügbar. Prüfen Sie den tatsächlichen Preis und die Abrechnungswährung vor der Zahlung.'}]} /><p>Preise und Verfügbarkeit können sich ändern. Es gelten die Angaben bei der Auswahl und im sicheren Stripe-Bezahlvorgang. Die Steuersituation Ihres Unternehmens prüfen Sie bitte selbst.</p><Link className="de-button" to={de('/register')}>Kostenlose Testphase starten</Link></Panel>; }
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
  const [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [error,setError]=useState('');
  async function send(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form=new FormData(event.currentTarget); setBusy(true); setError(''); setMessage(''); try { await submitContactForm({fullName:String(form.get('name')).trim(),email:String(form.get('email')).trim(),organisationName:String(form.get('company')).trim(),subject:String(form.get('subject')).trim(),message:String(form.get('message')).trim()}); setMessage('Ihre Nachricht wurde gesendet.'); event.currentTarget.reset(); } catch(e) { setError(e instanceof Error ? e.message : 'Die Nachricht konnte nicht gesendet werden.'); } finally { setBusy(false); } }
  return <Panel eyebrow="Kontakt" title="Wie können wir Ihnen helfen?"><p>Fragen zu Zugang, Abrechnung, Datenschutz oder Exdox senden Sie an unser Team. Sie können auch an contact@exdox.co.uk schreiben.</p><form className="de-form" onSubmit={send}><label>Vollständiger Name<input name="name" required /></label><label>E-Mail-Adresse<input name="email" type="email" required /></label><label>Unternehmen (optional)<input name="company" /></label><label>Betreff<input name="subject" required /></label><label>Nachricht<textarea name="message" rows={6} required /></label>{error && <p role="alert" className="de-error">{error}</p>}{message && <p role="status" className="de-success">{message}</p>}<button className="de-button" disabled={busy}>Nachricht senden</button></form></Panel>;
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
    {kind==='register' && <><p>14 Tage kostenlos, ohne Karte und ohne automatische Umwandlung in ein Abo.</p><label>Kontotyp<select value={accountType} onChange={e=>setAccountType(e.target.value as typeof accountType)}><option value="owner">Unternehmen</option><option value="sole_trader">Selbstständig</option>{params.get('inviteToken') && <option value="employee">Mitarbeitende</option>}</select></label>{accountType!=='employee' && <><label>Land des Arbeitsbereichs<select value={country} onChange={e=>{setCountry(e.target.value as Country);selectCountry(e.target.value as Country);}}>{countries.map(item=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label>{accountType==='sole_trader'?'Geschäftsname (optional)':'Name des Unternehmens'}<input value={organisationName} onChange={e=>setOrganisationName(e.target.value)} required={accountType==='owner'} /></label></>}<label>Vollständiger Name<input name="fullName" required /></label></>}
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
  if(path==='/') content=<Home/>; else if(path==='/platform') content=<Platform/>; else if(path==='/pricing') content=<Pricing/>; else if(path==='/faq') content=<Faq/>; else if(path==='/company') content=<Company/>; else if(path==='/contact') content=<Contact/>;
  else if(path==='/register'||path==='/login'||path==='/confirm-email'||path==='/forgot-password'||path==='/reset-password') content=<Auth key={path} kind={path==='/register'?'register':path==='/login'?'login':path==='/confirm-email'?'confirm':path==='/forgot-password'?'forgot':'reset'}/>;
  else if(path==='/compare/dext') content=<Comparison/>;
  else if(legal.some(([url])=>url===path)) content=<Legal path={path}/>;
  else content=<Panel eyebrow="404" title="Seite nicht gefunden"><p>Diese Seite ist nicht verfügbar.</p><Link to={de('/')}>Zur Startseite</Link></Panel>;
  return <><Seo path={path}/><Shell session={session}>{content}</Shell></>;
}
