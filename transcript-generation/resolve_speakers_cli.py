"""
Command-line driver to resolve transcript speakers to real names.

Example:
  uv run python resolve_speakers_cli.py \
    --transcript-path transcript.txt \
    --witnesses-path congress_witnesses.jsonl \
    --witnesses-format jsonl \
    --committee-membership-path committee-membership-current.json \
    --committee-id HSAG \
    --max-lines 150

Environment:
  - OPENAI_API_KEY must be set (dotenv is loaded if present)
"""

from __future__ import annotations

import argparse
import json
from typing import Any, Dict

from dotenv import load_dotenv  # type: ignore

from speaker_resolver import (
    resolve_speakers_from_files,
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Resolve transcript SPEAKER_* labels to real people")
    p.add_argument(
        "--transcript-path",
        required=True,
        help="Path to transcript file (only first N lines will be read)",
    )
    p.add_argument(
        "--witnesses-path",
        required=True,
        help="Path to witnesses JSON/JSONL file",
    )
    p.add_argument(
        "--witnesses-format",
        choices=["jsonl", "json"],
        default="jsonl",
        help="Format of witnesses file (default: jsonl)",
    )
    p.add_argument(
        "--committee-membership-path",
        default=None,
        help="Path to committee-membership-current.json (optional)",
    )
    p.add_argument(
        "--committee-id",
        default="HSAG",
        help="Committee code (default: HSAG for House Agriculture)",
    )
    p.add_argument(
        "--max-lines",
        type=int,
        default=150,
        help="Number of transcript lines to read from the head (default: 150)",
    )
    p.add_argument(
        "--max-utterances-per-speaker",
        type=int,
        default=3,
        help="First K utterances per label that will be summarized for the LLM (default: 3)",
    )
    p.add_argument(
        "--model",
        default="gpt-5",
        help="OpenAI model (default: gpt-5)",
    )
    p.add_argument(
        "--reasoning-effort",
        choices=["low", "medium", "high"],
        default="medium",
        help="Reasoning effort setting (default: medium)",
    )
    p.add_argument(
        "--out",
        default=None,
        help="Optional path to write the resulting mapping JSON",
    )
    return p.parse_args()


def main() -> None:
    load_dotenv()
    args = parse_args()

    mapping: Dict[str, Dict[str, Any]] = resolve_speakers_from_files(
        transcript_path=args.transcript_path,
        speakers_path=args.witnesses_path,
        speakers_format=args.witnesses_format,
        committee_membership_path=args.committee_membership_path,
        committee_id=args.committee_id,
        max_lines=args.max_lines,
        max_utterances_per_speaker=args.max_utterances_per_speaker,
        model=args.model,
        reasoning_effort=args.reasoning_effort,
    )

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump({"mapping": mapping}, f, ensure_ascii=False, indent=2)
        print(f"Wrote mapping to {args.out}")
    else:
        print(json.dumps({"mapping": mapping}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()


