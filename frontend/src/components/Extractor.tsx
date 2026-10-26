import { useMemo, useState } from 'react';
import { decodeCfEmail, encodeCfEmail, extractEmails, isGeneric } from '../domain/contacts';

const SAMPLE = `<footer>
  <a href="mailto:Jean.Dupont@acme-trailers.example?subject=Devis">Écrire</a>
  <p>Accueil : info@acme-trailers.example</p>
  <img src="/img/logo@2x.png">
  <span class="__cf_email__" data-cfemail="${encodeCfEmail('export@acme-trailers.example', 0x3c)}">[email&#160;protected]</span>
</footer>`;

export function Extractor() {
  const [html, setHtml] = useState(SAMPLE);
  const [cf, setCf] = useState(encodeCfEmail('sales@nordicbean.example', 0x21));
  const result = useMemo(() => extractEmails(html), [html]);
  let decoded: string;
  try {
    decoded = decodeCfEmail(cf.trim().split('#').pop() ?? '');
  } catch (e) {
    decoded = (e as Error).message;
  }
  const all = [...result.cloudflare, ...result.plain];
  return (
    <section className="card p-4" aria-labelledby="extract-h">
      <h2 id="extract-h" className="font-semibold">Try the extractor <span className="text-sm font-normal text-slate-500">(runs for real in your browser)</span></h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <label className="label" htmlFor="html-in">Paste page HTML</label>
          <textarea id="html-in" className="input min-h-[170px] font-mono text-[12px]" value={html} onChange={(e) => setHtml(e.target.value)} />
        </div>
        <div>
          <p className="label">Emails found ({all.length})</p>
          <ul className="space-y-1 text-sm">
            {all.map((e) => (
              <li key={e} className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono">{e}</span>
                {result.cloudflare.includes(e) && <span className="chip bg-sky-100 text-sky-800">Cloudflare-decoded</span>}
                <span className={`chip ${isGeneric(e) ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                  {isGeneric(e) ? 'shared inbox' : 'named contact'}
                </span>
              </li>
            ))}
            {all.length === 0 && <li className="text-slate-400">None. Asset names like logo@2x.png and placeholders are ignored.</li>}
          </ul>
          <label className="label mt-4" htmlFor="cf-in">Decode one Cloudflare string</label>
          <input id="cf-in" className="input font-mono text-[12px]" value={cf} onChange={(e) => setCf(e.target.value)} />
          <p className="mt-1 font-mono text-sm" aria-live="polite">→ {decoded}</p>
        </div>
      </div>
    </section>
  );
}
