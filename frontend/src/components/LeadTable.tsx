import { Facebook, Instagram, Linkedin, MessageCircle, ShieldCheck, Twitter } from 'lucide-react';
import { isGeneric } from '../domain/contacts';
import type { Lead } from '../domain/seed';

const ICONS = { linkedin: Linkedin, facebook: Facebook, instagram: Instagram, whatsapp: MessageCircle, x: Twitter } as const;

export function LeadTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr><th className="py-2">Company</th><th>Emails</th><th>Phone</th><th>Social</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100 align-top">
          {leads.map((l) => (
            <tr key={l.domain}>
              <td className="py-3 pr-3">
                <p className="font-semibold">{l.company}</p>
                <p className="text-xs text-slate-500">{l.domain} · {l.country}</p>
              </td>
              <td className="py-3 pr-3">
                <ul className="space-y-1">
                  {l.emails.map((e) => (
                    <li key={e} className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[13px]">{e}</span>
                      <span className={`chip ${isGeneric(e) ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                        {isGeneric(e) ? 'shared inbox' : 'named contact'}
                      </span>
                      {l.cloudflareDecoded.includes(e) && (
                        <span className="chip bg-sky-100 text-sky-800" title="Hidden by Cloudflare email protection; decoded">
                          <ShieldCheck size={12} className="mr-0.5" /> decoded
                        </span>
                      )}
                    </li>
                  ))}
                  {l.emails.length === 0 && <li className="text-slate-400">contact form only</li>}
                </ul>
              </td>
              <td className="whitespace-nowrap py-3 pr-3 tabular-nums">{l.phones[0] ?? <span className="text-slate-400">—</span>}</td>
              <td className="py-3">
                <div className="flex gap-1.5">
                  {(Object.keys(ICONS) as (keyof typeof ICONS)[]).map((k) => {
                    const href = l.socials[k];
                    if (!href) return null;
                    const Icon = ICONS[k];
                    return (
                      <a key={k} href={href} target="_blank" rel="noreferrer" aria-label={`${l.company} on ${k}`}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50">
                        <Icon size={14} />
                      </a>
                    );
                  })}
                  {Object.keys(l.socials).length === 0 && <span className="text-slate-400">—</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
