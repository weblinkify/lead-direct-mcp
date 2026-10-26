"""Company discovery and website crawling. Collects only contact details a company publishes
on its own site (contact, about, imprint pages)."""

from __future__ import annotations

import asyncio
from typing import Any, Iterable, Optional
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from .extract import extract_emails, extract_phones, extract_socials, guess_region, is_generic, registrable_domain

USER_AGENT = "Mozilla/5.0 (compatible; LeadDirect/1.0; +https://github.com/weblinkify/lead-direct-mcp)"
CONTACT_PATHS = ("", "/contact", "/contact-us", "/about", "/about-us", "/impressum", "/imprint", "/iletisim",
                 "/kontakt", "/contacto")
MAX_PAGES = 6

# Directories, marketplaces, social networks and media: not company sites.
IGNORED_DOMAINS = (
    "linkedin.com", "facebook.com", "instagram.com", "twitter.com", "x.com", "youtube.com", "tiktok.com",
    "pinterest.com", "wikipedia.org", "reddit.com", "quora.com", "medium.com", "amazon.", "ebay.",
    "alibaba.com", "aliexpress.com", "yelp.", "yellowpages", "europages.", "kompass.com", "crunchbase.com",
    "zoominfo.com", "bloomberg.com", "glassdoor.", "indeed.", "trustpilot.com", "google.", "bing.com",
    "duckduckgo.com", "apple.com", "github.com",
)


def is_ignored(domain: str, extra: Iterable[str] = ()) -> bool:
    d = domain.lower()
    for item in (*IGNORED_DOMAINS, *(e.lower().strip() for e in extra if e.strip())):
        if item.endswith("."):
            if d.startswith(item) or f".{item}" in d:
                return True
        elif d == item or d.endswith("." + item):
            return True
    return False


def search_companies(query: str, max_results: int = 30, exclude: Iterable[str] = ()) -> list[dict[str, str]]:
    """Web search, one result per company domain, skipping directories and excluded domains."""
    from ddgs import DDGS  # slow import; only needed here

    exclude = list(exclude)
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for item in DDGS().text(query, max_results=max_results) or []:
        domain = registrable_domain(item.get("href") or "")
        if not domain or domain in seen or is_ignored(domain, exclude):
            continue
        seen.add(domain)
        out.append({"company": (item.get("title") or domain).split(" | ")[0].split(" - ")[0].strip(),
                    "domain": domain, "url": item.get("href") or f"https://{domain}",
                    "snippet": item.get("body") or ""})
    return out


def internal_contact_links(html: str, base_url: str, domain: str) -> list[str]:
    """Contact-ish links on the same site, found from the homepage navigation."""
    soup = BeautifulSoup(html, "html.parser")
    keywords = ("contact", "about", "impressum", "imprint", "iletisim", "kontakt", "team")
    links = []
    for a in soup.select("a[href]"):
        href = urljoin(base_url, a["href"])
        if registrable_domain(href) != domain:
            continue
        text = f"{a.get_text(' ').lower()} {href.lower()}"
        if any(k in text for k in keywords):
            links.append(href.split("#")[0])
    return list(dict.fromkeys(links))


async def crawl_company(client: httpx.AsyncClient, url_or_domain: str, region: Optional[str] = None) -> dict[str, Any]:
    domain = registrable_domain(url_or_domain)
    if not domain:
        return {"domain": url_or_domain, "status": "invalid_domain"}
    base = f"https://{domain}"
    region = region or guess_region(domain)
    pages: list[str] = []
    emails: list[str] = []
    cf_emails: list[str] = []
    phones: list[str] = []
    socials: dict[str, str] = {}
    queue = [base + p for p in CONTACT_PATHS]
    visited: set[str] = set()
    status = "ok"

    while queue and len(pages) < MAX_PAGES:
        url = queue.pop(0)
        if url.rstrip("/") in visited:
            continue
        visited.add(url.rstrip("/"))
        try:
            resp = await client.get(url)
        except httpx.HTTPError:
            if not pages and url == base:
                status = "unreachable"
                break
            continue
        if resp.status_code != 200 or "html" not in resp.headers.get("content-type", "html"):
            continue
        html = resp.text
        pages.append(str(resp.url))
        if url == base:
            queue = internal_contact_links(html, str(resp.url), domain) + queue
        found = extract_emails(html)
        emails += found["plain"]
        cf_emails += found["cloudflare"]
        phones += extract_phones(BeautifulSoup(html, "html.parser").get_text(" "), region)
        for k, v in extract_socials(html).items():
            socials.setdefault(k, v)

    all_emails = list(dict.fromkeys(cf_emails + emails))
    on_domain = [e for e in all_emails if e.split("@", 1)[1].endswith(domain)]
    ranked = sorted(all_emails, key=lambda e: (e not in on_domain, is_generic(e)))
    return {
        "domain": domain,
        "status": status if pages or status != "ok" else "no_pages",
        "pages_checked": pages,
        "emails": ranked,
        "named_emails": [e for e in ranked if not is_generic(e)],
        "cloudflare_decoded": list(dict.fromkeys(cf_emails)),
        "phones": list(dict.fromkeys(phones))[:5],
        "socials": socials,
    }


async def crawl_many(domains: list[str], region: Optional[str] = None, concurrency: int = 4) -> list[dict[str, Any]]:
    sem = asyncio.Semaphore(concurrency)
    async with http_client() as client:
        async def one(d: str) -> dict[str, Any]:
            async with sem:
                return await crawl_company(client, d, region)
        return await asyncio.gather(*(one(d) for d in domains))


def http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers={"User-Agent": USER_AGENT})
