from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv


load_dotenv()


def _ffmpeg_exists() -> bool:
    return shutil.which("ffmpeg") is not None


def _extract_audio_segment(input_audio_path: Path, start_minutes: int = 0, duration_minutes: Optional[int] = None) -> Path:
    """
    Create a temporary file containing audio from `start_minutes` to `start_minutes + duration_minutes`
    from `input_audio_path`. If duration_minutes is None, processes the entire remaining audio.
    Returns the path to the processed file.
    """
    if not _ffmpeg_exists():
        raise RuntimeError("ffmpeg is required to process audio but was not found in PATH.")

    start_seconds = max(0, start_minutes * 60)
    temp_dir = Path(tempfile.mkdtemp(prefix="aai_audio_"))
    processed_path = temp_dir / "processed_audio.mp3"

    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        str(start_seconds),
        "-i",
        str(input_audio_path),
    ]
    
    # Add duration limit only if specified
    if duration_minutes is not None:
        duration_seconds = max(1, duration_minutes * 60)
        cmd.extend(["-t", str(duration_seconds)])
    
    cmd.extend([
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-af",
        "dynaudnorm,volume=5.0",  # Normalize dynamics then boost volume by 5x
        "-c:a",
        "libmp3lame",
        "-b:a",
        "64k",
        str(processed_path),
    ])
    
    subprocess.run(cmd, check=True)
    if not processed_path.exists():
        raise RuntimeError("Failed to create processed audio file")
    return processed_path


@dataclass
class SpeakerTurn:
    speaker: str
    start_ms: int
    end_ms: int
    text: str


def diarize_audio_file(input_audio_path: str, start_minutes: int = 0, duration_minutes: Optional[int] = None) -> List[SpeakerTurn]:
    """
    Transcribe and speaker-diarize an audio file using AssemblyAI.
    
    Args:
        input_audio_path: Path to the audio file
        start_minutes: Starting point in minutes (default: 0)
        duration_minutes: Duration in minutes to process (default: None = entire file)
    
    Requires ASSEMBLY_AI_API_KEY present in environment or .env.
    """
    api_key = os.environ.get("ASSEMBLY_AI_API_KEY")
    if not api_key:
        raise RuntimeError("ASSEMBLY_AI_API_KEY is not set in the environment.")

    try:
        import assemblyai as aai
        from assemblyai.types import SpeakerOptions
    except Exception as exc:
        raise RuntimeError("assemblyai package not installed. Add it to your environment.") from exc

    aai.settings.api_key = api_key

    path = Path(input_audio_path).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {path}")

    # Process audio segment (or entire file if duration_minutes is None)
    processed = _extract_audio_segment(path, start_minutes=start_minutes, duration_minutes=duration_minutes)

    # Enable diarization in config
    # Try best model for challenging audio
    config = aai.TranscriptionConfig(
        speech_model=aai.SpeechModel.best,  # Use best model instead of universal
        speaker_labels=True,
        speaker_options=SpeakerOptions(
            min_speakers_expected=10,
            max_speakers_expected=20,
        ),
        # Provide punctuate/formatting defaults
        punctuate=True,
        format_text=True,
        # Add audio intelligence features that might help
        auto_highlights=False,  # Disable to focus on transcription
        filter_profanity=False,  # Don't filter anything
    )

    transcript = aai.Transcriber(config=config).transcribe(str(processed))

    if transcript.status == "error":
        raise RuntimeError(f"Transcription failed: {transcript.error}")

    # Build speaker turns from words with speaker labels if available
    turns: List[SpeakerTurn] = []

    # Prefer transcript.utterances if present; else fallback to words speaker labels
    if getattr(transcript, "utterances", None):
        for utt in transcript.utterances:
            speaker = f"SPEAKER_{utt.speaker}"
            start_ms = int(getattr(utt, "start", 0) or 0)
            end_ms = int(getattr(utt, "end", 0) or 0)
            text = getattr(utt, "text", "") or ""
            turns.append(SpeakerTurn(speaker=speaker, start_ms=start_ms, end_ms=end_ms, text=text))
        return turns

    # Fallback: aggregate by consecutive speaker on words
    if getattr(transcript, "words", None):
        current_speaker: Optional[str] = None
        current_text: List[str] = []
        current_start: Optional[int] = None
        current_end: Optional[int] = None

        for w in transcript.words:
            spk_raw = getattr(w, "speaker", None)
            speaker = f"SPEAKER_{spk_raw}" if spk_raw is not None else "SPEAKER_?"
            start = int(getattr(w, "start", 0) or 0)
            end = int(getattr(w, "end", 0) or 0)
            text = getattr(w, "text", "")

            if current_speaker is None:
                current_speaker = speaker
                current_start = start
                current_text = [text]
                current_end = end
                continue

            if speaker == current_speaker:
                current_text.append(text)
                current_end = end
            else:
                turns.append(
                    SpeakerTurn(
                        speaker=current_speaker,
                        start_ms=int(current_start or 0),
                        end_ms=int(current_end or (current_start or 0)),
                        text=" ".join(current_text).strip(),
                    )
                )
                current_speaker = speaker
                current_start = start
                current_end = end
                current_text = [text]

        if current_speaker is not None:
            turns.append(
                SpeakerTurn(
                    speaker=current_speaker,
                    start_ms=int(current_start or 0),
                    end_ms=int(current_end or (current_start or 0)),
                    text=" ".join(current_text).strip(),
                )
            )

    return turns


def _format_ms(ms: int) -> str:
    s = max(0, int(ms // 1000))
    hh = s // 3600
    mm = (s % 3600) // 60
    ss = s % 60
    return f"{hh:02d}:{mm:02d}:{ss:02d}"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Speaker diarization using AssemblyAI")
    parser.add_argument("--input", "-i", required=True, help="Path to local audio file (e.g., test.mp3)")
    parser.add_argument("--output", "-o", help="Path to output .txt file (prints to stdout if not provided)")
    parser.add_argument("--start", "-s", type=int, default=0, help="Start time in minutes (default: 0)")
    parser.add_argument("--duration", "-d", type=int, help="Duration in minutes (default: entire file)")
    args = parser.parse_args()

    turns = diarize_audio_file(args.input, start_minutes=args.start, duration_minutes=args.duration)
    
    # Format the output
    lines = []
    for t in turns:
        lines.append(f"[{_format_ms(t.start_ms)} - {_format_ms(t.end_ms)}] {t.speaker}: {t.text}")
    
    output_text = "\n".join(lines)
    
    if args.output:
        output_path = Path(args.output).expanduser().resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output_text, encoding="utf-8")
        print(f"Diarized transcript written to: {output_path}")
    else:
        print(output_text)


