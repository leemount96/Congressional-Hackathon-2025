import argparse
import json
import os
import re
from typing import Dict, Set

from dotenv import load_dotenv


def load_witness_names(jsonl_path: str) -> Set[str]:
    """Read witnesses from a JSONL file and return a set of names."""
    witness_names: Set[str] = set()
    with open(jsonl_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get("type") == "witness":
                name = obj.get("name")
                if isinstance(name, str) and name.strip():
                    witness_names.add(name.strip())
    return witness_names


def load_committee_member_names(json_path: str) -> Set[str]:
    """Read committee membership json and return a set of member names across all committees."""
    member_names: Set[str] = set()
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # File is a dict of committee codes -> list of member objects
    for members in data.values():
        if not isinstance(members, list):
            continue
        for m in members:
            name = m.get("name") if isinstance(m, dict) else None
            if isinstance(name, str) and name.strip():
                member_names.add(name.strip())
    return member_names


def load_speaker_mapping(json_path: str) -> Dict[str, str]:
    """Return mapping of SPEAKER_* labels to canonical names."""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    mapping_obj = data.get("mapping", {}) if isinstance(data, dict) else {}
    mapping: Dict[str, str] = {}
    for label, info in mapping_obj.items():
        if not isinstance(info, dict):
            continue
        name = info.get("name")
        if isinstance(name, str) and name.strip():
            mapping[label] = name.strip()
    return mapping


def determine_role(name: str, witnesses: Set[str], committee_members: Set[str]) -> str:
    if name in witnesses:
        return "Witness"
    if name in committee_members:
        return "Committee"
    return "Other"


def rewrite_transcript(
    transcript_path: str,
    output_path: str,
    label_to_name: Dict[str, str],
    witnesses: Set[str],
    committee_members: Set[str],
    annotate_role: bool = True,
) -> None:
    pattern = re.compile(r"\bSPEAKER_[A-Z]+\b")

    def replace_label(match: re.Match[str]) -> str:
        label = match.group(0)
        name = label_to_name.get(label)
        if not name or name.lower() == "unknown":
            return label
        if annotate_role:
            role = determine_role(name, witnesses, committee_members)
            if role in ("Witness", "Committee"):
                return f"{name} ({role})"
        return name

    with open(transcript_path, "r", encoding="utf-8") as fin, open(
        output_path, "w", encoding="utf-8"
    ) as fout:
        for line in fin:
            new_line = pattern.sub(replace_label, line)
            fout.write(new_line)


def main() -> None:
    load_dotenv()

    default_root = os.path.dirname(os.path.abspath(__file__))
    parser = argparse.ArgumentParser(
        description="Replace SPEAKER_* labels in transcript with mapped entity names, annotating known witnesses/committee members."
    )
    parser.add_argument(
        "--transcript",
        default=os.path.join(default_root, "transcript_v2.txt"),
        help="Path to input transcript file.",
    )
    parser.add_argument(
        "--witnesses",
        default=os.path.join(default_root, "congress_witnesses.jsonl"),
        help="Path to congress_witnesses.jsonl file.",
    )
    parser.add_argument(
        "--committee",
        default=os.path.join(default_root, "committee-membership-current.json"),
        help="Path to committee-membership-current.json file.",
    )
    parser.add_argument(
        "--mapping",
        default=os.path.join(default_root, "speaker_mapping_v2.json"),
        help="Path to speaker mapping json file.",
    )
    parser.add_argument(
        "--out",
        default=os.path.join(default_root, "transcript_v2_labeled.txt"),
        help="Path to write updated transcript.",
    )
    parser.add_argument(
        "--no-role",
        action="store_true",
        help="If set, do not annotate names with (Witness)/(Committee).",
    )
    args = parser.parse_args()

    witnesses = load_witness_names(args.witnesses)
    committee_members = load_committee_member_names(args.committee)
    label_to_name = load_speaker_mapping(args.mapping)

    rewrite_transcript(
        transcript_path=args.transcript,
        output_path=args.out,
        label_to_name=label_to_name,
        witnesses=witnesses,
        committee_members=committee_members,
        annotate_role=(not args.no_role),
    )


if __name__ == "__main__":
    main()


