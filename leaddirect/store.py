"""Leads CSV, de-duplicated by domain."""

from __future__ import annotations

import csv
from datetime import date
from pathlib import Path
from typing import Any

FIELDS = [
    "date",
    "company",
    "domain",
    "email",
    "other_emails",
    "phone",
    "linkedin",
    "facebook",
    "instagram",
    "whatsapp",
    "query",
]


class LeadStore:
    def __init__(self, path: Path):
        self.path = path

    def rows(self) -> list[dict[str, str]]:
        if not self.path.exists():
            return []
        with self.path.open(newline="", encoding="utf-8") as f:
            return [{k: r.get(k) or "" for k in FIELDS} for r in csv.DictReader(f)]

    def domains(self) -> set[str]:
        return {r["domain"] for r in self.rows()}

    def add(self, leads: list[dict[str, Any]], query: str = "") -> list[dict[str, str]]:
        """Appends new leads; domains already in the file are skipped. Returns the rows written."""
        known = self.domains()
        new_rows = []
        for lead in leads:
            if not lead.get("domain") or lead["domain"] in known:
                continue
            known.add(lead["domain"])
            emails = lead.get("emails") or []
            socials = lead.get("socials") or {}
            new_rows.append(
                {
                    "date": date.today().isoformat(),
                    "company": lead.get("company", ""),
                    "domain": lead["domain"],
                    "email": emails[0] if emails else "",
                    "other_emails": "; ".join(emails[1:4]),
                    "phone": (lead.get("phones") or [""])[0],
                    "linkedin": socials.get("linkedin", ""),
                    "facebook": socials.get("facebook", ""),
                    "instagram": socials.get("instagram", ""),
                    "whatsapp": socials.get("whatsapp", ""),
                    "query": query,
                }
            )
        if new_rows:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            exists = self.path.exists()
            with self.path.open("a", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=FIELDS)
                if not exists:
                    w.writeheader()
                w.writerows(new_rows)
        return new_rows
