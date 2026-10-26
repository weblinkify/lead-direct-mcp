import { isGeneric } from '../domain/contacts';
import { SEED_LEADS, type Lead } from '../domain/seed';

export interface LeadQuery {
  query: string;
  target: number;
  exclude: string[];
}

export interface LeadService {
  find(q: LeadQuery): Promise<Lead[]>;
}

const COUNTRY_WORDS: Record<string, string> = {
  france: 'France', finland: 'Finland', suomi: 'Finland', türkiye: 'Türkiye', turkiye: 'Türkiye', turkey: 'Türkiye',
  germany: 'Germany', deutschland: 'Germany', uk: 'United Kingdom', england: 'United Kingdom', kenya: 'Kenya',
};

export function scoreLead(lead: Lead, query: string): number {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const country = words.map((w) => COUNTRY_WORDS[w]).find(Boolean);
  if (country && lead.country !== country) return 0;
  const hay = [...lead.tags, lead.company.toLowerCase()];
  return words.filter((w) => !COUNTRY_WORDS[w] && hay.some((t) => t.includes(w) || w.includes(t))).length;
}

/** Named people first, then on-domain inboxes (same ordering as the Python crawler). */
export function rankEmails(emails: string[]): string[] {
  return [...emails].sort((a, b) => Number(isGeneric(a)) - Number(isGeneric(b)));
}

export function normalizeDomain(d: string): string {
  return d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
}

export class MockLeadService implements LeadService {
  constructor(private readonly leads: Lead[] = SEED_LEADS, private readonly latencyMs = 600) {}

  async find(q: LeadQuery): Promise<Lead[]> {
    if (this.latencyMs) await new Promise((r) => setTimeout(r, this.latencyMs));
    const exclude = new Set(q.exclude.map(normalizeDomain).filter(Boolean));
    return this.leads
      .filter((l) => !exclude.has(l.domain))
      .map((l) => ({ lead: l, score: scoreLead(l, q.query) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, q.target))
      .map(({ lead }) => ({ ...lead, emails: rankEmails(lead.emails) }));
  }
}

export function leadsToCsv(leads: Lead[]): string {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = ['company', 'domain', 'country', 'email', 'other_emails', 'phone', 'linkedin', 'facebook', 'instagram', 'whatsapp'];
  const rows = leads.map((l) =>
    [l.company, l.domain, l.country, l.emails[0] ?? '', l.emails.slice(1).join('; '), l.phones[0] ?? '',
      l.socials.linkedin ?? '', l.socials.facebook ?? '', l.socials.instagram ?? '', l.socials.whatsapp ?? '']
      .map(cell).join(','));
  return [header.join(','), ...rows].join('\n') + '\n';
}
