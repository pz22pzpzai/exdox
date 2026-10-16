import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { submitContactForm } from './api';
import { contactSubjectForLanguage } from './languageRouting';
import type { SessionState } from './types';

const contactEmail = 'contact@exdox.co.uk';
const subjectOptions = [
  'Allgemeine Anfrage',
  'Hilfe beim Zugang',
  'Hilfe zur Abrechnung',
  'Anfrage zu individuellen Preisen',
  'Produktvorführung',
  'Hilfe bei der Einrichtung',
  'Interesse an der iPhone-App anmelden',
  'Sicherheitsanfrage',
  'Frage zu den Nutzungsbedingungen',
  'Datenschutzanfrage',
  'Anfrage zu Datenschutzrechten',
  'Frage zur Auftragsverarbeitung',
  'Frage zur Cookie-Richtlinie',
  'Anfrage zur Kontolöschung',
];

export function GermanContact({ session }: { session: SessionState | null }) {
  const location = useLocation();
  const rawSubject = new URLSearchParams(location.search).get('subject')?.trim();
  const requestedSubject = rawSubject ? contactSubjectForLanguage(rawSubject, 'de') ?? rawSubject : undefined;
  const [name, setName] = useState(session?.user.fullName?.trim() || '');
  const [email, setEmail] = useState(session?.user.email || '');
  const [company, setCompany] = useState(session?.organisations.find(item => item.id === session.activeOrganisationId)?.name?.trim() || '');
  const [subject, setSubject] = useState(requestedSubject || subjectOptions[0]!);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState(false);

  useEffect(() => {
    if (requestedSubject) setSubject(requestedSubject);
  }, [requestedSubject]);

  useEffect(() => {
    if (!session) return;
    const activeOrganisation = session.organisations.find(item => item.id === session.activeOrganisationId);
    setName(current => current || session.user.fullName?.trim() || '');
    setEmail(current => current || session.user.email || '');
    setCompany(current => current || activeOrganisation?.name?.trim() || '');
  }, [session]);

  const canSubmit = Boolean(name.trim() && email.trim() && subject.trim() && message.trim() && !submitting);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSent(false);
    setSendError(false);
    try {
      await submitContactForm({
        fullName: name.trim(),
        email: email.trim(),
        organisationName: company.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setSent(true);
      setMessage('');
    } catch {
      setSendError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="de-contact">
    <section className="public-page-intro">
      <p className="section-kicker">Kontakt</p>
      <h1>Sprechen Sie mit Exdox über Zugang, Abrechnung oder das Produkt.</h1>
      <p>Senden Sie dem Exdox-Team eine Nachricht. Ihre Anfrage erreicht uns über <a href={`mailto:${contactEmail}`}>{contactEmail}</a> und wird an die richtige Stelle weitergeleitet.</p>
    </section>
    <section className="company-band contact-band">
      <div className="section-heading">
        <div><p className="section-kicker">Kontakt</p><h2>Senden Sie Ihre Nachricht an das Exdox-Team</h2></div>
        <p>Ihre Nachricht wird über das zentrale Exdox-Postfach <a href={`mailto:${contactEmail}`}>{contactEmail}</a> bearbeitet.</p>
      </div>
      <div className="contact-layout">
        <div className="contact-form-card">
          <div className="panel-heading"><h2>Kontaktformular</h2><span>Für Support, Abrechnung, Einrichtung, Vorführungen und allgemeine Fragen.</span></div>
          <form className="contact-form-grid" onSubmit={send}>
            <label>Vollständiger Name<input value={name} onChange={event => setName(event.target.value)} placeholder="Ihr vollständiger Name" autoComplete="name" required /></label>
            <label>E-Mail-Adresse<input value={email} onChange={event => setEmail(event.target.value)} placeholder="sie@unternehmen.de" type="email" autoComplete="email" required /></label>
            <label>Unternehmen<input value={company} onChange={event => setCompany(event.target.value)} placeholder="Name Ihres Unternehmens" autoComplete="organization" /></label>
            <label>Betreff<select value={subject} onChange={event => setSubject(event.target.value)}>{requestedSubject && !subjectOptions.includes(requestedSubject) ? <option>{requestedSubject}</option> : null}{subjectOptions.map(option => <option key={option}>{option}</option>)}</select></label>
            <label className="contact-form-message">Nachricht<textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Wobei können wir Ihnen helfen?" rows={8} required /></label>
            <div className="toolbar"><button className="primary-action" type="submit" disabled={!canSubmit}>{submitting ? 'Wird gesendet …' : 'Nachricht senden'}</button></div>
            {sent ? <p className="form-status success" role="status">Ihre Nachricht wurde an das Exdox-Team gesendet.</p> : null}
            {sendError ? <p className="form-status error" role="alert">Ihre Nachricht konnte gerade nicht gesendet werden. Bitte versuchen Sie es erneut.</p> : null}
          </form>
        </div>
        <div className="contact-side-grid">
          <article className="company-card"><strong>Zentrale Kontaktadresse</strong><p>Alle Anfragen von Kunden und Interessenten gehen an das zentrale Exdox-Postfach.</p><a className="secondary-inline-link company-card-link-row" href={`mailto:${contactEmail}`}>{contactEmail}</a></article>
          <article className="company-card"><strong>Wobei wir Ihnen hier helfen</strong><p>Produktfragen, Einrichtung, Preise, Zugang, Abrechnung und Sicherheitsanfragen.</p></article>
          <article className="company-card"><strong>Sie suchen zuerst eine schnelle Antwort?</strong><p>Bei Fragen zur Anmeldung, zum Hochladen von Belegen oder zur Prüfung hilft Ihnen möglicherweise unsere FAQ-Seite.</p><Link className="secondary-inline-link company-card-link-row" to="/de/faq">Häufige Fragen öffnen</Link></article>
        </div>
      </div>
    </section>
  </div>;
}
