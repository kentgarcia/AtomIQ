/**
 * Plays one sound effect when it mounts (docs/SFX_SPEC.md §6) and renders nothing. Mount it only for
 * the moment the sound belongs to: `{latest ? <SfxOnMount cue="lesson.bubble" /> : null}`. With
 * `delay` it plays that many ms later (cancelled if it unmounts first), for a cue that belongs to a
 * point on an animation's own clock.
 */
import { useEffect } from "react";

import { playSfx, type PlayOptions, type SfxCue } from "@/services/sfx";

export function SfxOnMount({ cue, delay = 0, options, ...flat }: { cue: SfxCue; delay?: number; options?: PlayOptions } & PlayOptions) {
  const volume = options?.volume ?? flat.volume;
  const rate = options?.rate ?? flat.rate;
  const index = options?.index ?? flat.index;
  useEffect(() => {
    if (delay <= 0) {
      void playSfx(cue, { volume, rate, index });
      return;
    }
    const id = setTimeout(() => void playSfx(cue, { volume, rate, index }), delay);
    return () => clearTimeout(id);
  }, [cue, delay, volume, rate, index]);
  return null;
}
