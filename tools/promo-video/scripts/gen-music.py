#!/usr/bin/env python3
"""
Synthesizes a crisp, joyful, original, license-free 124 BPM playful marimba +
plucked bass + soft shaker 30-second instrumental loop for the AtomIQ promo video.
Writes: tools/promo-video/public/audio/bgm-124bpm.wav (48 kHz, stereo, 16-bit PCM).
"""
import math
import os
import struct
import wave

SR = 48000
DURATION = 30.0
N_SAMPLES = int(SR * DURATION)
BPM = 124.0
BEAT_S = 60.0 / BPM
STEP_S = BEAT_S / 2.0  # 8th-note grid

# Deterministic LCG for soft shaker noise (zero randomness across runs)
def make_noise(length, seed=1337):
    state = seed
    out = [0.0] * length
    for i in range(length):
        state = (1103515245 * state + 12345) & 0x7FFFFFFF
        out[i] = (state / 0x3FFFFFFF) - 1.0
    return out

def midi_to_hz(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))

def add_marimba(buf_l, buf_r, start_s, midi, dur_s, amp, pan=0.0):
    """Warm wooden marimba tone: fundamental + 4th harmonic (classic marimba bar tuning) + soft mallet click."""
    f = midi_to_hz(midi)
    i0 = int(start_s * SR)
    n = min(int(dur_s * SR), N_SAMPLES - i0)
    if n <= 0 or i0 < 0:
        return
    gl = math.cos((pan + 1.0) * math.pi * 0.25)
    gr = math.sin((pan + 1.0) * math.pi * 0.25)
    w1 = 2.0 * math.pi * f / SR
    w2 = 2.0 * math.pi * (f * 3.98) / SR  # marimba bar 2nd mode ~ 4x
    w3 = 2.0 * math.pi * (f * 2.0) / SR   # subtle warmth
    for k in range(n):
        t = k / SR
        atk = min(1.0, t / 0.004)
        env1 = math.exp(-t * 7.2)
        env2 = math.exp(-t * 28.0)
        env3 = math.exp(-t * 14.0)
        val = (
            math.sin(w1 * k) * env1
            + 0.22 * math.sin(w2 * k) * env2
            + 0.14 * math.sin(w3 * k) * env3
        ) * atk * amp
        idx = i0 + k
        buf_l[idx] += val * gl
        buf_r[idx] += val * gr

def add_pluck_bass(buf_l, buf_r, start_s, midi, dur_s, amp):
    """Clean, round plucked upright/synth bass."""
    f = midi_to_hz(midi)
    i0 = int(start_s * SR)
    n = min(int(dur_s * SR), N_SAMPLES - i0)
    if n <= 0 or i0 < 0:
        return
    w1 = 2.0 * math.pi * f / SR
    w2 = 2.0 * math.pi * (f * 2.0) / SR
    for k in range(n):
        t = k / SR
        atk = min(1.0, t / 0.006)
        env = math.exp(-t * 5.2)
        env2 = math.exp(-t * 16.0)
        val = (math.sin(w1 * k) * env + 0.35 * math.sin(w2 * k) * env2) * atk * amp
        idx = i0 + k
        buf_l[idx] += val * 0.71
        buf_r[idx] += val * 0.71

def add_kick(buf_l, buf_r, start_s, amp):
    """Soft playful pop kick (punchy pitch drop 130 -> 48 Hz)."""
    i0 = int(start_s * SR)
    n = min(int(0.14 * SR), N_SAMPLES - i0)
    if n <= 0 or i0 < 0:
        return
    phase = 0.0
    for k in range(n):
        t = k / SR
        freq = 48.0 + 86.0 * math.exp(-t * 36.0)
        phase += 2.0 * math.pi * freq / SR
        env = math.exp(-t * 22.0) * min(1.0, t / 0.002)
        val = math.sin(phase) * env * amp
        idx = i0 + k
        buf_l[idx] += val * 0.71
        buf_r[idx] += val * 0.71

def add_shaker(buf_l, buf_r, start_s, amp, noise, pan=0.0):
    """Crisp high-passed soft shaker / rim brush."""
    i0 = int(start_s * SR)
    n = min(int(0.055 * SR), N_SAMPLES - i0)
    if n <= 0 or i0 < 0:
        return
    gl = math.cos((pan + 1.0) * math.pi * 0.25)
    gr = math.sin((pan + 1.0) * math.pi * 0.25)
    prev = 0.0
    for k in range(n):
        t = k / SR
        env = math.exp(-t * 68.0) * min(1.0, t / 0.003)
        raw = noise[(i0 + k) % len(noise)]
        hp = raw - prev  # simple crisp high-pass
        prev = raw
        val = hp * env * amp
        idx = i0 + k
        buf_l[idx] += val * gl
        buf_r[idx] += val * gr

def add_bell_chord(buf_l, buf_r, start_s, notes, dur_s, amp):
    """Bright Duolingo-style warm chord shimmer for the final resolution."""
    for idx_n, m in enumerate(notes):
        pan = -0.35 + 0.7 * (idx_n / max(1, len(notes) - 1))
        add_marimba(buf_l, buf_r, start_s + idx_n * 0.025, m, dur_s, amp, pan=pan)

def main():
    buf_l = [0.0] * N_SAMPLES
    buf_r = [0.0] * N_SAMPLES
    noise = make_noise(SR * 2, seed=4242)

    # Bright C-major / F-major / G-major / Am playful 4-bar chord progression (16 steps per bar? 8 eighth-notes per bar)
    # 4 bars = 32 eighth-note steps (~7.74s per cycle)
    chords = [
        # Bar 0: C major (C5, E5, G5, A5) + bass C3
        (48, [72, 76, 79, 84, 79, 76, 79, 81]),
        # Bar 1: G major / B (G4, B4, D5, G5) + bass G2
        (43, [71, 74, 79, 83, 79, 74, 76, 79]),
        # Bar 2: A minor 7 (A4, C5, E5, G5) + bass A2
        (45, [72, 76, 79, 81, 79, 76, 72, 76]),
        # Bar 3: F major 9 -> G (F4, A4, C5, G5) + bass F2 -> G2
        (41, [69, 72, 77, 81, 79, 77, 74, 79]),
    ]

    # Play groove up to 27.3s (End card lockup starts at 27.3s!)
    step = 0
    while True:
        t = step * STEP_S
        if t >= 27.25:
            break
        bar = (step // 8) % 4
        in_bar = step % 8
        bass_root, arp = chords[bar]

        # Dynamic energy by film section
        # Hook (0-3.5): light & bouncy; Mid (3.5-25.5): full groove; Stamps (25.5-27.3): stripped pulse
        in_stamps = t >= 25.4
        in_hook = t < 3.45

        # Marimba melody (skip steps during rapid stamps so tick SFX pop cleanly)
        if not in_stamps:
            note = arp[in_bar]
            # Subtle rhythmic accent pattern
            accent = 1.0 if in_bar in (0, 3, 6) else 0.68
            pan = -0.28 if (step % 2 == 0) else 0.28
            add_marimba(buf_l, buf_r, t, note, 0.34, 0.20 * accent, pan=pan)
            # Playful high sparkle echo on beat 3.5 in active scenes
            if not in_hook and in_bar == 5:
                add_marimba(buf_l, buf_r, t, note + 12, 0.22, 0.08, pan=-pan)

        # Bass on beats 1 and 3 (steps 0 and 4), plus syncopated pickup on 7
        if in_bar == 0:
            add_pluck_bass(buf_l, buf_r, t, bass_root, 0.42, 0.25 if not in_stamps else 0.16)
        elif in_bar == 4 and not in_stamps:
            b2 = bass_root + 2 if bar == 3 else bass_root + 7
            add_pluck_bass(buf_l, buf_r, t, b2, 0.36, 0.20)
        elif in_bar == 6 and not in_hook and not in_stamps:
            add_pluck_bass(buf_l, buf_r, t, bass_root + 5, 0.24, 0.13)

        # Soft pop kick on beats 1 & 3 (steps 0, 4) after hook starts
        if not in_stamps and in_bar in (0, 4):
            add_kick(buf_l, buf_r, t, 0.22 if not in_hook else 0.14)

        # Shaker on off-beats (steps 2, 6, plus light 1, 5)
        if not in_stamps:
            if in_bar in (2, 6):
                add_shaker(buf_l, buf_r, t, 0.065, noise, pan=0.25 if in_bar == 2 else -0.25)
            elif not in_hook and in_bar in (1, 5):
                add_shaker(buf_l, buf_r, t, 0.025, noise, pan=-0.15)

        step += 1

    # Warm, joyful C-major9 chord shimmer on the End Card hero lockup (27.3s)
    add_pluck_bass(buf_l, buf_r, 27.30, 48, 1.8, 0.24)
    add_bell_chord(buf_l, buf_r, 27.30, [72, 76, 79, 83, 86], 2.2, 0.17)

    # Gentle fade-in (0.12s) and clean tail fade-out (29.2s -> 29.9s)
    fade_in = int(0.12 * SR)
    for i in range(fade_in):
        g = i / fade_in
        buf_l[i] *= g
        buf_r[i] *= g

    fade_start = int(29.2 * SR)
    fade_end = int(29.9 * SR)
    for i in range(fade_start, N_SAMPLES):
        g = max(0.0, 1.0 - (i - fade_start) / max(1, fade_end - fade_start))
        buf_l[i] *= g
        buf_r[i] *= g

    # Soft peak limit to ~ -3 dBFS (leaves headroom for mix-audio.mjs)
    peak = max(max(abs(x) for x in buf_l), max(abs(x) for x in buf_r), 1e-6)
    scale = 0.65 / peak

    out_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio', 'bgm-124bpm.wav')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with wave.open(out_path, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        frames = bytearray(N_SAMPLES * 4)
        for i in range(N_SAMPLES):
            l = max(-32767, min(32767, int(buf_l[i] * scale * 32767)))
            r = max(-32767, min(32767, int(buf_r[i] * scale * 32767)))
            struct.pack_into('<hh', frames, i * 4, l, r)
        wf.writeframes(frames)

    print(f'gen-music ok: wrote {out_path} ({DURATION:.1f}s @ {BPM:.0f} BPM, 48kHz stereo)')

if __name__ == '__main__':
    main()
