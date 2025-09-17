"""
Minimal script to fetch members of a U.S. House committee and write to JSONL.

Primary data source: Clerk of the U.S. House of Representatives (XML feeds)
  Example feeds (subject to change):
    - https://clerk.house.gov/xml/lists/CommitteeMembership.xml
    - https://clerk.house.gov/xml/lists/MemberData.xml
Fallback data source: Congress.gov API (Library of Congress)
  Docs: https://api.congress.gov/
  Committee item endpoint: /v3/committee/{chamber}/{committeeCode}
  Members sub-endpoint (preferred when available): /v3/committee/{chamber}/{committeeCode}/members?congress={congress}

Requirements:
- Optional: Set environment variable CONGRESS_API_KEY with your Congress.gov API key (used only for fallback)
- Dependencies: requests, python-dotenv (optional convenience)

Examples:
  python fetch_committee_members.py --committee-id HSAG --congress 119 --outfile committee_members.jsonl
  python fetch_committee_members.py --committee-id HSFA  # defaults congress=119, chamber=house
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Dict, List

import requests
from dotenv import load_dotenv  # type: ignore

load_dotenv()

BASE_URL = "https://api.congress.gov/v3"

UNITEDSTATES_COMMITTEE_MEMBERSHIP_URL = (
    "https://theunitedstates.io/congress/committee-membership-current.json"
)


def normalize_committee_code(committee_id: str, chamber: str) -> str:
    """
    Normalize committee code to Congress.gov systemCode format.
    Examples:
      HSAG -> hsag00, HSFA -> hsfa00
    """
    code = (committee_id or "").strip().lower()
    if len(code) == 4 and code.isalpha():
        code = f"{code}00"
    # Congress.gov uses 'house'/'senate' path segments, the code prefix typically starts with h/s
    # We don't alter the prefix here beyond lowercasing.
    return code


def fetch_members_from_unitedstates(committee_id: str) -> List[Dict]:
    """
    Fetch current committee membership from theunitedstates.io dataset.
    Returns a list of dicts with at least bioguide and role info.
    """
    try:
        resp = requests.get(UNITEDSTATES_COMMITTEE_MEMBERSHIP_URL, timeout=30)
        if resp.status_code != 200:
            return []
        data = resp.json()
        committee_key_upper = (committee_id or "").strip().upper()
        committee = data.get(committee_key_upper)
        if not committee:
            return []
        members: List[Dict] = []
        # committee is expected to be mapping of bioguide -> role info
        if isinstance(committee, dict):
            for bioguide, role in committee.items():
                row: Dict = {"bioguide": bioguide}
                if isinstance(role, dict):
                    row.update(role)
                elif isinstance(role, str):
                    row["role"] = role
                members.append(row)
        elif isinstance(committee, list):
            # fallback if list of members
            for item in committee:
                if isinstance(item, dict):
                    members.append(item)
        return members
    except Exception:
        return []


def _http_get(url: str, api_key: str, params: Dict | None = None) -> Dict:
    headers = {"X-API-Key": api_key}
    merged_params = {"format": "json"}
    if params:
        merged_params.update(params)
    resp = requests.get(url, headers=headers, params=merged_params, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"API error {resp.status_code} for {url}: {resp.text[:500]}")
    return resp.json()


def _extract_members(payload: Dict) -> List[Dict]:
    """
    Extract a list of member dicts from variable Congress.gov payload shapes.
    Looks for keys like 'members' or 'member' and supports either list or {item: [...]}.
    """
    if not isinstance(payload, dict):
        return []

    # Common patterns
    if "members" in payload:
        m = payload["members"]
        if isinstance(m, list):
            return m
        if isinstance(m, dict):
            if "item" in m and isinstance(m["item"], list):
                return m["item"]
            # Sometimes nested under payload["members"]["members"]
            if "members" in m and isinstance(m["members"], list):
                return m["members"]
    if "member" in payload and isinstance(payload["member"], list):
        return payload["member"]

    # Item-level object may nest under 'committee'
    if "committee" in payload and isinstance(payload["committee"], dict):
        return _extract_members(payload["committee"])

    return []


def fetch_committee_members(congress: int, chamber: str, committee_id: str, api_key: str) -> List[Dict]:
    """
    Fetch committee members.

    Strategy:
      1) Try theunitedstates.io committee-membership-current.json (current roster)
      2) Try Congress.gov committee item endpoints (if membership becomes available)
    """
    # Primary source: theunitedstates.io current roster
    us_members = fetch_members_from_unitedstates(committee_id)
    if us_members:
        for m in us_members:
            m.setdefault("committee_id", committee_id.upper())
            m.setdefault("chamber", chamber)
            m.setdefault("congress", congress)
            m.setdefault("source", UNITEDSTATES_COMMITTEE_MEMBERSHIP_URL)
        return us_members
    code = normalize_committee_code(committee_id, chamber)

    # 1) Members sub-endpoint
    members_url = f"{BASE_URL}/committee/{chamber}/{code}/members"
    try:
        data = _http_get(members_url, api_key, params={"congress": str(congress)})
        members = _extract_members(data)
        if members:
            for m in members:
                m.setdefault("committee_id", code)
                m.setdefault("chamber", chamber)
                m.setdefault("congress", congress)
                m.setdefault("source", members_url)
            return members
    except Exception:
        # Continue to fallback
        pass

    # 2) Item endpoint fallback
    item_url = f"{BASE_URL}/committee/{chamber}/{code}"
    data = _http_get(item_url, api_key, params={"congress": str(congress)})
    members = _extract_members(data)
    for m in members:
        m.setdefault("committee_id", code)
        m.setdefault("chamber", chamber)
        m.setdefault("congress", congress)
        m.setdefault("source", item_url)
    return members


def write_jsonl(rows: List[Dict], outfile: str) -> None:
    """
    Write list of dicts to JSON Lines file.
    """
    with open(outfile, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch House committee members to JSONL")
    parser.add_argument(
        "--committee-id",
        required=True,
        help="Committee ID (e.g., HSAG for House Agriculture, HSFA for House Foreign Affairs)",
    )
    parser.add_argument(
        "--congress",
        type=int,
        default=119,
        help="Congress number (default: 119)",
    )
    parser.add_argument(
        "--chamber",
        choices=["house", "senate"],
        default="house",
        help="Chamber (default: house)",
    )
    parser.add_argument(
        "--outfile",
        default=None,
        help="Output JSONL path (default: committee_members_{committee_id}_{congress}.jsonl)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Load from env (supports common variants and lowercase from .env)
    api_key = (
        os.getenv("CONGRESS_API_KEY")
    )
    if not api_key:
        print(
            "ERROR: Missing Congress.gov API key. Set CONGRESS_API_KEY (or congress_api_key) in your environment or .env",
            file=sys.stderr,
        )
        sys.exit(2)

    outfile = args.outfile or f"committee_members_{args.committee_id}_{args.congress}.jsonl"

    try:
        members = fetch_committee_members(
            congress=args.congress,
            chamber=args.chamber,
            committee_id=args.committee_id,
            api_key=api_key,
        )
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

    write_jsonl(members, outfile)
    print(f"Wrote {len(members)} members to {outfile}")


if __name__ == "__main__":
    main()


