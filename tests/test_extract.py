from leaddirect.extract import (
    decode_cf_email, encode_cf_email, extract_emails, extract_phones, extract_socials, guess_region,
    is_generic, is_plausible_email, registrable_domain,
)
import pytest


def test_cloudflare_roundtrip_and_known_value():
    assert decode_cf_email(encode_cf_email("sales@acme.fi", 0x3C)) == "sales@acme.fi"
    # "a@b.co" with key 0x10
    assert decode_cf_email("10" + "".join(f"{ord(c) ^ 0x10:02x}" for c in "a@b.co")) == "a@b.co"
    for bad in ("", "1", "zz00", "123"):
        with pytest.raises(ValueError):
            decode_cf_email(bad)


def test_plausibility_filters_assets_and_placeholders():
    assert is_plausible_email("anna.virtanen@acme.fi")
    assert not is_plausible_email("logo@2x.png")
    assert not is_plausible_email("you@example.com")
    assert not is_plausible_email("noreply@acme.fi")
    assert not is_plausible_email("a..b@acme.fi")
    assert not is_plausible_email("fornavn.etternavn@vak.fi")
    assert not is_plausible_email("Etunimi.Sukunimi@acme.fi")


def test_generic_detection():
    assert is_generic("info@acme.fi") and is_generic("sales.eu@acme.fi") and is_generic("iletisim@firma.com.tr")
    assert is_generic("ventes@acme.fr") and is_generic("myynti@acme.fi") and is_generic("vertrieb@acme.de")
    assert not is_generic("anna.virtanen@acme.fi")


def test_extract_emails_all_sources():
    cf = encode_cf_email("export@trailers.fr")
    html = f"""
      <a href="mailto:Jean.Dupont@trailers.fr?subject=Hi">Mail</a>
      <p>Write to info@trailers.fr or ventes@trailers.fr.</p>
      <img src="/img/logo@2x.png">
      <span class="__cf_email__" data-cfemail="{cf}">[email protected]</span>
      <a href="/cdn-cgi/l/email-protection#{encode_cf_email('pierre@trailers.fr', 0x22)}">x</a>
      <a href="/cdn-cgi/l/email-protection#nothex">bad</a>
      <meta content="contact: press@trailers.fr">
    """
    out = extract_emails(html)
    assert out["cloudflare"] == ["export@trailers.fr", "pierre@trailers.fr"]
    assert out["plain"] == ["jean.dupont@trailers.fr", "info@trailers.fr", "ventes@trailers.fr", "press@trailers.fr"]


def test_extract_phones_with_region():
    text = "Call +358 40 123 4567 or 09 4242 4242. Order no 2026123456."
    phones = extract_phones(text, "FI")
    assert "+358 40 1234567" in phones
    assert all(p.startswith("+358") for p in phones)
    assert extract_phones("no numbers here") == []


def test_extract_socials_skips_share_links_and_bare_hosts():
    html = """
      <a href="https://www.facebook.com/sharer/sharer.php?u=x">share</a>
      <a href="https://www.facebook.com/">fb home</a>
      <a href="https://www.facebook.com/acmetrailers">fb</a>
      <a href="https://linkedin.com/company/acme">li</a>
      <a href="https://wa.me/358401234567">wa</a>
      <a href="https://twitter.com/intent/tweet?text=x">tweet</a>
    """
    assert extract_socials(html) == {"facebook": "https://www.facebook.com/acmetrailers",
                                     "linkedin": "https://linkedin.com/company/acme",
                                     "whatsapp": "https://wa.me/358401234567"}


def test_domain_helpers():
    assert registrable_domain("https://www.Acme.fi:443/contact?x=1") == "acme.fi"
    assert registrable_domain("acme.fi/about") == "acme.fi"
    assert guess_region("acme.co.uk") == "GB" and guess_region("acme.fi") == "FI" and guess_region("acme.com") is None
