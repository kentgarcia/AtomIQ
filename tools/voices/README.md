# AtomIQ Voice Generation Pipeline

Generates custom-designed, acted character voice lines for AtomIQ's 8-character cast (`shrodi`, `hal`, `ada`, `ray`, `mina`, `kofi`, `tess`, `sage`) using **Gemini 3.8 Flash TTS** (`gemini-3.8-flash-tts`) and **Gemini Voice Design**.

## Setup

1. Put your Gemini API key in a local `.env` file at the repo root (already gitignored):

   ```sh
   GEMINI_API_KEY="your-gemini-api-key"
   ```

2. Validate everything offline first:

   ```sh
   node --no-warnings scripts/generate-voices.mjs generate --dry-run
   ```

## Workflow

1. **Design and audition the 8 custom voices** (saves reusable `voice_...` IDs in `tools/voices/voices.local.json` and preview clips in `assets/voices/audition/`):

   ```sh
   node --no-warnings scripts/generate-voices.mjs design
   ```

   To re-roll a character's voice after tweaking their `voicePrompt` in `tools/voices/cast.json`:

   ```sh
   node --no-warnings scripts/generate-voices.mjs design --redesign --only ada
   ```

2. **Generate voice lines** (combines all pending lines per character into **1 API request** separated by `<long pause> <long pause>`, then automatically splits and loudness-normalizes each clip into `assets/voices/<character>/<line>.wav`):

   ```sh
   node --no-warnings scripts/generate-voices.mjs generate
   ```

   Useful flags:
   - `--only hal,ada` — generate only specific characters
   - `--lines meet,quirk` — generate only specific line IDs
   - `--no-batch` — send 1 request per line instead of batching per character
   - `--keep-batch` — keep `assets/voices/<character>/_batch.wav` alongside split clips
   - `--format m4a` — export compact AAC `.m4a` instead of `.wav`
   - `--force` — overwrite existing audio files
   - `--dry-run` — preview without calling the API

3. **List stored voices** in your Gemini project:

   ```sh
   node --no-warnings scripts/generate-voices.mjs list
   ```
