#!/usr/bin/env node
/**
 * Generate expressive character voice lines for AtomIQ using Gemini 3.8 Flash TTS
 * and Voice Design (`POST /v1beta/voices` + `POST /v1beta/interactions`).
 *
 * By default, all pending lines for a character are combined into ONE API request
 * (separated by `<long pause> <long pause>`) and split into individual normalized
 * clips using `ffmpeg` silence detection — ideal for Gemini Free Tier rate limits.
 *
 * Usage:
 *   node --no-warnings scripts/generate-voices.mjs design [--only hal,ada] [--redesign]
 *   node --no-warnings scripts/generate-voices.mjs generate [--only hal,ada] [--lines meet,quirk]
 *   node --no-warnings scripts/generate-voices.mjs generate --no-batch   # one request per line
 *   node --no-warnings scripts/generate-voices.mjs generate --format m4a # compact AAC .m4a
 *   node --no-warnings scripts/generate-voices.mjs generate --dry-run    # validate offline
 *   node --no-warnings scripts/generate-voices.mjs list                  # list stored voices
 */

import { Buffer } from "node:buffer";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CAST_PATH = path.join(ROOT, "tools", "voices", "cast.json");
const VOICES_STATE_PATH = path.join(ROOT, "tools", "voices", "voices.local.json");
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/* ------------------------------------------------------------------ */
/* Env loading (.env / .env.local, never overriding exported env)     */
/* ------------------------------------------------------------------ */

function loadDotEnv() {
  for (const name of [".env.local", ".env"]) {
    const filePath = path.join(ROOT, name);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

/* ------------------------------------------------------------------ */
/* CLI args                                                           */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const opts = {
    command: "generate",
    only: null,
    lines: null,
    format: "wav", // "wav" (16-bit mono 44.1kHz normalized) | "m4a" | "raw"
    dryRun: false,
    force: false,
    redesign: false,
    noNormalize: false,
    batch: true,
    keepBatch: false,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--force") opts.force = true;
    else if (arg === "--redesign") opts.redesign = true;
    else if (arg === "--no-normalize") opts.noNormalize = true;
    else if (arg === "--no-batch") opts.batch = false;
    else if (arg === "--batch") opts.batch = true;
    else if (arg === "--keep-batch") opts.keepBatch = true;
    else if (arg === "--only") opts.only = new Set(String(argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    else if (arg === "--lines") opts.lines = new Set(String(argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    else if (arg === "--format") opts.format = String(argv[++i] ?? "wav").toLowerCase();
    else if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional[0]) opts.command = positional[0];
  if (!["design", "generate", "list"].includes(opts.command)) {
    throw new Error(`Unknown command "${opts.command}". Use: design | generate | list`);
  }
  if (!["wav", "m4a", "raw"].includes(opts.format)) {
    throw new Error(`Unsupported --format "${opts.format}". Use: wav | m4a | raw`);
  }
  return opts;
}

function printUsage() {
  console.log(`Usage: node scripts/generate-voices.mjs <design|generate|list> [flags]

Commands:
  design     Create persistent custom voices via Gemini Voice Design & save audition previews
  generate   Synthesize voice lines from tools/voices/cast.json (batched 1 request per character)
  list       List custom prompted voices stored in your Gemini API project

Flags:
  --only <ids>      Comma-separated character ids (e.g. --only hal,ada,shrodi)
  --lines <ids>     Comma-separated line ids (e.g. --lines meet,quirk)
  --format <fmt>    Output format: wav (44.1kHz 16-bit mono, default), m4a (compact AAC), raw
  --no-batch        Send 1 API request per line instead of combining per character
  --keep-batch      Also keep the combined per-character batch WAV alongside split clips
  --force           Overwrite existing audio files
  --redesign        Recreate stored voice persona even if one already exists in voices.local.json
  --no-normalize    Skip ffmpeg loudness normalization (for --format wav/m4a)
  --dry-run         Validate manifest and preview planned API calls without calling Gemini`);
}

/* ------------------------------------------------------------------ */
/* Manifest & local voice-id state                                    */
/* ------------------------------------------------------------------ */

function loadCast() {
  const cast = JSON.parse(fs.readFileSync(CAST_PATH, "utf8"));
  if (!cast.model || !Array.isArray(cast.characters) || cast.characters.length === 0) {
    throw new Error("tools/voices/cast.json is missing model or characters");
  }
  const seen = new Set();
  for (const ch of cast.characters) {
    if (!ch.id || !ch.displayName || !ch.voicePrompt) {
      throw new Error(`Character entry missing required fields: ${JSON.stringify(ch)}`);
    }
    if (seen.has(ch.id)) throw new Error(`Duplicate character id in cast.json: ${ch.id}`);
    seen.add(ch.id);
    if (!["male", "female", "neutral"].includes(ch.gender)) {
      throw new Error(`Invalid gender "${ch.gender}" for ${ch.id}`);
    }
    if (!Array.isArray(ch.lines) || ch.lines.length === 0) {
      throw new Error(`Character ${ch.id} has no lines`);
    }
  }
  return cast;
}

function loadVoiceState() {
  if (!fs.existsSync(VOICES_STATE_PATH)) return { model: null, voices: {} };
  return JSON.parse(fs.readFileSync(VOICES_STATE_PATH, "utf8"));
}

function saveVoiceState(state) {
  fs.mkdirSync(path.dirname(VOICES_STATE_PATH), { recursive: true });
  fs.writeFileSync(VOICES_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/* ------------------------------------------------------------------ */
/* Audio helpers & silence-based batch splitting                      */
/* ------------------------------------------------------------------ */

let cachedFfmpeg = null;
function hasFfmpeg() {
  if (cachedFfmpeg !== null) return cachedFfmpeg;
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    cachedFfmpeg = true;
  } catch {
    cachedFfmpeg = false;
  }
  return cachedFfmpeg;
}

function probeDurationSec(wavPath) {
  const res = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", wavPath],
    { encoding: "utf8" },
  );
  if (res.status === 0) {
    const val = Number(res.stdout.trim());
    if (Number.isFinite(val) && val > 0) return val;
  }
  // Fallback: compute from WAV header size if ffprobe is absent
  const buf = fs.readFileSync(wavPath);
  const byteRate = buf.readUInt32LE(28) || 48000;
  return Math.max(0, (buf.length - 44) / byteRate);
}

function detectSilences(wavPath, noiseDb, minDurationSec) {
  const res = spawnSync(
    "ffmpeg",
    ["-i", wavPath, "-af", `silencedetect=noise=${noiseDb}dB:d=${minDurationSec}`, "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const stderr = res.stderr || "";
  const silences = [];
  let currentStart = null;
  for (const line of stderr.split(/\r?\n/)) {
    const startMatch = line.match(/silence_start:\s*([0-9.]+)/);
    if (startMatch) {
      currentStart = Number(startMatch[1]);
      continue;
    }
    const endMatch = line.match(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/);
    if (endMatch) {
      const end = Number(endMatch[1]);
      const duration = Number(endMatch[2]);
      const start = currentStart !== null ? currentStart : Math.max(0, end - duration);
      silences.push({ start, end, duration, mid: (start + end) / 2 });
      currentStart = null;
    }
  }
  return silences;
}

function findSplitPoints(wavPath, expectedCount) {
  const totalSec = probeDurationSec(wavPath);
  const neededGaps = expectedCount - 1;
  if (neededGaps <= 0) return [];

  // Try strict silence thresholds first, then progressively relax if pauses were shorter
  const passes = [
    { noiseDb: -38, minDur: 0.45 },
    { noiseDb: -34, minDur: 0.32 },
    { noiseDb: -30, minDur: 0.22 },
  ];

  for (const { noiseDb, minDur } of passes) {
    const internal = detectSilences(wavPath, noiseDb, minDur).filter(
      (s) => s.start > 0.35 && s.end < totalSec - 0.35,
    );
    if (internal.length < neededGaps) continue;

    // Pick the N-1 longest internal silences and order chronologically
    const chosen = [...internal]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, neededGaps)
      .sort((a, b) => a.mid - b.mid);

    // Ensure every resulting clip has plausible length (>= 0.45s)
    const bounds = [0, ...chosen.map((s) => s.mid), totalSec];
    const valid = bounds.every((b, idx) => idx === 0 || b - bounds[idx - 1] >= 0.45);
    if (valid) return chosen.map((s) => s.mid);
  }
  return null;
}

function encodeAudioSegment(inputWavPath, outPath, { format, noNormalize, startSec, endSec }) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const inputArgs = [];
  if (startSec !== undefined) inputArgs.push("-ss", startSec.toFixed(3));
  if (endSec !== undefined) inputArgs.push("-to", endSec.toFixed(3));
  inputArgs.push("-i", inputWavPath);

  const filterParts = [];
  if (startSec !== undefined || endSec !== undefined) {
    // Gently trim excess leading/trailing silence from split segments while keeping natural breath room
    filterParts.push(
      "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-42dB",
      "areverse",
      "silenceremove=start_periods=1:start_silence=0.08:start_threshold=-42dB",
      "areverse",
    );
  }
  if (!noNormalize && format !== "raw") {
    filterParts.push("loudnorm=I=-16:TP=-1.5:LRA=11");
  }

  const filterArgs = filterParts.length > 0 ? ["-af", filterParts.join(",")] : [];
  if (format === "raw") {
    execFileSync("ffmpeg", ["-y", ...inputArgs, ...filterArgs, "-c:a", "pcm_s16le", outPath], { stdio: "ignore" });
  } else if (format === "wav") {
    execFileSync(
      "ffmpeg",
      ["-y", ...inputArgs, ...filterArgs, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", "-map_metadata", "-1", outPath],
      { stdio: "ignore" },
    );
  } else if (format === "m4a") {
    execFileSync(
      "ffmpeg",
      ["-y", ...inputArgs, ...filterArgs, "-ac", "1", "-ar", "44100", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", outPath],
      { stdio: "ignore" },
    );
  }
}

function writeAudioBuffer(rawWavBuffer, outPath, opts) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (opts.format === "raw" || !hasFfmpeg()) {
    if (opts.format === "m4a" && !hasFfmpeg()) {
      throw new Error("ffmpeg is required for --format m4a");
    }
    fs.writeFileSync(outPath, rawWavBuffer);
    return;
  }
  const tmpRaw = `${outPath}.raw.wav`;
  fs.writeFileSync(tmpRaw, rawWavBuffer);
  try {
    encodeAudioSegment(tmpRaw, outPath, opts);
  } finally {
    if (fs.existsSync(tmpRaw)) fs.unlinkSync(tmpRaw);
  }
}

/* ------------------------------------------------------------------ */
/* Gemini REST API calls (with automatic 429/503 retry backoff)       */
/* ------------------------------------------------------------------ */

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryMs(res, detail, attempt) {
  const retryHeader = res.headers.get("retry-after");
  if (retryHeader) {
    const secs = Number(retryHeader);
    if (Number.isFinite(secs) && secs > 0) return Math.ceil((secs + 1) * 1000);
  }
  const match = String(detail || "").match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  if (match) return Math.ceil((Number(match[1]) + 2) * 1000);
  return Math.min(65000, 22000 * (attempt + 1));
}

async function geminiRequest(endpoint, { method = "GET", body, apiKey }) {
  const maxRetries = 4;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        "x-goog-api-key": apiKey,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // Keep raw text for error reporting below
    }

    if (res.ok) return json;

    const detail = json?.error?.message || text || res.statusText;
    if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
      const waitMs = parseRetryMs(res, detail, attempt);
      console.log(`  [rate-limit] HTTP ${res.status}, waiting ${Math.ceil(waitMs / 1000)}s before retry ${attempt + 1}/${maxRetries}...`);
      await sleep(waitMs);
      continue;
    }
    throw new Error(`Gemini API ${method} ${endpoint} failed (${res.status}): ${detail}`);
  }
}

async function createDesignedVoice(model, character, apiKey) {
  const payload = {
    store: true,
    voice: {
      model,
      type: "prompted",
      display_name: character.displayName,
      gender: character.gender,
      language_code: character.languageCode || "en-US",
      prompted: {
        input: character.voicePrompt,
      },
    },
  };

  const data = await geminiRequest("/voices", { method: "POST", body: payload, apiKey });
  const id = data?.id || data?.voice?.id;
  if (!id) {
    throw new Error(`Voice creation returned no voice ID for ${character.id}. Keys: ${Object.keys(data || {}).join(", ")}`);
  }
  const previewBase64 = data?.sample_audio?.data || data?.voice?.sample_audio?.data || null;
  return { id, previewBase64 };
}

function extractAudioBase64(interaction) {
  if (interaction?.output_audio?.data) return interaction.output_audio.data;
  if (Array.isArray(interaction?.steps)) {
    for (let i = interaction.steps.length - 1; i >= 0; i--) {
      const step = interaction.steps[i];
      if (step?.type !== "model_output" || !Array.isArray(step.content)) continue;
      for (let j = step.content.length - 1; j >= 0; j--) {
        const part = step.content[j];
        if (part?.type === "audio" && part.data) return part.data;
      }
    }
  }
  if (Array.isArray(interaction?.outputs)) {
    for (let i = interaction.outputs.length - 1; i >= 0; i--) {
      const part = interaction.outputs[i];
      if (part?.type === "audio" && part.data) return part.data;
    }
  }
  return null;
}

async function synthesizeTurns({ model, voiceId, turns, apiKey }) {
  const payload = {
    model,
    input: [
      {
        type: "user_input",
        content: turns.map((turn, idx) => ({
          type: "text",
          text: idx < turns.length - 1 ? `${turn.text} <long pause> <long pause>` : turn.text,
          annotations: [
            {
              type: "speech_metadata",
              style: turn.style,
            },
          ],
        })),
      },
    ],
    response_format: { type: "audio" },
    generation_config: {
      speech_config: [{ voice: voiceId }],
    },
  };

  const interaction = await geminiRequest("/interactions", { method: "POST", body: payload, apiKey });
  const base64 = extractAudioBase64(interaction);
  if (!base64) {
    throw new Error(`No audio data returned by /interactions. Top-level keys: ${Object.keys(interaction || {}).join(", ")}`);
  }
  return Buffer.from(base64, "base64");
}

/* ------------------------------------------------------------------ */
/* Commands                                                           */
/* ------------------------------------------------------------------ */

function selectCharacters(cast, only) {
  if (!only || only.size === 0) return cast.characters;
  const matched = cast.characters.filter((c) => only.has(c.id) || only.has(c.npcId));
  if (matched.length === 0) {
    const valid = cast.characters.map((c) => c.id).join(", ");
    throw new Error(`No matching characters for --only. Valid ids: ${valid}`);
  }
  return matched;
}

async function runDesign(cast, opts, apiKey) {
  const state = loadVoiceState();
  state.model = cast.model;
  const targets = selectCharacters(cast, opts.only);
  const auditionDir = path.join(ROOT, cast.outputDir, "audition");

  for (const ch of targets) {
    const existing = state.voices[ch.id];
    if (existing?.voiceId && !opts.redesign) {
      console.log(`[skip] ${ch.name} already designed (${existing.voiceId}). Pass --redesign to recreate.`);
      continue;
    }

    const previewPath = path.join(auditionDir, `${ch.id}-preview.${opts.format === "m4a" ? "m4a" : "wav"}`);
    if (opts.dryRun) {
      console.log(`[dry-run] design ${ch.name} (${ch.gender}, ${ch.languageCode}) -> ${path.relative(ROOT, previewPath)}`);
      continue;
    }

    console.log(`[design] Creating custom voice for ${ch.name} (${ch.role})...`);
    const { id, previewBase64 } = await createDesignedVoice(cast.model, ch, apiKey);
    state.voices[ch.id] = {
      voiceId: id,
      displayName: ch.displayName,
      gender: ch.gender,
      languageCode: ch.languageCode,
      createdAt: new Date().toISOString(),
    };
    saveVoiceState(state);

    if (previewBase64) {
      writeAudioBuffer(Buffer.from(previewBase64, "base64"), previewPath, opts);
      console.log(`  -> ${id} (preview saved to ${path.relative(ROOT, previewPath)})`);
    } else {
      console.log(`  -> ${id}`);
    }
  }
}

async function runGenerate(cast, opts, apiKey) {
  const targets = selectCharacters(cast, opts.only);
  const state = loadVoiceState();

  // Auto-design any missing character voices first
  const missing = targets.filter((ch) => !state.voices[ch.id]?.voiceId);
  if (missing.length > 0) {
    if (opts.dryRun) {
      for (const ch of missing) {
        console.log(`[dry-run] would design voice for ${ch.name} first (not in voices.local.json)`);
      }
    } else {
      await runDesign(cast, { ...opts, only: new Set(missing.map((c) => c.id)) }, apiKey);
    }
  }

  const latestState = loadVoiceState();
  const ext = opts.format === "m4a" ? "m4a" : "wav";
  let requestCount = 0;
  let clipCount = 0;

  for (const ch of targets) {
    const voiceId = latestState.voices[ch.id]?.voiceId || `<pending:${ch.id}>`;
    const selectedLines = opts.lines ? ch.lines.filter((l) => opts.lines.has(l.id)) : ch.lines;
    const pending = [];

    for (const line of selectedLines) {
      const outPath = path.join(ROOT, cast.outputDir, ch.id, `${line.id}.${ext}`);
      if (!opts.force && !opts.dryRun && fs.existsSync(outPath)) {
        console.log(`[skip] ${path.relative(ROOT, outPath)} already exists (use --force to overwrite)`);
        continue;
      }
      pending.push({
        id: line.id,
        text: line.text,
        style: line.style || ch.defaultStyle,
        outPath,
      });
    }

    if (pending.length === 0) continue;

    const useBatch = opts.batch && pending.length > 1 && hasFfmpeg();
    if (useBatch) {
      requestCount++;
      const lineNames = pending.map((p) => p.id).join(", ");
      if (opts.dryRun) {
        console.log(`[dry-run] batch ${ch.name} (${voiceId}) -> 1 request for ${pending.length} lines [${lineNames}]`);
        for (const p of pending) {
          console.log(`          ${p.id} -> ${path.relative(ROOT, p.outPath)} | style: "${p.style}"`);
        }
        clipCount += pending.length;
        continue;
      }

      console.log(`[batch] ${ch.name}: synthesizing ${pending.length} lines [${lineNames}] in 1 request...`);
      const batchBuf = await synthesizeTurns({
        model: cast.model,
        voiceId,
        turns: pending,
        apiKey,
      });

      const charDir = path.join(ROOT, cast.outputDir, ch.id);
      fs.mkdirSync(charDir, { recursive: true });
      const batchPath = path.join(charDir, "_batch.wav");
      fs.writeFileSync(batchPath, batchBuf);

      const splits = findSplitPoints(batchPath, pending.length);
      if (!splits) {
        console.warn(`  [warn] Could not cleanly detect ${pending.length - 1} pause boundaries in ${path.relative(ROOT, batchPath)}; keeping combined file for manual review.`);
        continue;
      }

      const totalSec = probeDurationSec(batchPath);
      const bounds = [0, ...splits, totalSec];
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        encodeAudioSegment(batchPath, item.outPath, {
          ...opts,
          startSec: bounds[i],
          endSec: bounds[i + 1],
        });
        const dur = probeDurationSec(item.outPath).toFixed(2);
        const kb = (fs.statSync(item.outPath).size / 1024).toFixed(1);
        console.log(`  -> ${path.relative(ROOT, item.outPath)} (${dur}s, ${kb} KB)`);
        clipCount++;
      }

      if (!opts.keepBatch && fs.existsSync(batchPath)) {
        fs.unlinkSync(batchPath);
      }
    } else {
      for (const item of pending) {
        requestCount++;
        clipCount++;
        const relOut = path.relative(ROOT, item.outPath);
        if (opts.dryRun) {
          console.log(`[dry-run] ${ch.id}/${item.id} (${voiceId}) -> ${relOut}`);
          continue;
        }
        console.log(`[synth] ${ch.name} / ${item.id} -> ${relOut}`);
        const wavBuf = await synthesizeTurns({
          model: cast.model,
          voiceId,
          turns: [item],
          apiKey,
        });
        writeAudioBuffer(wavBuf, item.outPath, opts);
        const dur = probeDurationSec(item.outPath).toFixed(2);
        const kb = (fs.statSync(item.outPath).size / 1024).toFixed(1);
        console.log(`  -> ${relOut} (${dur}s, ${kb} KB)`);
      }
    }
  }

  console.log(
    opts.dryRun
      ? `\nDry run complete: ${clipCount} lines in ${requestCount} API request(s) across ${targets.length} character(s).`
      : `\nDone: generated ${clipCount} voice clip(s) using ${requestCount} API request(s).`,
  );
}

async function runList(apiKey) {
  const data = await geminiRequest("/voices?type=prompted", { apiKey });
  const voices = data?.voices || [];
  if (voices.length === 0) {
    console.log("No stored prompted voices found in this Gemini project.");
    return;
  }
  for (const v of voices) {
    console.log(`${v.id}\t${v.display_name || "(unnamed)"}\t${v.gender || "-"}\t${v.language_code || "-"}`);
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  loadDotEnv();
  const opts = parseArgs(process.argv.slice(2));
  const cast = loadCast();

  const apiKey = process.env.GEMINI_API_KEY?.trim() || "";
  if (!opts.dryRun && !apiKey) {
    console.error("Missing GEMINI_API_KEY.");
    console.error('Add GEMINI_API_KEY="your-key" to a local .env file (already gitignored) or export it in your shell.');
    process.exit(1);
  }

  if (opts.command === "design") await runDesign(cast, opts, apiKey);
  else if (opts.command === "generate") await runGenerate(cast, opts, apiKey);
  else if (opts.command === "list") await runList(apiKey);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
