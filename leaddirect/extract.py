"""Pure contact extraction from HTML: emails (plain, mailto, Cloudflare-obfuscated), phone numbers
and social profile links. No network access; covered by tests/test_extract.py."""

from __future__ import annotations

import re
from typing import Iterable, Optional
from urllib.parse import unquote, urlparse

import phonenumbers
from bs4 import BeautifulSoup

EMAIL_RE = re.compile(r"(?<![\w.+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}(?![\w-])")

# Things that look like emails but are not: asset names (logo@2x.png), placeholders, tracking hosts.
_ASSET_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".css", ".js", ".ico")
_JUNK_DOMAINS = ("example.com", "example.org", "domain.com", "email.com", "yourdomain.com", "sentry.io",
                 "wixpress.com", "sentry-next.wixpress.com", "godaddy.com")
_JUNK_LOCALS = ("noreply", "no-reply", "donotreply", "do-not-reply", "user", "name", "your", "youremail",
                # "firstname.lastname" placeholders used to explain an address pattern
                "firstname.lastname", "first.last", "fornavn.etternavn", "fornamn.efternamn", "etunimi.sukunimi",
                "vorname.nachname", "prenom.nom", "nombre.apellido", "nome.cognome", "voornaam.achternaam",
                "ad.soyad", "isim.soyisim", "imie.nazwisko")

GENERIC_LOCALS = {
    "info", "contact", "hello", "hi", "sales", "office", "support", "admin", "service", "services",
    "enquiries", "inquiries", "enquiry", "inquiry", "mail", "team", "help", "orders", "order", "billing",
    "accounts", "marketing", "press", "media", "careers", "jobs", "hr", "webmaster", "export", "kontakt",
    "iletisim", "bilgi", "satis", "contacto", "ventas",
    # sales / office / service in other languages
    "ventes", "commercial", "accueil", "atelier", "devis", "vertrieb", "verkauf", "buero", "zentrale",
    "myynti", "asiakaspalvelu", "toimisto", "tilaukset", "muhasebe", "destek", "satinalma", "comercial",
    "vendite", "verkoop", "salg", "forsaljning", "kundtjanst", "kundeservice", "biuro", "sprzedaz",
}

SOCIAL_HOSTS = {
    "linkedin": ("linkedin.com",),
    "facebook": ("facebook.com", "fb.com"),
    "instagram": ("instagram.com",),
    "x": ("twitter.com", "x.com"),
    "youtube": ("youtube.com",),
    "whatsapp": ("wa.me", "whatsapp.com", "api.whatsapp.com"),
}


def decode_cf_email(encoded: str) -> str:
    """Decodes a Cloudflare email-protection string: the first byte is the XOR key for the rest."""
    if len(encoded) < 4 or len(encoded) % 2 or not re.fullmatch(r"[0-9a-fA-F]+", encoded):
        raise ValueError("not a Cloudflare-encoded email")
    key = int(encoded[:2], 16)
    return "".join(chr(int(encoded[i:i + 2], 16) ^ key) for i in range(2, len(encoded), 2))


def encode_cf_email(email: str, key: int = 0x5A) -> str:
    """Inverse of decode_cf_email (used in tests and the web demo)."""
    return f"{key:02x}" + "".join(f"{ord(ch) ^ key:02x}" for ch in email)


def is_plausible_email(email: str) -> bool:
    lower = email.lower()
    if lower.endswith(_ASSET_SUFFIXES):
        return False
    local, _, domain = lower.partition("@")
    if not local or not domain or ".." in lower or local.startswith(".") or local.endswith("."):
        return False
    if any(domain == d or domain.endswith("." + d) for d in _JUNK_DOMAINS):
        return False
    if local in _JUNK_LOCALS:
        return False
    return EMAIL_RE.fullmatch(email) is not None


def is_generic(email: str) -> bool:
    local = email.split("@", 1)[0].lower()
    return re.split(r"[.+_-]", local)[0] in GENERIC_LOCALS


def _dedupe(items: Iterable[str]) -> list[str]:
    return list(dict.fromkeys(items))


def extract_emails(html: str) -> dict[str, list[str]]:
    """Returns {"plain": [...], "cloudflare": [...]} with lower-cased, de-duplicated, plausible emails."""
    soup = BeautifulSoup(html, "html.parser")
    plain: list[str] = []
    for a in soup.select("a[href^='mailto:' i]"):
        target = unquote(a["href"].split(":", 1)[1].split("?", 1)[0])
        plain.extend(e.strip() for e in target.split(","))
    plain.extend(EMAIL_RE.findall(soup.get_text(" ")))
    for tag in soup.find_all(True):
        for attr in ("href", "content", "data-email", "value"):
            value = tag.get(attr)
            if isinstance(value, str) and "@" in value:
                plain.extend(EMAIL_RE.findall(unquote(value)))

    cloudflare: list[str] = []
    for tag in soup.select("[data-cfemail]"):
        try:
            cloudflare.append(decode_cf_email(tag["data-cfemail"]))
        except ValueError:
            pass
    for a in soup.select("a[href*='/cdn-cgi/l/email-protection#']"):
        try:
            cloudflare.append(decode_cf_email(a["href"].split("#", 1)[1]))
        except ValueError:
            pass

    clean = lambda xs: _dedupe(e.lower() for e in xs if is_plausible_email(e))  # noqa: E731
    cf = clean(cloudflare)
    return {"plain": [e for e in clean(plain) if e not in cf], "cloudflare": cf}


def extract_phones(text: str, region: Optional[str] = None) -> list[str]:
    """International-format phone numbers. ``region`` (ISO alpha-2, e.g. "FI") lets national numbers parse."""
    region = region.upper() if region and len(region) == 2 else None
    found = []
    try:
        for match in phonenumbers.PhoneNumberMatcher(text, region, leniency=phonenumbers.Leniency.VALID):
            found.append(phonenumbers.format_number(match.number, phonenumbers.PhoneNumberFormat.INTERNATIONAL))
    except Exception:  # phonenumbers raises on pathological input; contacts are best-effort
        pass
    return _dedupe(found)


def extract_socials(html: str) -> dict[str, str]:
    """First link per network. Share/intent links are skipped; they point at the network, not the company."""
    soup = BeautifulSoup(html, "html.parser")
    socials: dict[str, str] = {}
    for a in soup.select("a[href]"):
        href = a["href"].strip()
        try:
            parsed = urlparse(href)
        except ValueError:
            continue
        host = (parsed.hostname or "").lower().removeprefix("www.")
        path = parsed.path.lower()
        if not host or any(s in path for s in ("/sharer", "/share", "/intent", "/dialog")):
            continue
        for network, hosts in SOCIAL_HOSTS.items():
            if network in socials:
                continue
            if any(host == h or host.endswith("." + h) for h in hosts):
                if network != "whatsapp" and path in ("", "/"):
                    continue
                socials[network] = href
    return socials


def registrable_domain(url_or_domain: str) -> str:
    """Hostname without scheme, port, path or a leading www."""
    value = url_or_domain.strip()
    if "://" not in value:
        value = "http://" + value
    host = (urlparse(value).hostname or "").lower()
    return host.removeprefix("www.")


def guess_region(domain: str) -> Optional[str]:
    tld = domain.rsplit(".", 1)[-1].upper()
    if tld == "UK":
        return "GB"
    return tld if len(tld) == 2 else None
