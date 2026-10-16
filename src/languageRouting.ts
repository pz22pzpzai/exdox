// Only pages with a complete German counterpart are eligible for language switching.
const translatedPaths = new Set([
  '/platform', '/pricing', '/faq', '/company', '/contact',
  '/terms', '/privacy', '/data-processing-agreement', '/subprocessors',
  '/data-retention', '/cookies', '/account-deletion',
  '/register', '/login', '/forgot-password', '/confirm-email', '/reset-password',
]);

const contactSubjects: Record<string, string> = {
  'General enquiry': 'Allgemeine Anfrage',
  'Access support': 'Hilfe beim Zugang',
  'Billing support': 'Hilfe zur Abrechnung',
  'Bespoke pricing enquiry': 'Anfrage zu individuellen Preisen',
  'Product demo': 'Produktvorführung',
  'Onboarding help': 'Hilfe bei der Einrichtung',
  'Register interest for iPhone app': 'Interesse an der iPhone-App anmelden',
  'Security request': 'Sicherheitsanfrage',
  'Terms request': 'Frage zu den Nutzungsbedingungen',
  'Privacy request': 'Datenschutzanfrage',
  'Data rights request': 'Anfrage zu Datenschutzrechten',
  'Data processing agreement request': 'Frage zur Auftragsverarbeitung',
  'Cookie policy request': 'Frage zur Cookie-Richtlinie',
  'Account deletion request': 'Anfrage zur Kontolöschung',
};

export function germanPathForEnglish(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/' ? '/de/' : translatedPaths.has(path) ? `/de${path}` : null;
}

export function englishPathForGerman(pathname: string): string | null {
  if (pathname === '/de' || pathname === '/de/') return '/';
  const path = pathname.startsWith('/de/') ? pathname.slice(3).replace(/\/+$/, '') : '';
  return translatedPaths.has(path) ? path : null;
}

export function equivalentLanguageSearch(pathname: string, search: string, language: 'en' | 'de'): string {
  if (!pathname.endsWith('/contact') || !search) return search;
  const params = new URLSearchParams(search);
  const subject = params.get('subject');
  if (!subject) return search;
  const translated = contactSubjectForLanguage(subject, language);
  if (!translated) return search;
  params.set('subject', translated);
  return `?${params.toString()}`;
}

export function contactSubjectForLanguage(subject: string, language: 'en' | 'de'): string | null {
  return language === 'de'
    ? contactSubjects[subject] ?? null
    : Object.entries(contactSubjects).find(([, german]) => german === subject)?.[0] ?? null;
}

export function rememberPublicLanguage(language: 'en' | 'de'): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `exdox_lang=${language}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  window.localStorage.setItem('exdox-preferred-language', language);
}
