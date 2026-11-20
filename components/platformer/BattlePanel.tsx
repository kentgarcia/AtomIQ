/**
 * The question of a battle (docs/features/PLATFORMER_SPEC.md §6), drawn over the bottom of the map while the
 * view is zoomed in on the two fighters: the enemy's name and life, the question, and TWO options.
 * Every answer is graded the moment it is tapped, like the lessons' single-tap items, and the options
 * are the lessons' `OptionRow`s (same pop, same shake). The fight itself plays in the world above
 * (BattleFx.tsx, battle-fx-core.ts); this panel only says what happened: "Direct hit!" with why, or
 * "Ouch!" with a Continue button.
 */

import { Image, View } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";

import { OptionRow, type OptionState } from "@/components/lesson/cards/shared";
import { settle } from "@/components/motion/settle";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, fontSizes, useTheme } from "@/theme";

import type { ServedBattleQuestion } from "./battle-core";
import { PROP_SPRITES } from "./sprites";

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    root: {
      ...({ position: "absolute", left: 0, right: 0, bottom: 0 } as const),
      backgroundColor: c.mapBackground,
      borderTopWidth: 2,
      borderTopColor: c.border,
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 12,
    },
    head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    who: { ...fontFaces.heavy, fontSize: fontSizes.sm, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.6 },
    pips: { flexDirection: "row", gap: 2 },
    question: { ...fontFaces.heavy, fontSize: 20, lineHeight: 27, color: c.text },
    options: { gap: 10 },
    verdict: { gap: 4, minHeight: 64 },
    verdictTitle: { ...fontFaces.heavy, fontSize: 18 },
    why: { ...fontFaces.semibold, fontSize: fontSizes.md, lineHeight: 22, color: c.textSecondary },
  };
});

const BADGES = ["A", "B"];

export interface BattlePanelProps {
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  served: ServedBattleQuestion;
  /** The option the learner tapped, once they have. */
  picked: number | null;
  result: "correct" | "wrong" | null;
  /** Whether the right answer will beat the enemy. */
  lastHit: boolean;
  /** The safe-area inset at the bottom, px. */
  bottomInset: number;
  onPick: (index: number) => void;
  onContinue: () => void;
}

export function BattlePanel({ enemyName, enemyHp, enemyMaxHp, served, picked, result, lastHit, bottomInset, onPick, onContinue }: BattlePanelProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const c = theme.colors;
  const q = served.question;
  const answered = result !== null;
  const stateOf = (i: number): OptionState => {
    if (!answered) return "idle";
    if (i === q.correctAnswer) return "correct";
    if (i === picked) return "wrong";
    return "dim";
  };
  return (
    <Animated.View entering={settle(140)} exiting={FadeOut.duration(160)} style={[styles.root, { paddingBottom: 16 + bottomInset }]}>
      <View style={styles.head}>
        <Text style={styles.who}>
          {enemyName} · {enemyHp > 1 ? `${enemyHp} hits to go` : "one more hit"}
        </Text>
        <View style={styles.pips}>
          {Array.from({ length: enemyMaxHp }, (_, i) => (
            <Image key={i} source={i < enemyHp ? PROP_SPRITES.heart : PROP_SPRITES.heartEmpty} style={{ width: 20, height: 20 }} fadeDuration={0} />
          ))}
        </View>
      </View>
      {/* A new question settles in again; the fight above does not wait for it */}
      <Animated.View key={served.token} entering={settle(0)} style={{ gap: 12 }}>
        <Text style={styles.question} accessibilityRole="header">
          {q.question}
        </Text>
        <View style={styles.options}>
          {q.options.map((option, i) => (
            <OptionRow key={`${served.token}:${i}`} label={option} badge={BADGES[i]} state={stateOf(i)} disabled={answered} onPress={() => onPick(i)} />
          ))}
        </View>
      </Animated.View>
      <View style={styles.verdict}>
        {answered ? (
          <Animated.View entering={settle(260)} style={{ gap: 4 }}>
            <Text style={[styles.verdictTitle, { color: result === "correct" ? c.success : c.error }]}>
              {result === "correct" ? (lastHit ? "Direct hit! It is beaten." : "Direct hit!") : "Ouch! You lose a heart."}
            </Text>
            {q.explanation ? <Text style={styles.why}>{q.explanation}</Text> : null}
            {result === "wrong" ? (
              <View style={{ paddingTop: 8 }}>
                <Button label="Continue" onPress={onContinue} />
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}
