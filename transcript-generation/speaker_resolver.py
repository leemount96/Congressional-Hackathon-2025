"""
Speaker resolution utilities.

This module provides functions to:
1) Read only the first N lines of a hearing transcript (e.g., `transcript.txt`).
2) Parse early utterances like "[hh:mm:ss - hh:mm:ss] SPEAKER_X: text" into a structured form.
3) Load known speakers (witnesses + members) from simple JSON/JSONL inputs.
4) Call OpenAI (gpt-5 with reasoning) to map generic labels (e.g., SPEAKER_A) to real people.

Notes:
- Keep the design function-first. Use data classes only for simple record-like data to improve readability.
- Do not execute anything here; provide callable utilities for the rest of the app.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from openai import OpenAI
from dotenv import load_dotenv  # type: ignore

load_dotenv()


SPEAKER_LINE_RE = re.compile(
    r"^\[(?P<start>\d{2}:\d{2}:\d{2})\s*-\s*(?P<end>\d{2}:\d{2}:\d{2})\]\s+(?P<label>SPEAKER_[A-Z]):\s*(?P<text>.*)$"
)


@dataclass(frozen=True)
class Utterance:
    """A parsed utterance from the transcript head."""

    index: int
    start_time: str
    end_time: str
    speaker_label: str
    text: str
    previous_speaker_label: Optional[str]


def read_transcript_head(
    transcript_path: str | Path,
    max_lines: int = 300,
) -> List[str]:
    """Read only the first `max_lines` lines of the transcript file.

    The transcript format is assumed to contain lines like:
        [hh:mm:ss - hh:mm:ss] SPEAKER_A: Some text

    Args:
        transcript_path: Path to transcript text file.
        max_lines: Maximum number of lines to read from the beginning.

    Returns:
        Raw lines (with newline stripped) from the head of the file.
    """
    path = Path(transcript_path)
    lines: List[str] = []
    with path.open("r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i >= max_lines:
                break
            lines.append(line.rstrip("\n"))
    return lines


def parse_utterances(lines: Iterable[str]) -> List[Utterance]:
    """Parse early utterances from head lines.

    Only lines matching the explicit SPEAKER pattern are converted to Utterances.
    Tracks the previous speaker label to provide adjacency context.
    """
    utterances: List[Utterance] = []
    last_label: Optional[str] = None
    idx: int = 0

    for line in lines:
        m = SPEAKER_LINE_RE.match(line)
        if not m:
            continue
        start = m.group("start")
        end = m.group("end")
        label = m.group("label")
        text = m.group("text").strip()
        utterances.append(
            Utterance(
                index=idx,
                start_time=start,
                end_time=end,
                speaker_label=label,
                text=text,
                previous_speaker_label=last_label,
            )
        )
        idx += 1
        last_label = label

    return utterances


def summarize_observed_speakers(
    utterances: List[Utterance],
    max_utterances_per_speaker: int = 3,
) -> Dict[str, Dict[str, Any]]:
    """Build a compact summary per observed speaker label.

    For each label (e.g., SPEAKER_A), keep the first few utterances with:
    - snippet text (truncated),
    - the previous label before each utterance (for order context),
    - first seen timestamp.
    """
    by_label: Dict[str, List[Utterance]] = {}
    for u in utterances:
        by_label.setdefault(u.speaker_label, []).append(u)

    summary: Dict[str, Dict[str, Any]] = {}
    for label, us in by_label.items():
        head_us = us[:max_utterances_per_speaker]
        examples: List[Dict[str, Any]] = []
        for h in head_us:
            examples.append(
                {
                    "index": h.index,
                    "start": h.start_time,
                    "end": h.end_time,
                    "prev_label": h.previous_speaker_label,
                    "text_snippet": h.text[:400],
                }
            )
        summary[label] = {
            "first_seen": head_us[0].start_time if head_us else None,
            "num_observed": len(us),
            "examples": examples,
        }
    return summary


def load_known_speakers_from_jsonl(path: str | Path) -> List[Dict[str, Any]]:
    """Load witness/member list from a JSONL file.

    Each non-metadata line should look like:
        {"type": "witness", "name": "Jane Doe", "position": "...", "organization": "..."}

    Returns:
        A list of simple dicts with at least {"name": str}. Other fields are preserved.
    """
    result: List[Dict[str, Any]] = []
    p = Path(path)
    with p.open("r", encoding="utf-8") as f:
        for raw in f:
            raw = raw.strip()
            if not raw:
                continue
            try:
                obj = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if obj.get("type") in {"witness", "member", "person"} and obj.get("name"):
                result.append(obj)
    return result


def load_known_speakers_from_json(path: str | Path) -> List[Dict[str, Any]]:
    """Load witnesses/members from a JSON file.

    Expected structure examples:
        [
          {"name": "Rep. X", "role": "Member"},
          {"name": "Jane Doe", "role": "Witness", "organization": "..."}
        ]
    """
    p = Path(path)
    with p.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return [d for d in data if isinstance(d, dict) and d.get("name")]
    return []


def load_committee_members_from_unitedstates_file(
    membership_json_path: str | Path,
    committee_id: str = "HSAG",
) -> List[Dict[str, Any]]:
    """Load committee members for a given committee from the unitedstates.io JSON dump.

    The file shape is a single JSON object mapping committee codes (e.g., "HSAG")
    to an array (or dict) of members. Members typically include:
      - name (str)
      - party ("majority"|"minority")
      - rank (int)
      - title (e.g., "Chairman", "Ranking Member") [optional]
      - bioguide (str)

    Returns a list of dicts with a normalized shape suitable for LLM prompting:
      {
        "type": "member",
        "name": "Rep. X",
        "party": "majority",
        "rank": 1,
        "title": "Chairman",
        "bioguide": "...",
        "committee_id": "HSAG",
        "chamber": "house"
      }
    """
    p = Path(membership_json_path)
    try:
        with p.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return []

    key = (committee_id or "").strip().upper()
    raw = data.get(key)
    members: List[Dict[str, Any]] = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict) and item.get("name"):
                row = dict(item)
                row.setdefault("type", "member")
                row.setdefault("committee_id", key)
                row.setdefault("chamber", "house")
                members.append(row)
    elif isinstance(raw, dict):
        # sometimes keyed by bioguide -> role dict
        for _, role in raw.items():
            if isinstance(role, dict) and role.get("name"):
                row = dict(role)
                row.setdefault("type", "member")
                row.setdefault("committee_id", key)
                row.setdefault("chamber", "house")
                members.append(row)
    return members


def merge_known_speakers(*sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Merge multiple known-speaker lists, coalescing duplicates by bioguide or name.

    - Prefer entries with a bioguide when present
    - Merge dicts shallowly; earlier sources take precedence
    """
    merged: Dict[str, Dict[str, Any]] = {}
    name_keyed: Dict[str, str] = {}

    def _key_for(d: Dict[str, Any]) -> str:
        if d.get("bioguide"):
            return f"bioguide:{d['bioguide']}"
        # Normalize name key for rough merge
        n = (d.get("name") or "").strip().lower()
        return f"name:{n}"

    for lst in sources:
        for d in lst:
            if not isinstance(d, dict) or not d.get("name"):
                continue
            k = _key_for(d)
            if k not in merged:
                merged[k] = dict(d)
                if d.get("name"):
                    name_keyed[d["name"].strip().lower()] = k
            else:
                # shallow merge: keep existing fields; add any new
                for key, val in d.items():
                    if key not in merged[k] and val is not None:
                        merged[k][key] = val

    return list(merged.values())


def build_mapping_prompt(
    known_speakers: List[Dict[str, Any]],
    observed_summary: Dict[str, Dict[str, Any]],
    transcript_head_text: str,
) -> str:
    """Construct a prompt for the LLM to map SPEAKER_* to real names.

    Instruct the model to return strict JSON: {"mapping": {"SPEAKER_A": {"name": "...", ...}, ...}}
    """
    guidance = (
        "You will map generic transcript labels (e.g., SPEAKER_A) to real people from the provided list.\n"
        "Use cues in early utterances: who opens the hearing (Chair), ranking member, witness intros, salutations, and self-identification.\n"
        "Consider adjacency (who speaks before/after) and role clues in text.\n"
        "If uncertain, set the name to 'Unknown' and include 'confidence': 0.\n"
        "Return ONLY JSON with the schema: {\"mapping\": {label: {\"name\": str, \"confidence\": number, \"reason\": str}}}."
    )
    payload = {
        "known_speakers": known_speakers,
        "observed_speakers": observed_summary,
        "transcript_head": transcript_head_text,
    }
    return guidance + "\n\n" + json.dumps(payload, ensure_ascii=False, indent=2)


def _openai_client() -> OpenAI:
    """Construct an OpenAI client, allowing OPENAI_API_KEY from env."""
    return OpenAI()


def resolve_speakers_via_llm(
    known_speakers: List[Dict[str, Any]],
    observed_summary: Dict[str, Dict[str, Any]],
    transcript_head_lines: List[str],
    model: str = "gpt-5",
    reasoning_effort: str = "medium",
    temperature: float = 0.0,
) -> Dict[str, Dict[str, Any]]:
    """Call OpenAI to map labels to names.

    Returns a mapping like:
        {
          "SPEAKER_A": {"name": "Rep. Glenn Thompson", "confidence": 0.86, "reason": "..."},
          ...
        }
    """
    client = _openai_client()
    transcript_text = "\n".join(transcript_head_lines)
    prompt = build_mapping_prompt(known_speakers, observed_summary, transcript_text)

    # Using Responses API with reasoning enabled.
    resp = client.responses.create(
        model=model,
        reasoning={"effort": reasoning_effort},
        input=[
            {"role": "system", "content": "You are a precise mapping assistant for congressional hearings."},
            {"role": "user", "content": prompt},
        ],
    )

    content = _coalesce_response_text(resp)
    try:
        parsed = json.loads(content)
        mapping = parsed.get("mapping") or {}
        if isinstance(mapping, dict):
            return mapping
    except json.JSONDecodeError:
        pass

    # Fallback empty mapping if model returns unexpected content
    return {}


def _coalesce_response_text(resp: Any) -> str:
    """Extract plain text content from OpenAI Responses API result."""
    # Compatible extraction for SDK v1 responses
    try:
        parts = resp.output_text  # type: ignore[attr-defined]
        if isinstance(parts, str):
            return parts
    except Exception:
        pass

    try:
        # Older shapes: resp.output[0].content[0].text
        outputs = getattr(resp, "output", None)
        if outputs and isinstance(outputs, list) and outputs:
            first = outputs[0]
            content = getattr(first, "content", None)
            if content and isinstance(content, list) and content:
                text = getattr(content[0], "text", None)
                if text and hasattr(text, "value"):
                    return text.value  # type: ignore[no-any-return]
    except Exception:
        pass

    return ""


def resolve_speakers_from_files(
    transcript_path: str | Path,
    speakers_path: str | Path,
    speakers_format: str = "jsonl",
    committee_membership_path: str | Path | None = None,
    committee_id: str = "HSAG",
    max_lines: int = 300,
    max_utterances_per_speaker: int = 3,
    model: str = "gpt-5",
    reasoning_effort: str = "medium",
) -> Dict[str, Dict[str, Any]]:
    """High-level helper: read files, parse, and resolve mapping via LLM.

    Args:
        transcript_path: Path to transcript text file (only head is read).
        speakers_path: Path to known speakers list (witnesses + members) in JSON/JSONL.
        speakers_format: "jsonl" or "json".
        max_lines: Number of transcript lines to read from the beginning.
        max_utterances_per_speaker: First K utterances to include per label in prompt.
        model: OpenAI model, defaults to "gpt-5".
        reasoning_effort: Reasoning effort for thinking-enabled models.

    Returns:
        Mapping dict keyed by transcript labels (e.g., SPEAKER_A) with name/confidence/reason.
    """
    head_lines = read_transcript_head(transcript_path, max_lines=max_lines)
    utterances = parse_utterances(head_lines)
    summary = summarize_observed_speakers(utterances, max_utterances_per_speaker=max_utterances_per_speaker)

    if speakers_format.lower() == "jsonl":
        known = load_known_speakers_from_jsonl(speakers_path)
    else:
        known = load_known_speakers_from_json(speakers_path)

    members: List[Dict[str, Any]] = []
    if committee_membership_path is not None:
        members = load_committee_members_from_unitedstates_file(
            committee_membership_path, committee_id=committee_id
        )

    if members:
        known = merge_known_speakers(known, members)

    mapping = resolve_speakers_via_llm(
        known_speakers=known,
        observed_summary=summary,
        transcript_head_lines=head_lines,
        model=model,
        reasoning_effort=reasoning_effort,
    )
    return mapping


__all__ = [
    "Utterance",
    "read_transcript_head",
    "parse_utterances",
    "summarize_observed_speakers",
    "load_known_speakers_from_jsonl",
    "load_known_speakers_from_json",
    "load_committee_members_from_unitedstates_file",
    "merge_known_speakers",
    "build_mapping_prompt",
    "resolve_speakers_via_llm",
    "resolve_speakers_from_files",
]


