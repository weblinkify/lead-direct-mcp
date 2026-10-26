/** Browser port of the pure helpers in leaddirect/extract.py. */

export const GENERIC_LOCALS = new Set([
  'info', 'contact', 'hello', 'hi', 'sales', 'office', 'support', 'admin', 'service', 'services',
  'enquiries', 'inquiries', 'enquiry', 'inquiry', 'mail', 'team', 'help', 'orders', 'order', 'billing',
  'accounts', 'marketing', 'press', 'media', 'careers', 'jobs', 'hr', 'webmaster', 'export', 'kontakt',
  'iletisim', 'bilgi', 'satis', 'contacto', 'ventas',
  // sales / office / service in other languages
  'ventes', 'commercial', 'accueil', 'atelier', 'devis', 'vertrieb', 'verkauf', 'buero', 'zentrale',
  'myynti', 'asiakaspalvelu', 'toimisto', 'tilaukset', 'muhasebe', 'destek', 'satinalma', 'comercial',
  'vendite', 'verkoop', 'salg', 'forsaljning', 'kundtjanst', 'kundeservice', 'biuro', 'sprzedaz',
]);

const EMAIL_RE = /(?<![\w.+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}(?![\w-])/g;
const ASSET_SUFFIXES = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.css', '.js', '.ico'];
const JUNK_DOMAINS = ['example.com', 'example.org', 'domain.com', 'email.com', 'yourdomain.com', 'sentry.io',
  'wixpress.com', 'godaddy.com'];
const JUNK_LOCALS = new Set(['noreply', 'no-reply', 'donotreply', 'do-not-reply', 'user', 'name', 'your', 'youremail',
  'firstname.lastname', 'first.last', 'fornavn.etternavn', 'fornamn.efternamn', 'etunimi.sukunimi',
  'vorname.nachname', 'prenom.nom', 'nombre.apellido', 'nome.cognome', 'voornaam.achternaam', 'ad.soyad',
  'isim.soyisim', 'imie.nazwisko']);

export function decodeCfEmail(encoded: string): string {
  if (encoded.length < 4 || encoded.length % 2 || !/^[0-9a-fA-F]+$/.test(encoded)) {
    throw new Error('Not a Cloudflare-encoded email');
  }
  const key = parseInt(encoded.slice(0, 2), 16);
  let out = '';
  for (let i = 2; i < encoded.length; i += 2) out += String.fromCharCode(parseInt(encoded.slice(i, i + 2), 16) ^ key);
  return out;
}

export function encodeCfEmail(email: string, key = 0x5a): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return hex(key) + [...email].map((c) => hex(c.charCodeAt(0) ^ key)).join('');
}

export function isPlausibleEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (ASSET_SUFFIXES.some((s) => lower.endsWith(s))) return false;
  const at = lower.indexOf('@');
  const local = lower.slice(0, at);
  const domain = lower.slice(at + 1);
  if (at <= 0 || !domain || lower.includes('..') || local.startsWith('.') || local.endsWith('.')) return false;
  if (JUNK_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return false;
  if (JUNK_LOCALS.has(local)) return false;
  return new RegExp(`^${EMAIL_RE.source}$`).test(email);
}

export function isGeneric(email: string): boolean {
  return GENERIC_LOCALS.has(email.split('@')[0].toLowerCase().split(/[.+_-]/)[0]);
}

export interface ExtractedEmails {
  plain: string[];
  cloudflare: string[];
}

/** Same sources as the Python extractor: mailto links, visible text, common attributes, Cloudflare markup. */
export function extractEmails(html: string): ExtractedEmails {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const plain: string[] = [];
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    if (/^mailto:/i.test(href)) {
      const target = safeDecode(href.slice(7).split('?')[0]);
      plain.push(...target.split(',').map((e) => e.trim()));
    }
  });
  plain.push(...(doc.body?.textContent ?? '').match(EMAIL_RE) ?? []);
  doc.querySelectorAll('[href],[content],[data-email],[value]').forEach((el) => {
    for (const attr of ['href', 'content', 'data-email', 'value']) {
      const v = el.getAttribute(attr);
      if (v?.includes('@')) plain.push(...(safeDecode(v).match(EMAIL_RE) ?? []));
    }
  });
  const cloudflare: string[] = [];
  const tryDecode = (s: string) => {
    try {
      cloudflare.push(decodeCfEmail(s));
    } catch {
      /* not encoded */
    }
  };
  doc.querySelectorAll('[data-cfemail]').forEach((el) => tryDecode(el.getAttribute('data-cfemail') ?? ''));
  doc.querySelectorAll('a[href*="/cdn-cgi/l/email-protection#"]').forEach((a) =>
    tryDecode((a.getAttribute('href') ?? '').split('#')[1] ?? ''),
  );
  const clean = (xs: string[]) => [...new Set(xs.filter(isPlausibleEmail).map((e) => e.toLowerCase()))];
  const cf = clean(cloudflare);
  return { plain: clean(plain).filter((e) => !cf.includes(e)), cloudflare: cf };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
