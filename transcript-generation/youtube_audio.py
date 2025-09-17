from __future__ import annotations

import os
import tempfile
from typing import Optional

from yt_dlp import YoutubeDL


def _build_ydl(output_dir: str, filename: Optional[str] = None) -> YoutubeDL:
    """
    Create a configured YoutubeDL instance to extract audio as MP3.
    """
    # Use a safe default filename when not provided
    final_basename = filename or "audio"

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(output_dir, f"{final_basename}.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
    }
    return YoutubeDL(ydl_opts)


def download_audio_to_file(youtube_url: str, output_path: str) -> str:
    """
    Download a YouTube video's audio as MP3 and save to output_path.

    - youtube_url: Full YouTube URL
    - output_path: Either a directory or a file path ending with .mp3

    Returns the absolute path of the saved MP3 file.
    """
    output_path = os.path.abspath(output_path)

    # Determine target directory and base file name
    if output_path.endswith(".mp3"):
        target_dir = os.path.dirname(output_path) or os.getcwd()
        base_name = os.path.splitext(os.path.basename(output_path))[0]
    else:
        target_dir = output_path
        base_name = "audio"

    os.makedirs(target_dir, exist_ok=True)

    with _build_ydl(target_dir, base_name) as ydl:
        info = ydl.extract_info(youtube_url, download=True)

    # yt-dlp writes to the filename we specified (with .mp3)
    final_file = os.path.join(target_dir, f"{base_name}.mp3")
    if not os.path.exists(final_file):
        # Fallback: try to derive from the title if template changed
        guessed = os.path.join(target_dir, f"{info.get('title', base_name)}.mp3")
        if os.path.exists(guessed):
            final_file = guessed
        else:
            raise FileNotFoundError("Expected MP3 file was not created by yt-dlp.")

    return os.path.abspath(final_file)


def download_audio_to_bytes(youtube_url: str) -> bytes:
    """
    Download a YouTube video's audio as MP3 and return it as bytes.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        with _build_ydl(tmpdir, "audio") as ydl:
            ydl.extract_info(youtube_url, download=True)

        mp3_path = os.path.join(tmpdir, "audio.mp3")
        if not os.path.exists(mp3_path):
            # If yt-dlp used a different name, locate the first mp3
            mp3_candidates = [
                os.path.join(tmpdir, name)
                for name in os.listdir(tmpdir)
                if name.lower().endswith(".mp3")
            ]
            if not mp3_candidates:
                raise FileNotFoundError("MP3 not found after download.")
            mp3_path = mp3_candidates[0]

        with open(mp3_path, "rb") as f:
            return f.read()

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Download YouTube audio")
    parser.add_argument("positional", nargs="*", help="Optionally provide URL and output path as positionals")
    parser.add_argument("--url", "-u", dest="url", type=str, help="YouTube URL")
    parser.add_argument("--output", "-o", dest="output", type=str, help="Output file path or directory")
    args = parser.parse_args()

    # Determine URL and output path from flags or positionals
    url: Optional[str] = args.url
    output: Optional[str] = args.output

    if (url is None or output is None) and len(args.positional) >= 2:
        url = url or args.positional[0]
        output = output or args.positional[1]

    if not url or not output:
        parser.error("Provide URL and output via --url/--output or as two positional args.")

    # Save directly to file path or directory
    saved_path = download_audio_to_file(url, output)
    print(saved_path)
