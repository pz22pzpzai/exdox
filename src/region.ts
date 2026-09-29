import { useEffect, useState, useSyncExternalStore } from 'react';

export const euroCountries = [
  ['AT', 'Austria'], ['BE', 'Belgium'], ['BG', 'Bulgaria'], ['HR', 'Croatia'],
  ['CY', 'Cyprus'], ['EE', 'Estonia'], ['FI', 'Finland'], ['FR', 'France'],
  ['DE', 'Germany'], ['GR', 'Greece'], ['IE', 'Ireland'], ['IT', 'Italy'],
  ['LV', 'Latvia'], ['LT', 'Lithuania'], ['LU', 'Luxembourg'], ['MT', 'Malta'],
  ['NL', 'Netherlands'], ['PT', 'Portugal'], ['SK', 'Slovakia'], ['SI', 'Slovenia'],
  ['ES', 'Spain'], ['AD', 'Andorra'], ['MC', 'Monaco'], ['SM', 'San Marino'],
  ['VA', 'Vatican City'], ['XK', 'Kosovo'], ['ME', 'Montenegro'],
] as const;
const euroAreaCodes = new Set<string>(euroCountries.slice(0, 21).map(([code]) => code));
const euroStandardVatRates: Partial<Record<Country, number>> = {
  AT: 20, BE: 21, BG: 20, HR: 25, CY: 19, EE: 24, FI: 25.5,
  FR: 20, DE: 19, GR: 24, IE: 23, IT: 22, LV: 21, LT: 21,
  LU: 17, MT: 18, NL: 21, PT: 23, SK: 23, SI: 22, ES: 21,
};

export type Country = 'GB' | 'US' | 'AU' | 'CA' | typeof euroCountries[number][0];
export const countries: ReadonlyArray<{ code: Country; name: string }> = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  ...euroCountries.map(([code, name]) => ({ code, name })),
];

export function countryCurrency(country: Country) {
  return country === 'GB' ? 'GBP' : country === 'US' ? 'USD' : country === 'AU' ? 'AUD' : country === 'CA' ? 'CAD' : 'EUR';
}

export function countryTaxLabel(country: Country) {
  return country === 'GB' ? 'VAT' : country === 'US' ? 'Sales tax' : country === 'AU' ? 'GST' : country === 'CA' ? 'GST/HST' : euroAreaCodes.has(country) ? 'VAT' : 'Local tax';
}

export function countryTaxChoices(country: Country): string[] {
  if (country === 'GB') return ['20% Standard', '5% Reduced', '0% Zero', 'Exempt', 'No VAT'];
  if (country === 'US') return ['Review sales tax', 'Exempt', 'No tax tracked'];
  if (country === 'AU') return ['Review GST', '10% GST', 'GST-free', 'Input taxed', 'No tax tracked'];
  if (country === 'CA') return ['Review GST/HST', '5% GST', 'Review provincial tax', 'Zero-rated', 'Exempt', 'No tax tracked'];
  const standardRate = euroStandardVatRates[country];
  return euroAreaCodes.has(country) ? ['Review local VAT', ...(standardRate ? [`${standardRate}% standard VAT (reference)`] : []), 'Zero-rated', 'Exempt', 'No tax tracked'] : ['Review local tax', 'No tax tracked'];
}

export function countryTaxGuidance(country: Country) {
  if (country === 'GB') return null;
  if (country === 'US') return { text: 'Sales tax varies by state, locality and item. Enter the rate shown on the document or confirmed by your tax adviser.', url: 'https://www.streamlinedsalestax.org/state-tables' };
  if (country === 'AU') return { text: 'Australia uses 10% GST for many taxable supplies. GST-free and input-taxed items need separate review.', url: 'https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst' };
  if (country === 'CA') return { text: 'GST/HST depends on the province and place of supply; provincial PST/QST may also apply. Check each document.', url: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html' };
  if (euroAreaCodes.has(country)) return { text: `The reference standard VAT rate for ${countries.find((entry) => entry.code === country)?.name} is ${euroStandardVatRates[country]}%. Reduced rates, exemptions, and local regions vary.`, url: 'https://europa.eu/youreurope/business/finance-and-tax/vat/vat-rules-rates/index_en.htm' };
  return { text: 'This country uses EUR but follows its own tax rules. Review each document against local guidance.', url: 'https://economy-finance.ec.europa.eu/euro/use-euro/euro-outside-euro-area_en' };
}

export function countryDefaultTax(country: Country) {
  return countryTaxChoices(country)[0]!;
}

const storageKey = 'exdox-public-country';
const changeEvent = 'exdox-country-change';

function readCountry(): Country {
  if (typeof window === 'undefined') return 'GB';
  const value = window.localStorage.getItem(storageKey);
  return countries.find((country) => country.code === value)?.code ?? 'GB';
}

function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(changeEvent, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useSelectedCountry() {
  return useSyncExternalStore<Country>(subscribe, readCountry, () => 'GB');
}

export function selectCountry(country: Country) {
  window.localStorage.setItem(storageKey, country);
  window.dispatchEvent(new Event(changeEvent));
}

export function useGbpReferenceRate(country: Country) {
  const [rate, setRate] = useState<{ currency: string; value: number; date: string } | null>(null);
  const currency = countryCurrency(country);
  useEffect(() => {
    if (currency === 'GBP') { setRate(null); return; }
    const controller = new AbortController();
    setRate(null);
    fetch(`https://api.frankfurter.dev/v2/rate/GBP/${currency}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Rate unavailable')))
      .then((body: { rate?: unknown; date?: unknown }) => {
        if (typeof body.rate === 'number' && Number.isFinite(body.rate) && body.rate > 0 && typeof body.date === 'string') {
          setRate({ currency, value: body.rate, date: body.date });
        }
      })
      .catch(() => setRate(null));
    return () => controller.abort();
  }, [currency]);
  return rate;
}
