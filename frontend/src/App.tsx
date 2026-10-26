import { Download, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Extractor } from './components/Extractor';
import { Header } from './components/Header';
import { LeadTable } from './components/LeadTable';
import { isGeneric } from './domain/contacts';
import { EXAMPLE_QUERIES, type Lead } from './domain/seed';
import { downloadText } from './download';
import { MockLeadService, leadsToCsv, type LeadQuery } from './services/LeadService';

export default function App() {
  const service = useMemo(() => new MockLeadService(), []);
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0]);
  const [target, setTarget] = useState(10);
  const [exclude, setExclude] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState('');
  const runId = useRef(0);

  const run = async (q: LeadQuery) => {
    const id = ++runId.current;
    setBusy(true);
    try {
      const found = await service.find(q);
      if (id !== runId.current) return;
      setLeads(found);
      setSearched(q.query);
    } finally {
      if (id === runId.current) setBusy(false);
    }
  };

  useEffect(() => {
    void run({ query: EXAMPLE_QUERIES[0], target: 10, exclude: [] });
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run({ query, target, exclude: exclude.split(/[\s,]+/) });
  };

  const named = leads.reduce((n, l) => n + l.emails.filter((e) => !isGeneric(e)).length, 0);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <form onSubmit={submit} className="card grid gap-3 p-4 md:grid-cols-[1fr_120px_1fr_auto] md:items-end">
          <div>
            <label className="label" htmlFor="q">What and where</label>
            <input id="q" className="input" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="n">Leads</label>
            <input id="n" type="number" min={1} max={30} className="input" value={target}
              onChange={(e) => setTarget(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
          </div>
          <div>
            <label className="label" htmlFor="ex">Skip domains</label>
            <input id="ex" className="input" placeholder="bigbrand.example, portal.example" value={exclude} onChange={(e) => setExclude(e.target.value)} />
          </div>
          <button className="btn-primary" disabled={busy || !query.trim()}><Search size={16} /> {busy ? 'Searching…' : 'Find leads'}</button>
          <div className="flex flex-wrap gap-1.5 md:col-span-4">
            <span className="text-xs text-slate-500">Try:</span>
            {EXAMPLE_QUERIES.map((q) => (
              <button key={q} type="button" className="chip bg-brand-soft text-brand-dark hover:bg-teal-100"
                onClick={() => { setQuery(q); void run({ query: q, target, exclude: exclude.split(/[\s,]+/) }); }}>
                {q}
              </button>
            ))}
          </div>
        </form>

        <section className="card p-4" aria-labelledby="res-h">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 id="res-h" className="font-semibold" aria-live="polite">
              {busy ? 'Searching and crawling contact pages…' : `${leads.length} companies · ${named} named contacts${searched ? ` for “${searched}”` : ''}`}
            </h2>
            <button type="button" className="btn-ghost" disabled={!leads.length}
              onClick={() => downloadText('leads.csv', leadsToCsv(leads), 'text/csv')}>
              <Download size={15} /> leads.csv
            </button>
          </div>
          {leads.length ? <LeadTable leads={leads} /> : !busy && (
            <p className="py-6 text-center text-sm text-slate-500">No companies in the demo data match. Pick one of the example searches above.</p>
          )}
        </section>

        <Extractor />

        <p className="text-center text-xs text-slate-400">
          Demo data is fictional. The MCP server searches the web and reads each company's own homepage, contact, about and imprint pages.
        </p>
      </main>
    </div>
  );
}
