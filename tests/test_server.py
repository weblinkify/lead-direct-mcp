import json

from fastmcp import Client

from leaddirect import discover, server
from leaddirect.extract import encode_cf_email


async def test_tools_registered():
    async with Client(server.mcp) as c:
        assert {t.name for t in await c.list_tools()} == {"find_leads", "scrape_company", "decode_cloudflare_email",
                                                           "list_leads"}


async def test_decode_tool():
    out = json.loads(server.decode_cloudflare_email("/cdn-cgi/l/email-protection#" + encode_cf_email("x@y.fi")))
    assert out == {"email": "x@y.fi"}
    assert "error" in json.loads(server.decode_cloudflare_email("zz"))


async def test_find_leads_pipeline(monkeypatch, tmp_path):
    monkeypatch.setenv("LEADDIRECT_OUTPUT_DIR", str(tmp_path))
    monkeypatch.setattr(discover, "search_companies", lambda q, n, ex: [
        {"company": "A", "domain": "a.fr", "url": "", "snippet": ""},
        {"company": "B", "domain": "b.fr", "url": "", "snippet": ""},
        {"company": "C", "domain": "c.fr", "url": "", "snippet": ""}])

    async def fake_crawl(domains, region=None, concurrency=4):
        return [{"domain": d, "status": "unreachable" if d == "b.fr" else "ok", "emails": [f"info@{d}"],
                 "phones": [], "socials": {}} for d in domains]
    monkeypatch.setattr(discover, "crawl_many", fake_crawl)

    first = json.loads(await server.find_leads("trailers", target_leads=5))
    assert [l["domain"] for l in first["leads"]] == ["a.fr", "c.fr"] and first["saved_to_csv"] == 2
    again = json.loads(await server.find_leads("trailers", target_leads=5))
    assert again["count"] == 0 and again["skipped_known_domains"] == 2
    assert json.loads(server.list_leads())["total"] == 2
