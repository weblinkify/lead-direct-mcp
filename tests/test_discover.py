import httpx
import respx

from leaddirect import discover
from leaddirect.extract import encode_cf_email
from leaddirect.store import LeadStore

HOME = """<html><body><nav><a href="/en/contact-us">Contact</a><a href="https://other.com/contact">x</a>
<a href="/products">Products</a></nav><p>info@acme-trailers.fr</p>
<a href="https://www.linkedin.com/company/acme-trailers">in</a></body></html>"""
CONTACT = f"""<p>Sales: Marie Laurent, marie.laurent@acme-trailers.fr, +33 1 42 68 53 00</p>
<span data-cfemail="{encode_cf_email('export@acme-trailers.fr')}"></span>"""


def test_is_ignored():
    assert discover.is_ignored("fr.linkedin.com")
    assert discover.is_ignored("amazon.de") and discover.is_ignored("www.amazon.co.uk")
    assert discover.is_ignored("schmitz-cargobull.com", ["schmitz-cargobull.com"])
    assert not discover.is_ignored("acme-trailers.fr")
    assert not discover.is_ignored("notlinkedin.com")


def test_internal_contact_links():
    links = discover.internal_contact_links(HOME, "https://acme-trailers.fr/", "acme-trailers.fr")
    assert links == ["https://acme-trailers.fr/en/contact-us"]


@respx.mock
async def test_crawl_company_collects_and_ranks():
    respx.get(url__regex=r"^https://acme-trailers\.fr/?$").mock(return_value=httpx.Response(200, text=HOME, headers={"content-type": "text/html"}))
    respx.get("https://acme-trailers.fr/en/contact-us").mock(return_value=httpx.Response(200, text=CONTACT, headers={"content-type": "text/html"}))
    respx.route(host="acme-trailers.fr").mock(return_value=httpx.Response(404))
    async with discover.http_client() as client:
        lead = await discover.crawl_company(client, "www.acme-trailers.fr")
    assert lead["status"] == "ok"
    assert lead["emails"] == ["marie.laurent@acme-trailers.fr", "export@acme-trailers.fr", "info@acme-trailers.fr"]
    assert lead["named_emails"] == ["marie.laurent@acme-trailers.fr"]
    assert lead["cloudflare_decoded"] == ["export@acme-trailers.fr"]
    assert lead["phones"] == ["+33 1 42 68 53 00"]
    assert lead["socials"]["linkedin"].endswith("/acme-trailers")


@respx.mock
async def test_crawl_unreachable():
    respx.route(host="down.example.net").mock(side_effect=httpx.ConnectError("boom"))
    async with discover.http_client() as client:
        lead = await discover.crawl_company(client, "down.example.net")
    assert lead["status"] == "unreachable"


def test_store_dedupes(tmp_path):
    s = LeadStore(tmp_path / "leads.csv")
    lead = {"company": "Acme", "domain": "acme.fr", "emails": ["a@acme.fr", "b@acme.fr"], "phones": ["+33 1"],
            "socials": {"linkedin": "li"}}
    assert len(s.add([lead, lead], "q")) == 1
    assert s.add([lead]) == []
    row = s.rows()[0]
    assert row["email"] == "a@acme.fr" and row["other_emails"] == "b@acme.fr" and row["linkedin"] == "li"
