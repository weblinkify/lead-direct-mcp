import { describe, expect, it } from 'vitest';
import { EXAMPLE_QUERIES, SEED_LEADS } from '../domain/seed';
import { MockLeadService, leadsToCsv, normalizeDomain, rankEmails, scoreLead } from '../services/LeadService';

const svc = new MockLeadService(SEED_LEADS, 0);

describe('MockLeadService', () => {
  it('every example query returns leads from the right country', async () => {
    for (const q of EXAMPLE_QUERIES) {
      const res = await svc.find({ query: q, target: 10, exclude: [] });
      expect(res.length, q).toBeGreaterThan(0);
    }
    const fr = await svc.find({ query: 'semi-remorque surbaissée concessionnaire France', target: 10, exclude: [] });
    expect(fr.every((l) => l.country === 'France')).toBe(true);
  });

  it('respects target and exclusions (with URLs or www)', async () => {
    const res = await svc.find({ query: 'semi-remorque France', target: 10, exclude: ['https://www.laurent-remorques.example/contact', ''] });
    expect(res.map((l) => l.domain)).not.toContain('laurent-remorques.example');
    expect((await svc.find({ query: 'semi-remorque France', target: 1, exclude: [] }))).toHaveLength(1);
  });

  it('returns nothing for unrelated queries', async () => {
    expect(await svc.find({ query: 'quantum yachts', target: 5, exclude: [] })).toEqual([]);
    expect(scoreLead(SEED_LEADS[0], 'coffee Finland')).toBe(0);
  });
});

describe('helpers', () => {
  it('ranks named contacts first, stable otherwise', () => {
    expect(rankEmails(['info@a.fi', 'anna@a.fi', 'sales@a.fi', 'bo@a.fi'])).toEqual(['anna@a.fi', 'bo@a.fi', 'info@a.fi', 'sales@a.fi']);
  });
  it('normalizes domains', () => {
    expect(normalizeDomain(' HTTPS://www.Acme.fi/x ')).toBe('acme.fi');
  });
  it('writes escaped CSV', () => {
    const csv = leadsToCsv([{ ...SEED_LEADS[0], company: 'Laurent, "LR"' }]);
    expect(csv.split('\n')[1].startsWith('"Laurent, ""LR""",laurent-remorques.example,France,')).toBe(true);
  });
});
