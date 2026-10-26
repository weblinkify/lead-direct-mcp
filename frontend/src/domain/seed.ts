/** Fictional companies for the web demo (.example domains never resolve). */

export interface Lead {
  company: string;
  domain: string;
  country: string;
  region: string;
  tags: string[];
  emails: string[];
  cloudflareDecoded: string[];
  phones: string[];
  socials: Partial<Record<'linkedin' | 'facebook' | 'instagram' | 'whatsapp' | 'x', string>>;
  pagesChecked: number;
}

const L = (l: Omit<Lead, 'pagesChecked'> & { pagesChecked?: number }): Lead => ({ pagesChecked: 4, ...l });

export const SEED_LEADS: Lead[] = [
  L({ company: 'Laurent Remorques', domain: 'laurent-remorques.example', country: 'France', region: 'FR',
    tags: ['trailer', 'semi-remorque', 'lowbed', 'surbaissée', 'dealer', 'concessionnaire', 'transport'],
    emails: ['marie.laurent@laurent-remorques.example', 'ventes@laurent-remorques.example'],
    cloudflareDecoded: ['marie.laurent@laurent-remorques.example'], phones: ['+33 4 72 18 40 00'],
    socials: { linkedin: 'https://www.linkedin.com/company/laurent-remorques', facebook: 'https://facebook.com/laurentremorques' } }),
  L({ company: 'Bretagne Plateaux', domain: 'bretagne-plateaux.example', country: 'France', region: 'FR',
    tags: ['trailer', 'semi-remorque', 'porte-engins', 'lowbed', 'dealer', 'concessionnaire'],
    emails: ['contact@bretagne-plateaux.example'], cloudflareDecoded: [], phones: ['+33 2 98 44 12 30'],
    socials: { whatsapp: 'https://wa.me/33612345678' } }),
  L({ company: 'Rhône Poids Lourds', domain: 'rhone-pl.example', country: 'France', region: 'FR',
    tags: ['truck', 'trailer', 'semi-remorque', 'service', 'dealer'],
    emails: ['julien.morel@rhone-pl.example', 'atelier@rhone-pl.example', 'info@rhone-pl.example'],
    cloudflareDecoded: [], phones: ['+33 4 78 90 11 22'], socials: { linkedin: 'https://www.linkedin.com/company/rhone-pl' } }),
  L({ company: 'Kahvila Paahtimo Koivu', domain: 'koivu-paahtimo.example', country: 'Finland', region: 'FI',
    tags: ['coffee', 'roaster', 'kahvi', 'paahtimo', 'wholesale', 'horeca'],
    emails: ['anna.koivisto@koivu-paahtimo.example', 'myynti@koivu-paahtimo.example'], cloudflareDecoded: [],
    phones: ['+358 40 123 4567'], socials: { instagram: 'https://instagram.com/koivupaahtimo' } }),
  L({ company: 'Nordic Bean Works', domain: 'nordicbean.example', country: 'Finland', region: 'FI',
    tags: ['coffee', 'roaster', 'wholesale', 'specialty', 'kahvi'],
    emails: ['hello@nordicbean.example'], cloudflareDecoded: ['hello@nordicbean.example'], phones: ['+358 9 4242 4242'],
    socials: { instagram: 'https://instagram.com/nordicbean', linkedin: 'https://www.linkedin.com/company/nordicbean' } }),
  L({ company: 'Ege Ambalaj', domain: 'ege-ambalaj.example', country: 'Türkiye', region: 'TR',
    tags: ['packaging', 'ambalaj', 'carton', 'karton', 'manufacturer', 'üretici', 'export'],
    emails: ['mehmet.yilmaz@ege-ambalaj.example', 'satis@ege-ambalaj.example', 'export@ege-ambalaj.example'],
    cloudflareDecoded: [], phones: ['+90 232 555 12 34'],
    socials: { whatsapp: 'https://wa.me/905321234567', linkedin: 'https://www.linkedin.com/company/ege-ambalaj' } }),
  L({ company: 'Marmara Kutu', domain: 'marmarakutu.example', country: 'Türkiye', region: 'TR',
    tags: ['packaging', 'ambalaj', 'box', 'kutu', 'manufacturer', 'üretici'],
    emails: ['bilgi@marmarakutu.example'], cloudflareDecoded: [], phones: ['+90 216 444 56 78'], socials: {} }),
  L({ company: 'Agro Implements GmbH', domain: 'agro-implements.example', country: 'Germany', region: 'DE',
    tags: ['agricultural', 'tractor', 'implements', 'landtechnik', 'dealer', 'händler', 'machinery'],
    emails: ['k.fischer@agro-implements.example', 'vertrieb@agro-implements.example'], cloudflareDecoded: ['k.fischer@agro-implements.example'],
    phones: ['+49 511 123 4560'], socials: { linkedin: 'https://www.linkedin.com/company/agro-implements', facebook: 'https://facebook.com/agroimplements' } }),
  L({ company: 'Weser Landtechnik', domain: 'weser-landtechnik.example', country: 'Germany', region: 'DE',
    tags: ['agricultural', 'tractor', 'landtechnik', 'händler', 'dealer', 'service'],
    emails: ['info@weser-landtechnik.example'], cloudflareDecoded: [], phones: ['+49 421 987 6540'], socials: {} }),
  L({ company: 'Pennine Office Supplies', domain: 'pennine-office.example', country: 'United Kingdom', region: 'GB',
    tags: ['office', 'supplies', 'stationery', 'wholesale', 'distributor'],
    emails: ['sarah.hughes@pennine-office.example', 'orders@pennine-office.example'], cloudflareDecoded: [],
    phones: ['+44 113 496 0123'], socials: { linkedin: 'https://www.linkedin.com/company/pennine-office', x: 'https://x.com/pennineoffice' } }),
  L({ company: 'Kariba Solar Distribution', domain: 'kariba-solar.example', country: 'Kenya', region: 'KE',
    tags: ['solar', 'panels', 'inverter', 'distributor', 'wholesale', 'energy'],
    emails: ['sales@kariba-solar.example'], cloudflareDecoded: [], phones: ['+254 20 765 4321'],
    socials: { whatsapp: 'https://wa.me/254712345678', facebook: 'https://facebook.com/karibasolar' } }),
  L({ company: 'Hanse Solar Großhandel', domain: 'hanse-solar.example', country: 'Germany', region: 'DE',
    tags: ['solar', 'panels', 'großhandel', 'distributor', 'wholesale', 'energy', 'pv'],
    emails: ['t.becker@hanse-solar.example', 'info@hanse-solar.example'], cloudflareDecoded: [], phones: ['+49 40 555 0199'],
    socials: { linkedin: 'https://www.linkedin.com/company/hanse-solar' } }),
];

export const EXAMPLE_QUERIES = [
  'semi-remorque surbaissée concessionnaire France',
  'coffee roaster wholesale Finland',
  'ambalaj karton üretici Türkiye',
  'landtechnik händler Germany',
  'solar panel distributor',
];
