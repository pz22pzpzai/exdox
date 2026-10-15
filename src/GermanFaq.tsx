import { useState } from 'react';
import { Link } from 'react-router-dom';

type FaqItem = { question: string; answer: string; search?: string };
type FaqGroup = { title: string; description: string; items: FaqItem[] };

const groups: FaqGroup[] = [
  {
    title: 'Erste Schritte',
    description: 'Anmelden, den passenden Bereich wählen und die ersten Ansichten verstehen.',
    items: [
      {
        question: 'Wie melde ich mich bei Exdox an?',
        answer: 'Verwenden Sie auf der Website und in der App dieselbe E-Mail-Adresse und dasselbe Passwort. Falls die Anmeldung nicht klappt, prüfen Sie zuerst die E-Mail-Adresse Ihres Arbeitsbereichs. Benötigen Sie weiter Hilfe, nutzen Sie den Zugangssupport über „Über uns“ oder „Kontakt“.',
        search: 'login sign in email password access support',
      },
      {
        question: 'Was ist der Unterschied zwischen App und Website?',
        answer: 'Die App dient vor allem dazu, unterwegs Belege zu erfassen und Dokumente zu prüfen. Die Website bietet einen größeren Arbeitsbereich für Finanzaufgaben: Posteingänge prüfen, Lieferantenregeln verwalten, Anträge bearbeiten, auf das Archiv zugreifen, Daten exportieren und Einstellungen ändern.',
        search: 'mobile capture review workspace supplier rules claims vault exports settings',
      },
      {
        question: 'Warum sehe ich Kosten, Umsätze, Archiv, Anträge und weitere Bereiche?',
        answer: 'Das sind verschiedene Arbeitsbereiche innerhalb derselben Organisation. „Kosten“ ist für Belege und Einkaufsdokumente, „Umsätze“ für Verkaufsunterlagen, „Archiv“ für aufbewahrte Originaldokumente und „Anträge“ für Spesenanträge von Mitarbeitenden.',
        search: 'costs sales vault claims purchase documents employee expense claims',
      },
    ],
  },
  {
    title: 'Die mobile App nutzen',
    description: 'Häufige Fragen zum Hochladen und Prüfen von Belegen auf dem Smartphone.',
    items: [
      {
        question: 'Wie lade ich einen Beleg in der App hoch?',
        answer: 'Tippen Sie unten in der Navigation auf die Kameraschaltfläche, fotografieren Sie den Beleg oder wählen Sie eine Datei. Warten Sie, bis der Beleg hochgeladen und ausgelesen wurde. Sobald er in der Liste erscheint, können Sie ihn antippen und die erkannten Angaben bei Bedarf prüfen.',
        search: 'upload receipt camera photo file review',
      },
      {
        question: 'Was bedeutet „Zu prüfen“?',
        answer: 'Das Dokument befindet sich in der Prüfphase. Angaben wie Lieferant, Datum, Betrag, Kategorie oder Steuer müssen möglicherweise noch von einer Person bestätigt werden, bevor die Bearbeitung abgeschlossen ist.',
        search: 'to be reviewed review stage supplier date amount category vat tax',
      },
      {
        question: 'Warum erscheint ein Händlername in der App früher als auf der Website?',
        answer: 'In manchen Fällen zeigt die App bereits einen besser erkannten lokalen Lieferantennamen, während der Datensatz in der Cloud noch aktualisiert wird. Die Website zeigt den gespeicherten Cloud-Wert. Deshalb kann es kurz dauern, bis beide Ansichten übereinstimmen.',
        search: 'merchant name unknown supplier cloud sync delay',
      },
      {
        question: 'Was passiert, wenn ich denselben Beleg zweimal hochlade?',
        answer: 'Exakte doppelte Uploads sollen automatisch als Duplikate erkannt werden, besonders wenn derselbe Dateiname erneut verwendet wird. Ein blockiertes Duplikat sollte nicht als neuer normaler Eintrag in der Prüfwarteschlange erscheinen.',
        search: 'duplicate same receipt twice file name blocked review queue',
      },
    ],
  },
  {
    title: 'Die Website nutzen',
    description: 'Häufige Fragen zum Prüfbereich im Browser.',
    items: [
      {
        question: 'Wofür ist der Kosten-Posteingang da?',
        answer: 'Im Kosten-Posteingang landen hochgeladene Belege, Lieferantenrechnungen und andere Eingangsrechnungen zur Prüfung. Sie können suchen, filtern, ein Dokument öffnen, ausgelesene Angaben prüfen und Einträge für die nächsten Schritte vorbereiten oder veröffentlichen.',
        search: 'costs inbox receipts supplier bills invoices ready published',
      },
      {
        question: 'Warum steht bei einem Eintrag „Unbekannter Lieferant“?',
        answer: 'Im gespeicherten Datensatz auf der Website fehlt noch der Lieferantenname. Das Dokument muss meist geprüft werden, oder der Cloud-Datensatz hat den in der App früher erkannten Namen noch nicht übernommen.',
        search: 'unknown supplier blank saved supplier cloud',
      },
      {
        question: 'Was bedeutet „Fehlende Angaben“ unter Datenqualität?',
        answer: 'Dem Dokument fehlt ein wichtiges Feld für die Prüfung, meist der Lieferantenname oder die Kategorie. Der Hinweis fordert zur buchhalterischen Prüfung auf; er bedeutet keinen Softwarefehler.',
        search: 'missing details data health supplier category software error',
      },
      {
        question: 'Wie finde ich ein Dokument auf der Website schnell wieder?',
        answer: 'Nutzen Sie die Suche zusammen mit den Status- und Problemfiltern im Posteingang. Besonders hilfreich sind Lieferantennamen, Dateinamen, Kategorien, Notizen und Text aus dem Dokument.',
        search: 'find document search status issue filters supplier filename',
      },
    ],
  },
  {
    title: 'Prüfung, Synchronisierung und Fehlerbehebung',
    description: 'Kurze Antworten, wenn ein Dokument zunächst nicht richtig aussieht.',
    items: [
      {
        question: 'Was mache ich, wenn die erkannten Angaben falsch sind?',
        answer: 'Öffnen Sie das Dokument, korrigieren Sie die wichtigen Felder und speichern Sie die Prüfung. Wenn Lieferant, Datum, Beträge, Steuern oder Kategorie nicht richtig erkannt wurden, können Sie die Bearbeitung selbst abschließen.',
        search: 'wrong values correct fields save review supplier date totals tax category',
      },
      {
        question: 'Warum wird ein Dokument noch verarbeitet?',
        answer: 'Bei manchen Uploads dauert es länger, bis der endgültige Prüfstatus erreicht ist. Wenn die Verarbeitung ungewöhnlich lange anhält, aktualisieren Sie die Warteschlange und prüfen Sie erneut, bevor Sie von einem Fehler ausgehen.',
        search: 'still processing upload refresh queue pending failed',
      },
      {
        question: 'Warum sehe ich einen Eintrag an einer Stelle, aber nicht an einer anderen?',
        answer: 'App und Website sollen synchron bleiben. Während Upload, Auslesen oder Prüfänderungen noch abgeglichen werden, kann ein Datensatz kurzzeitig unterschiedlich aussehen. Wenn sich das nicht klärt, öffnen Sie den Datensatz erneut und prüfen Sie die zuletzt gespeicherten Angaben.',
        search: 'sync app website extraction latest saved fields',
      },
      {
        question: 'Wo bekomme ich Hilfe zu Konto, Abrechnung oder Sicherheit?',
        answer: 'Nutzen Sie die Supportmöglichkeiten unter „Über uns“ oder „Kontakt“. Für Zugang, Abrechnung und Sicherheitsanfragen gibt es getrennte Kontaktwege, damit Ihre Anfrage beim passenden Team ankommt.',
        search: 'account billing security support access contact',
      },
    ],
  },
  {
    title: 'Testphase, Abrechnung und Deutschland',
    description: 'Weitere Antworten zur deutschsprachigen Testphase und zu länderabhängigen Angaben.',
    items: [
      { question: 'Brauche ich für die Testphase eine Karte?', answer: 'Nein. Ein neuer Unternehmens- oder Selbstständigen-Arbeitsbereich startet mit einer 14-tägigen Testphase ohne Karte und ohne gewählten Tarif.' },
      { question: 'Wird nach 14 Tagen automatisch abgebucht?', answer: 'Nein. Erst wenn der Inhaber einen Tarif auswählt und die erste Zahlung abschließt, beginnt ein kostenpflichtiges Abonnement.' },
      { question: 'Kann ich Google zur Registrierung nutzen?', answer: 'Ja. Verwenden Sie dasselbe Google-Konto auf Website und Android-App. Ein bestehendes Konto mit E-Mail und Passwort wird nicht automatisch mit Google zusammengeführt.' },
      { question: 'Können Mitarbeitende einen eigenen Arbeitsbereich anlegen?', answer: 'Mitarbeitende treten über eine Einladung dem vorhandenen Arbeitsbereich ihres Unternehmens bei. Eine Einladung startet keine eigene Testphase.' },
      { question: 'Welche Währung gilt?', answer: 'Die Sprache der Website ändert Ihre Abrechnungswährung nicht. Diese richtet sich nach dem Land des Arbeitsbereichs und dem gewählten Tarif. Größere Tarife werden derzeit in GBP berechnet.' },
      { question: 'Kann Exdox deutsche Steuerregeln automatisch prüfen?', answer: 'Exdox hilft bei Erfassung und Prüfung von Dokumenten. Es ersetzt keine steuerliche Beratung und bestimmt die richtige Behandlung für Ihr Unternehmen nicht automatisch.' },
    ],
  },
];

export function GermanFaq() {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('de');
  const filteredGroups = groups.map(group => ({
    ...group,
    items: group.items.filter(item => !normalizedQuery || `${group.title} ${group.description} ${item.question} ${item.answer} ${item.search ?? ''}`.toLocaleLowerCase('de').includes(normalizedQuery)),
  })).filter(group => group.items.length > 0);
  const matches = filteredGroups.reduce((count, group) => count + group.items.length, 0);

  return <section className="faq-band de-faq-page">
    <div className="section-heading"><div><p className="section-kicker">Hilfe</p><h1>Antworten auf alltägliche Fragen zur Arbeit mit Exdox</h1></div><p>Hier finden Sie Antworten zur Exdox-App und Website, darunter Uploads, Prüfwarteschlangen, Duplikate, Anträge und Synchronisierung.</p></div>
    <div className="faq-search-shell"><label className="faq-search-label" htmlFor="de-faq-search">Häufige Fragen durchsuchen</label><input id="de-faq-search" className="faq-search-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Häufige Fragen durchsuchen" aria-label="Häufige Fragen durchsuchen" /><p className="faq-search-meta" role="status">{normalizedQuery ? `${matches} ${matches === 1 ? 'Antwort' : 'Antworten'} für „${query.trim()}“ gefunden.` : 'Suchen Sie nach einem Problem, einem Seitennamen oder einem Begriff aus der App oder Website.'}</p></div>
    <div className="faq-summary-grid"><article className="company-card"><strong>App zum Erfassen nutzen</strong><p>Fotografieren und laden Sie Belege unterwegs hoch und prüfen Sie deren Status.</p></article><article className="company-card"><strong>Website zum Prüfen nutzen</strong><p>Öffnen Sie Posteingänge, korrigieren Sie Angaben, verwalten Sie den Bearbeitungsstatus und nutzen Sie weitere Finanzfunktionen.</p></article><article className="company-card"><strong>Support bei anhaltenden Problemen nutzen</strong><p>Wenn ein Anmelde-, Synchronisierungs- oder Sicherheitsproblem nach Aktualisierung und Prüfung bestehen bleibt, nutzen Sie die Supportwege unter <Link to="/de/company">„Über uns“</Link> oder <Link to="/de/contact">„Kontakt“</Link>.</p></article></div>
    <div className="faq-group-list">{filteredGroups.map(group => <section className="faq-group" key={group.title}><div className="section-heading faq-group-heading"><div><p className="section-kicker">FAQ-Bereich</p><h2>{group.title}</h2></div><p>{group.description}</p></div><div className="faq-items">{group.items.map(item => <details className="faq-item" key={item.question}><summary>{item.question}</summary><div className="faq-answer"><p>{item.answer}</p></div></details>)}</div></section>)}{!filteredGroups.length && <article className="company-card faq-empty-state"><strong>Keine passende Antwort gefunden</strong><p>Versuchen Sie einfachere Begriffe wie Anmeldung, Beleg, Prüfung, Duplikat, Abrechnung oder Lieferant.</p></article>}</div>
  </section>;
}
