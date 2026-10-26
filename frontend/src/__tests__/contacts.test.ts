// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { decodeCfEmail, encodeCfEmail, extractEmails, isGeneric, isPlausibleEmail } from '../domain/contacts';

describe('contacts (mirrors tests/test_extract.py)', () => {
  it('round-trips Cloudflare encoding and rejects junk', () => {
    expect(decodeCfEmail(encodeCfEmail('sales@acme.fi', 0x3c))).toBe('sales@acme.fi');
    for (const bad of ['', '1', 'zz00', '123']) expect(() => decodeCfEmail(bad)).toThrow();
  });

  it('filters implausible addresses', () => {
    expect(isPlausibleEmail('anna.virtanen@acme.fi')).toBe(true);
    expect(isPlausibleEmail('logo@2x.png')).toBe(false);
    expect(isPlausibleEmail('you@example.com')).toBe(false);
    expect(isPlausibleEmail('fornavn.etternavn@vak.fi')).toBe(false);
    expect(isPlausibleEmail('a..b@acme.fi')).toBe(false);
  });

  it('detects shared inboxes', () => {
    expect(isGeneric('sales.eu@acme.fi')).toBe(true);
    expect(isGeneric('ventes@acme.fr') && isGeneric('myynti@acme.fi') && isGeneric('atelier@acme.fr')).toBe(true);
    expect(isGeneric('anna.virtanen@acme.fi')).toBe(false);
  });

  it('extracts from all sources like the Python extractor', () => {
    const html = `
      <a href="mailto:Jean.Dupont@trailers.fr?subject=Hi">Mail</a>
      <p>Write to info@trailers.fr or ventes@trailers.fr.</p>
      <img src="/img/logo@2x.png">
      <span data-cfemail="${encodeCfEmail('export@trailers.fr')}">[email protected]</span>
      <a href="/cdn-cgi/l/email-protection#${encodeCfEmail('pierre@trailers.fr', 0x22)}">x</a>
      <a href="/cdn-cgi/l/email-protection#nothex">bad</a>
      <meta content="contact: press@trailers.fr">`;
    const out = extractEmails(html);
    expect(out.cloudflare).toEqual(['export@trailers.fr', 'pierre@trailers.fr']);
    expect(new Set(out.plain)).toEqual(new Set(['jean.dupont@trailers.fr', 'info@trailers.fr', 'ventes@trailers.fr', 'press@trailers.fr']));
  });
});
