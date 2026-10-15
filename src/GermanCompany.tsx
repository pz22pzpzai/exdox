import { Link } from 'react-router-dom';
import type { SessionState } from './types';

export function GermanCompany({ session }: { session: SessionState | null }) {
  const workspaceRoute = session && (session.user.isOwner || session.allowedWebRoutes?.includes('/billing')) ? '/billing' : '/overview';
  const workspaceLabel = workspaceRoute === '/billing' ? 'Abrechnung öffnen' : 'Zum Arbeitsbereich';

  return <div className="de-company">
    <section className="public-page-intro">
      <p className="section-kicker">Über uns</p>
      <h1>Entwickelt, damit Erfassung, Prüfung und Originalbelege zusammenpassen.</h1>
      <p>Unternehmensbezogene Datensätze begleiten den Weg von der mobilen Erfassung über die Prüfung im Web bis zum Abruf aus dem Archiv und zu Finanzkontrollen.</p>
    </section>
    <section className="company-band">
      <div className="section-heading">
        <div><p className="section-kicker">Über Exdox</p><h2>Ein nachvollziehbarer Belegweg von der App bis zum Web-Arbeitsbereich</h2></div>
        <p>Exdox hält die Datensätze eines Unternehmens in App und Web sichtbar. Prüfstatus, Steuerkorrekturen und Dokumentenaktionen bleiben synchron.</p>
      </div>
      <div className="company-grid">
        <article className="company-card">
          <strong>Geschützter Arbeitsablauf</strong>
          <p>Unternehmensbezogene Zugriffswege, angemeldete Sitzungen und geschützter Abruf von Belegdateien.</p>
          <Link className="secondary-inline-link company-card-link-row" to={session ? workspaceRoute : '/de/pricing'}>{session ? workspaceLabel : 'Passendes Kontingent wählen'}</Link>
        </article>
        <article className="company-card">
          <strong>Nachvollziehbare Prüfung</strong>
          <p>Belege, Archivdateien, Umsatznachweise, Anträge, Lieferantenregeln und Abgleichstatus stehen in einem Arbeitsbereich bereit.</p>
          <Link className="secondary-inline-link company-card-link-row" to={session ? workspaceRoute : '/de/register'}>{session ? workspaceLabel : 'Kostenlos testen'}</Link>
        </article>
        <article className="company-card">
          <strong>Für Finanzteams entwickelt</strong>
          <p>Unternehmensadministratoren verwalten die Prüf- und Steuerungsfunktionen. Mitarbeitende können Dokumente direkt einreichen; der aktive Unternehmensbereich bleibt sichtbar.</p>
          <Link className="secondary-inline-link company-card-link-row" to="/de/pricing">Preise ansehen</Link>
        </article>
      </div>
      <div className="section-heading" id="support">
        <div><p className="section-kicker">Hilfe</p><h2>Hilfe zu Zugang, Abrechnung und Sicherheit an einem Ort</h2></div>
        <p>Wählen Sie den passenden Weg für die Freischaltung des Arbeitsbereichs, Fragen zur Abrechnung, Passwörter und Sicherheitsanliegen.</p>
      </div>
      <div className="company-grid">
        <article className="company-card">
          <strong>Hilfe und häufige Fragen</strong>
          <p>Antworten zur mobilen Erfassung, Prüfung im Web, doppelten Belegen, Anträgen und Synchronisierung von Dokumenten.</p>
          <Link className="secondary-inline-link company-card-link-row" to="/de/faq">Häufige Fragen öffnen</Link>
        </article>
        <article className="company-card">
          <strong>Exdox kontaktieren</strong>
          <p>Das Kontaktformular ist für allgemeine Produktfragen, Vorführungen, die Einrichtung und Supportanfragen da.</p>
          <Link className="secondary-inline-link company-card-link-row" to="/de/contact">Kontaktseite öffnen</Link>
        </article>
        <article className="company-card">
          <strong>Hilfe beim Zugang</strong>
          <p>Hilfe bei der Anmeldung, beim Zurücksetzen des Passworts, bei Einladungen und bei der Freischaltung.</p>
          <Link className="secondary-inline-link company-card-link-row" to="/de/contact?subject=Hilfe%20beim%20Zugang">Anfrage zum Zugang senden</Link>
        </article>
        <article className="company-card">
          <strong>Hilfe zur Abrechnung</strong>
          <p>Fragen zu Tarifen, zur Freischaltung des Arbeitsbereichs und zu Änderungen der Abrechnung.</p>
          <Link className="secondary-inline-link company-card-link-row" to="/de/contact?subject=Hilfe%20zur%20Abrechnung">Anfrage zur Abrechnung senden</Link>
        </article>
      </div>
    </section>
  </div>;
}
