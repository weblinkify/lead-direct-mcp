# LeadDirect MCP

**Live demo:** https://lead-direct-mcp.vercel.app (mock mode, runs fully in the browser) · deploys automatically on every push to `main`

An MCP server for B2B prospecting from Claude Desktop, Cursor or any MCP client. Describe the companies
you want ("lowbed semi-trailer dealers in France, skip the big brands") and LeadDirect searches the web,
reads each company's own homepage, contact, about and imprint pages, and returns the contact details the
company publishes: emails (including ones hidden by Cloudflare email protection), phone numbers, and
LinkedIn / Facebook / Instagram / WhatsApp / X links. New leads go into a CSV, de-duplicated by domain.

| | |
|---|---|
| **MCP server** | Python 3.10+ · FastMCP · httpx · BeautifulSoup · phonenumbers · ddgs |
| **Web demo** | React 18 · TypeScript · Tailwind CSS · Vite, deployed on Vercel |

LeadDirect only collects what a company publishes on its own website. It does not guess personal
addresses or probe mail servers.

---

## Tools

| Tool | What it does |
|---|---|
| `find_leads` | Web search → one result per company domain (directories, marketplaces and social networks skipped, plus your `exclude_domains`) → crawl up to 6 pages per site → save new leads to `leads.csv`. |
| `scrape_company` | The same crawl for one URL or domain. |
| `decode_cloudflare_email` | Decodes a `data-cfemail` value or `/cdn-cgi/l/email-protection#…` link. |
| `list_leads` | Shows the latest rows of `leads.csv`. |

Each lead lists emails with named contacts first and shared inboxes (`info@`, `sales@`, `satis@`,
`kontakt@`, …) after. Asset names (`logo@2x.png`), placeholders (`you@example.com`,
`firstname.lastname@`) and no-reply addresses are filtered out. Phone numbers are parsed with Google's
libphonenumber and printed in international format; pass `region` (e.g. `FR`) so national numbers parse.

---

## Install

```bash
git clone https://github.com/weblinkify/lead-direct-mcp
cd lead-direct-mcp
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -e .
```

MCP client config (`claude_desktop_config.json`, Cursor `mcp.json`, …):

```json
{
  "mcpServers": {
    "leaddirect": {
      "command": "/ABSOLUTE/PATH/lead-direct-mcp/.venv/bin/leaddirect",
      "env": { "LEADDIRECT_OUTPUT_DIR": "~/Desktop" }
    }
  }
}
```

`leads.csv` is written to `LEADDIRECT_OUTPUT_DIR`, else your Desktop, else `~/LeadDirect`.

### Prompting tips

1. **Target and geography:** the niche plus the country or region.
2. **Local-language keywords:** `semi-remorque surbaissée concessionnaire` for France,
   `ambalaj karton üretici` for Türkiye, `Landtechnik Händler` for Germany.
3. **Exclusions:** pass large brands and portals in `exclude_domains`.
4. **Qualification:** ask the assistant to keep only companies that sell the product directly.

```text
Find 10 dealers of lowbed semi-trailers in France. Search in French
("semi-remorque surbaissée concessionnaire"), region FR, and skip
schmitz-cargobull.com and krone-trailer.com. Put the results in a table with
named contacts first and their LinkedIn pages.
```

---

## Web demo

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The companies are fictional (`.example` domains), but the HTML extractor and the Cloudflare decoder in
the demo are TypeScript ports of the server code and run for real. Paste any page's HTML to try them.

**Vercel:** import the repo and set **Root Directory** to `frontend`; `frontend/vercel.json` does the rest.

## Development

```bash
pip install -r requirements-dev.txt
pytest -q
cd frontend && npm test && npm run build
```

## Responsible use

Respect each website's terms and robots rules, and the email marketing law where you operate (GDPR /
ePrivacy in the EU, CAN-SPAM in the US, KVKK in Türkiye). Published business contact details are not a
licence to send bulk unsolicited email.

## License

MIT
