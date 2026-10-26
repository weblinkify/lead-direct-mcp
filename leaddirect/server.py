"""LeadDirect MCP server. Run with ``python -m leaddirect`` or ``leaddirect``."""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any, Optional

from fastmcp import FastMCP

from . import discover
from .extract import decode_cf_email
from .store import LeadStore

mcp = FastMCP(
    "LeadDirect",
    instructions=(
        "B2B lead discovery. find_leads searches the web for companies and collects the contact details "
        "they publish on their own websites (emails incl. Cloudflare-protected ones, phones, LinkedIn, "
        "Facebook, Instagram, WhatsApp) and saves them to leads.csv. Use local-language keywords for foreign "
        "markets and pass big brands / portals in exclude_domains."
    ),
)


def output_dir() -> Path:
    env = os.environ.get("LEADDIRECT_OUTPUT_DIR")
    if env:
        return Path(env).expanduser()
    desktop = Path.home() / "Desktop"
    return desktop if desktop.is_dir() else Path.home() / "LeadDirect"


def store() -> LeadStore:
    return LeadStore(output_dir() / "leads.csv")


def _json(data: Any) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False)


async def find_leads(query: str, target_leads: int = 10, exclude_domains: Optional[list[str]] = None,
                     region: Optional[str] = None, save: bool = True) -> str:
    """Find companies for a query and collect their published contact details.

    Args:
        query: e.g. "lowbed semi-trailer dealer France" or "semi-remorque surbaissée concessionnaire".
        target_leads: How many new companies to return (1-30).
        exclude_domains: Domains to skip, e.g. big brands or marketplaces.
        region: ISO country code (e.g. "FR") so national phone numbers parse.
        save: Append new leads to leads.csv (domains already in the file are skipped).
    """
    target = max(1, min(int(target_leads), 30))
    try:
        found = await asyncio.to_thread(discover.search_companies, query, target * 4, exclude_domains or [])
    except Exception as exc:  # the search backend has its own exception types
        return _json({"error": f"Search failed: {exc}"})
    known = store().domains() if save else set()
    candidates = [c for c in found if c["domain"] not in known][: target * 2]
    crawled = await discover.crawl_many([c["domain"] for c in candidates], region)
    leads = []
    for company, data in zip(candidates, crawled):
        if data.get("status") != "ok":
            continue
        leads.append({"company": company["company"], **data})
        if len(leads) >= target:
            break
    saved = store().add(leads, query) if save else []
    return _json({"query": query, "count": len(leads), "saved_to_csv": len(saved),
                  "csv": str(store().path) if save else None, "leads": leads,
                  "skipped_known_domains": len([c for c in found if c["domain"] in known])})


async def scrape_company(url_or_domain: str, region: Optional[str] = None) -> str:
    """Crawl one company website (homepage + contact/about/imprint pages) for published contacts."""
    async with discover.http_client() as client:
        return _json(await discover.crawl_company(client, url_or_domain, region))


def decode_cloudflare_email(encoded: str) -> str:
    """Decode a Cloudflare email-protection string (the data-cfemail value or the part after '#')."""
    try:
        return _json({"email": decode_cf_email(encoded.strip().split("#")[-1])})
    except ValueError as exc:
        return _json({"error": str(exc)})


def list_leads(limit: int = 50) -> str:
    """Show the most recent rows of leads.csv."""
    rows = store().rows()
    return _json({"csv": str(store().path), "total": len(rows), "rows": rows[-max(1, limit):]})


for _fn in (find_leads, scrape_company, decode_cloudflare_email, list_leads):
    mcp.tool(_fn)


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
