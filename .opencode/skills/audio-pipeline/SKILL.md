---
name: audio-pipeline
description: Use when generating or regenerating word audio. One consistent UK voice, deterministic output, committed to the repo, and loudness-normalised for an iPad speaker.
license: MIT
compatibility: opencode
metadata:
  stage: content
---

# Word audio

A spelling bee needs the same pronunciation every time, on every device, offline.
So the audio is generated once, committed, and never synthesised at runtime for
built-in words.

## Voice

- **piper** (local, offline, no per-word cost), one UK English female model,
  pinned by filename in `scripts/audio/voice.txt` so a regeneration is
  byte-comparable.
- Browser `speechSynthesis` is **fallback only**, for pasted-in words that have no
  file. Different voice per device is acceptable there; it is not acceptable for
  the built-in decks.

## Generation

```
scripts/audio/generate.sh          # regenerates everything missing
scripts/audio/generate.sh bike     # one word
```

Per word:

1. piper → raw wav
2. ffmpeg → mono, 22.05 kHz, `loudnorm` to −16 LUFS (iPad speaker, no clipping)
3. mp3 at 64 kbps → `public/audio/<word>.mp3`
4. append to `public/audio/manifest.json` with a content hash

The hash means a regeneration that produces identical audio produces an
identical commit, and a word whose text changed is visibly regenerated.

## Rules

- Audio filenames are the lowercased word with spaces as `-`. No paths, no ids.
- Never commit raw wavs — only the mp3s and the manifest.
- A word with no audio file must degrade to `speechSynthesis` and show no error
  (AC14). Test that path; don't assume it.
- Regeneration is a separate commit from code, message `chore(audio): regenerate
<unit> deck`, so a diff shows exactly which sounds changed.
