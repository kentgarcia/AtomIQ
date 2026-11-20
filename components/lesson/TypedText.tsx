/**
 * Lesson text that types itself out (typewriter-core.ts) while `typing` is true, and is plain
 * glossary text (tappable terms) the rest of the time. Turning `typing` off finishes it at once, so
 * "Continue" never waits for the animation. The untyped tail is laid out but invisible, so the
 * bubble keeps its size and its line breaks while it types. Reduced motion: always finished.
 */

import { useEffect, useMemo, useState } from "react";
import type { StyleProp, TextStyle } from "react-native";
import { Text } from "@/components/ui/text";
import { useReducedMotion } from "react-native-reanimated";

import { plainText, splitTerms } from "@/content/curriculum/terms";

import { playSfx } from "@/services/sfx";
import { BLIP_EVERY, blipRate } from "@/services/sfx-core";

import { TermText, useCardStyles } from "./cards/shared";
import { clipSegments, totalChars, visibleCount } from "./typewriter-core";
import { useTheme } from "@/theme";

/** How often the typed length is refreshed, ms (the text is short; this keeps it smooth, not busy). */
const TICK_MS = 33;

/** The number of characters showing: counts up while `active`, the whole text otherwise. */
function useTypedCount(total: number, active: boolean, blips: boolean, startAt: number): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    // `startAt` ms from now: nothing shows until then (the text keeps its room)
    const start = Date.now() + startAt;
    let blipped = 0;
    const id = setInterval(() => {
      const n = visibleCount(Date.now() - start, total);
      // A soft blip for every third character shown (docs/features/SFX_SPEC.md §6.3); the cue's own gap
      // keeps a fast tick from stacking them. It stops with the typing: this interval is cleared.
      const group = Math.floor(n / BLIP_EVERY);
      if (blips && group > blipped && n < total) void playSfx("lesson.blip", { rate: blipRate(Math.random()) });
      blipped = group;
      setCount(n);
      if (n >= total) clearInterval(id);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active, total, blips, startAt]);
  return active ? count : total;
}

/**
 * `blips` plays the soft talking blip as characters appear. Off for lessons (they are read, not
 * spoken); it is for a character who talks, such as the Shrodi mascot (docs/features/SFX_SPEC.md §6.3).
 */
export function TypedTermText({ text, style, typing, blips = false, startAt = 0 }: { text: string; style?: StyleProp<TextStyle>; typing: boolean; blips?: boolean; /** Wait this long (ms) before the first character. */ startAt?: number }) {
  const { theme } = useTheme();
  const styles = useCardStyles(theme);
  const reduced = useReducedMotion();
  const segments = useMemo(() => splitTerms(text), [text]);
  const total = useMemo(() => totalChars(segments), [segments]);
  const active = typing && !reduced;
  const count = useTypedCount(total, active, blips, startAt);
  // Finished (or never typed): the normal text, with its tappable terms
  if (!active || count >= total) return <TermText text={text} style={style ?? styles.body} />;
  const clipped = clipSegments(segments, count);
  return (
    // Screen readers get the whole sentence, not the part typed so far
    <Text style={style ?? styles.body} accessibilityLabel={plainText(text)}>
      {clipped.map((s, i) => (
        <Text key={i} style={s.termId ? styles.term : undefined}>
          {s.shown}
          {s.hidden ? <Text style={{ color: "transparent", textDecorationLine: "none" }}>{s.hidden}</Text> : null}
        </Text>
      ))}
    </Text>
  );
}
