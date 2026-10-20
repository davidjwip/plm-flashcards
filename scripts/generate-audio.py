#!/usr/bin/env python3
"""Generate one UK-English audio file per word in the bank.

Run on the dev box (needs the edge-tts venv); output is committed, so the app
never calls a TTS service at runtime and every device hears the same voice.

    /home/hermesdev/.tts/bin/python scripts/generate-audio.py [--force] [--slow]

Requires ffmpeg for the loudness pass (apt install ffmpeg).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import pathlib
import subprocess
import sys
import tempfile

VOICE = "en-GB-SoniaNeural"
RATE = "-8%"           # slightly slower than conversational: phonics, not prose
LOUDNESS = "I=-14"     # a touch louder than standard -16 so small speakers carry

ROOT = pathlib.Path(__file__).resolve().parent.parent
BANK = ROOT / "data" / "wordbank.json"
OUT = ROOT / "public" / "audio"
MANIFEST = OUT / "manifest.json"


def normalise(raw: pathlib.Path, target: pathlib.Path) -> None:
    """Mono, 22.05 kHz, loudness-normalised mp3 — small and even in volume."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(raw),
            "-ac", "1", "-ar", "22050",
            "-af", f"loudnorm={LOUDNESS}:TP=-1.5:LRA=11",
            "-b:a", "64k", str(target),
        ],
        check=True,
    )


async def synth(word: str, target: pathlib.Path) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(word, VOICE, rate=RATE)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as handle:
        raw = pathlib.Path(handle.name)
    await communicate.save(str(raw))
    normalise(raw, target)
    raw.unlink(missing_ok=True)


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="regenerate existing files")
    args = parser.parse_args()

    bank = json.loads(BANK.read_text())
    words = [entry["word"] for entry in bank["words"]]
    OUT.mkdir(parents=True, exist_ok=True)

    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"voice": VOICE, "rate": RATE, "words": []}
    done = set(manifest["words"])

    if args.force:
        done = set()

    todo = [w for w in words if w not in done]
    print(f"{len(words)} words, {len(done)} already generated, {len(todo)} to do")

    for index, word in enumerate(todo, start=1):
        target = OUT / f"{word}.mp3"
        try:
            await synth(word, target)
        except Exception as error:  # noqa: BLE001 - report and keep going
            print(f"  FAILED {word}: {error}", file=sys.stderr)
            continue
        done.add(word)
        if index % 20 == 0 or index == len(todo):
            print(f"  {index}/{len(todo)} {word}")

    manifest = {
        "voice": VOICE,
        "rate": RATE,
        "words": sorted(done),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"manifest: {len(manifest['words'])} words, voice {VOICE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
