#!/usr/bin/env python3
"""
Query arXiv API for recent AI/ML/NLP preprints (stdlib only).
API docs: https://info.arxiv.org/help/api/user-manual.html
"""

from __future__ import annotations

import argparse
import sys
import textwrap
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone

API = "https://export.arxiv.org/api/query"
NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
    "opensearch": "http://a9.com/-/spec/opensearch/1.1/",
}


def build_search_query(
    *,
    categories: list[str],
    days: int,
    keywords: list[str],
) -> str:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)

    def fmt(d: datetime) -> str:
        return d.strftime("%Y%m%d%H%M")

    cat_part = "(" + " OR ".join(f"cat:{c.strip()}" for c in categories) + ")"
    date_part = f"submittedDate:[{fmt(start)} TO {fmt(end)}]"
    parts = [cat_part, date_part]
    if keywords:
        kw_q = " AND ".join(f"all:{k.strip()}" for k in keywords if k.strip())
        if kw_q:
            parts.append(f"({kw_q})")
    return " AND ".join(parts)


def fetch_feed(params: dict[str, str]) -> bytes:
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "arxiv-ai-scan/1.0 (cursor-plugins; +https://arxiv.org/help/api)"
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def parse_feed(xml_bytes: bytes) -> tuple[int, list[dict]]:
    root = ET.fromstring(xml_bytes)
    total_el = root.find("opensearch:totalResults", NS)
    total = int(total_el.text.strip()) if total_el is not None and total_el.text else 0
    out: list[dict] = []
    for entry in root.findall("atom:entry", NS):
        title_el = entry.find("atom:title", NS)
        id_el = entry.find("atom:id", NS)
        pub_el = entry.find("atom:published", NS)
        summ_el = entry.find("atom:summary", NS)
        prim_el = entry.find("arxiv:primary_category", NS)
        title = (title_el.text or "").strip() if title_el is not None else ""
        aid = (id_el.text or "").strip() if id_el is not None else ""
        pub = (pub_el.text or "").strip() if pub_el is not None else ""
        summary = (summ_el.text or "").strip() if summ_el is not None else ""
        if summary:
            summary = " ".join(summary.split())
        cat = prim_el.get("term", "") if prim_el is not None else ""
        out.append(
            {
                "title": title,
                "id": aid,
                "published": pub,
                "primary_category": cat,
                "summary": summary[:400] + ("…" if len(summary) > 400 else ""),
            }
        )
    return total, out


def main() -> int:
    p = argparse.ArgumentParser(
        description="List recent arXiv preprints in AI/ML/NLP categories (API: export.arxiv.org)."
    )
    p.add_argument(
        "--days",
        type=int,
        default=7,
        metavar="N",
        help="Look back N days by submittedDate (default: 7)",
    )
    p.add_argument(
        "--max",
        type=int,
        default=30,
        metavar="N",
        dest="max_results",
        help="Max results to return (default: 30, API max 30000)",
    )
    p.add_argument(
        "--categories",
        type=str,
        default="cs.AI,cs.LG,cs.CL",
        help="Comma-separated arXiv categories (default: cs.AI,cs.LG,cs.CL)",
    )
    p.add_argument(
        "keywords",
        nargs="*",
        help="Optional keywords (AND across all: fields)",
    )
    args = p.parse_args()
    cats = [c.strip() for c in args.categories.split(",") if c.strip()]
    if not cats:
        print("error: need at least one category", file=sys.stderr)
        return 2

    sq = build_search_query(
        categories=cats, days=args.days, keywords=list(args.keywords)
    )
    params = {
        "search_query": sq,
        "start": "0",
        "max_results": str(min(max(1, args.max_results), 30000)),
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }
    try:
        raw = fetch_feed(params)
    except urllib.error.HTTPError as e:
        print(f"error: HTTP {e.code} from arXiv API", file=sys.stderr)
        return 1
    except urllib.error.URLError as e:
        print(f"error: {e.reason}", file=sys.stderr)
        return 1

    total, entries = parse_feed(raw)
    print(f"Query: {sq}")
    print(f"Total matches (API): {total}  |  Showing: {len(entries)}")
    print("-" * 72)
    for i, e in enumerate(entries, 1):
        print(f"{i}. [{e['primary_category']}] {e['title']}")
        print(f"   {e['id']}")
        print(f"   published: {e['published']}")
        if e["summary"]:
            for line in textwrap.wrap(e["summary"], width=100):
                print(f"   {line}")
        print()
    if not entries and total == 0:
        print("(No results — widen --days or drop keywords.)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
