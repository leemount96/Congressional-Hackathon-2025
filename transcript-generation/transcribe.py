from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from dotenv import load_dotenv
from typing import List, Optional

from openai import OpenAI

load_dotenv()


def _resolve_output_path(input_audio_path: str, output_text_path: Optional[str]) -> Path:
    input_path = Path(input_audio_path).expanduser().resolve()
    if output_text_path:
        return Path(output_text_path).expanduser().resolve()
    return input_path.with_suffix(".txt")


def transcribe_to_text_file(
    input_audio_path: str,
    output_text_path: Optional[str] = None,
    *,
    model: str = "whisper-1",
    prompt: Optional[str] = None,
    temperature: float = 0.0,
    language: Optional[str] = None,
    enable_chunking: bool = True,
    target_chunk_seconds: int = 600,
    max_chunk_bytes: int = 20 * 1024 * 1024,
) -> Path:
    """
    Transcribe an audio file using OpenAI Whisper and write the transcript to a text file.

    Returns the path to the written text file.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set in the environment.")

    input_path = Path(input_audio_path).expanduser().resolve()
    if not input_path.exists():
        raise FileNotFoundError(f"Audio file not found: {input_path}")

    out_path = _resolve_output_path(str(input_path), output_text_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    client = OpenAI(api_key=api_key)

    # If chunking is enabled or file looks large, chunk first
    if enable_chunking and _is_large_file(input_path, max_chunk_bytes):
        transcript = _transcribe_in_chunks(
            client=client,
            input_path=input_path,
            model=model,
            prompt=prompt,
            temperature=temperature,
            language=language,
            target_chunk_seconds=target_chunk_seconds,
            max_chunk_bytes=max_chunk_bytes,
        )
        out_path.write_text(transcript, encoding="utf-8")
        return out_path
    else:
        with input_path.open("rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                model=model,
                file=audio_file,
                prompt=prompt,
                temperature=temperature,
                language=language,
            )
        text = getattr(transcription, "text", None)
        if text is None:
            text = getattr(transcription, "data", None) or str(transcription)
        out_path.write_text(text, encoding="utf-8")
        return out_path


def _is_large_file(path: Path, threshold_bytes: int) -> bool:
    try:
        return path.stat().st_size > threshold_bytes
    except OSError:
        return False


def _ffmpeg_exists() -> bool:
    return shutil.which("ffmpeg") is not None


def _split_audio_with_ffmpeg(
    input_path: Path,
    target_chunk_seconds: int,
    temp_dir: Path,
) -> List[Path]:
    if not _ffmpeg_exists():
        raise RuntimeError("ffmpeg is required for chunked transcription but was not found in PATH.")

    # Create a segment pattern
    chunk_pattern = temp_dir / "chunk_%04d.mp3"

    # Use stream copy when possible; if containers/codecs complicate, re-encode to mp3
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(input_path),
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "64k",
        "-f",
        "segment",
        "-segment_time",
        str(target_chunk_seconds),
        str(chunk_pattern),
    ]

    subprocess.run(cmd, check=True)

    chunks = sorted(temp_dir.glob("chunk_*.mp3"))
    if not chunks:
        raise RuntimeError("ffmpeg did not produce any chunks.")
    return chunks


def _shrink_chunks_if_needed(chunks: List[Path], max_chunk_bytes: int, temp_dir: Path) -> List[Path]:
    """
    Ensure each chunk is under max_bytes by re-encoding to a lower bitrate if needed.
    """
    safe_chunks: List[Path] = []
    for idx, chunk in enumerate(chunks):
        if chunk.stat().st_size <= max_chunk_bytes:
            safe_chunks.append(chunk)
            continue

        if not _ffmpeg_exists():
            raise RuntimeError("ffmpeg is required to shrink large chunks but is not available.")

        shrunk = temp_dir / f"chunk_shrunk_{idx:04d}.mp3"
        cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(chunk),
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "48k",
            str(shrunk),
        ]
        subprocess.run(cmd, check=True)
        safe_chunks.append(shrunk if shrunk.exists() else chunk)
    return safe_chunks


def _transcribe_file(client: OpenAI, path: Path, *, model: str, prompt: Optional[str], temperature: float, language: Optional[str]) -> str:
    with path.open("rb") as audio_file:
        result = client.audio.transcriptions.create(
            model=model,
            file=audio_file,
            prompt=prompt,
            temperature=temperature,
            language=language,
        )
    text = getattr(result, "text", None)
    if text is None:
        text = getattr(result, "data", None) or str(result)
    return text


def _transcribe_in_chunks(
    client: OpenAI,
    input_path: Path,
    *,
    model: str,
    prompt: Optional[str],
    temperature: float,
    language: Optional[str],
    target_chunk_seconds: int,
    max_chunk_bytes: int,
) -> str:
    transcript_parts: List[str] = []
    with tempfile.TemporaryDirectory() as td:
        temp_dir = Path(td)
        raw_chunks = _split_audio_with_ffmpeg(
            input_path=input_path,
            target_chunk_seconds=target_chunk_seconds,
            temp_dir=temp_dir,
        )
        chunks = _shrink_chunks_if_needed(raw_chunks, max_chunk_bytes=max_chunk_bytes, temp_dir=temp_dir)

        for idx, chunk in enumerate(chunks):
            piece = _transcribe_file(
                client=client,
                path=chunk,
                model=model,
                prompt=prompt,
                temperature=temperature,
                language=language,
            )
            transcript_parts.append(piece.strip())

    return "\n\n".join(transcript_parts)


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Transcribe an audio file to a .txt using OpenAI Whisper",
    )
    parser.add_argument(
        "--input",
        "-i",
        required=True,
        help="Path to the input audio file (mp3, m4a, wav, etc.)",
    )
    parser.add_argument(
        "--out",
        "-o",
        help="Path to the output .txt file (defaults to input basename with .txt)",
    )
    parser.add_argument(
        "--model",
        default="whisper-1",
        help="OpenAI model to use (default: whisper-1)",
    )
    parser.add_argument(
        "--prompt",
        help="Optional prompt to guide transcription",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.0,
        help="Sampling temperature (default: 0.0)",
    )
    parser.add_argument(
        "--language",
        help="Optional ISO language code for the audio (e.g., 'en')",
    )
    parser.add_argument(
        "--no-chunk",
        action="store_true",
        help="Disable chunking (by default chunking is enabled for large files)",
    )
    parser.add_argument(
        "--chunk-seconds",
        type=int,
        default=600,
        help="Target length of each chunk in seconds (default: 600 = 10min)",
    )
    parser.add_argument(
        "--max-chunk-mb",
        type=int,
        default=20,
        help="Max size per chunk in MB (default: 20MB)",
    )
    return parser


def main() -> None:
    parser = _build_arg_parser()
    args = parser.parse_args()

    output_path = transcribe_to_text_file(
        input_audio_path=args.input,
        output_text_path=args.out,
        model=args.model,
        prompt=args.prompt,
        temperature=args.temperature,
        language=args.language,
        enable_chunking=not args.no_chunk,
        target_chunk_seconds=args.chunk_seconds,
        max_chunk_bytes=args.max_chunk_mb * 1024 * 1024,
    )

    print(str(output_path))


if __name__ == "__main__":
    main()


