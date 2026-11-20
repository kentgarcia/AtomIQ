/**
 * The reaction part of a post, a blog card and a blog piece (docs/features/NPC_FEED_SPEC.md §3, §4.2):
 *
 *   [heart  6]            the learner's reaction pill: a chunky outlined pill (2 dp border, 4 dp
 *                         bottom edge). Tapping opens the picker of the four reactions; tapping the
 *                         one already set removes it. The count is everyone who reacted.
 *   (heads) Liked by Mina and others
 *                         up to three NPC heads and the line; tapping either opens the "who reacted"
 *                         sheet. Left out when no NPC reacted.
 *
 * A reaction pops for 150 ms and gives a light haptic (no movement with reduced motion). Reactions are
 * the learner's only input: there is nothing to type anywhere in this feature. The data comes from the
 * feed item (`ReactionSummary`); changes go through `toggleReaction` in `services/feed.ts` and the
 * list re-reads by itself.
 */

import { memo, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { HeadStack } from "@/components/feed/NpcHead";
import { ReactionGlyph, useReactionColors } from "@/components/feed/ReactionGlyph";
import { ReactorsSheet } from "@/components/feed/ReactorsSheet";
import { commentsLabel, likedBySegments, likedBySpoken, pickerButtonLabel, REACTION_ORDER, reactPillLabel } from "@/components/feed/feed-ui-core";
import { FloatUp } from "@/components/motion/FloatUp";
import { PopWhen } from "@/components/motion/PopOnce";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Npc } from "@/content/npcs";
import type { Reaction } from "@/content/types";
import { useTutorialTarget, type ViewRef } from "@/components/tutorial/use-tutorial-target";
import { emitTutorial } from "@/services/tutorial";
import { toggleReaction, type ReactionSummary, type ReactionTargetType } from "@/services/feed";
import { select } from "@/services/haptics";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";
import { EASE_OUT } from "@/theme/motion";
import { controls } from "@/theme/tokens";
import { playSfx } from "@/services/sfx";
import { REACTION_RATE } from "@/services/sfx-core";

const POP_MS = 150;

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    wrap: { gap: 8 },
    line: { flexDirection: "row", alignItems: "center", gap: 12 },
    pill: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minWidth: 84,
      height: 44,
      paddingHorizontal: 16,
      borderRadius: 22,
      borderWidth: controls.border,
      borderBottomWidth: controls.lip,
      borderColor: c.border,
      borderBottomColor: c.borderStrong,
      backgroundColor: c.background,
    },
    pillOn: { borderColor: withAlpha(c.primary, 0.5), borderBottomColor: c.primary, backgroundColor: withAlpha(c.primary, 0.08) },
    pillPressed: { transform: [{ translateY: 2 }] },
    count: { fontSize: 18, ...fontFaces.heavy, color: c.text },
    pickerWrap: { alignSelf: "flex-start" },
    picker: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 4, borderRadius: 28, backgroundColor: c.surfaceSoft },
    pick: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    pickOn: { backgroundColor: withAlpha(c.primary, 0.18) },
    liked: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
    comments: { flex: 1, minHeight: 48, justifyContent: "center" },
    commentsText: { fontSize: 15, ...fontFaces.heavy, color: c.textMuted },
    likedText: { flex: 1, fontSize: 14, lineHeight: 19, ...fontFaces.regular, color: c.text },
    likedBold: { ...fontFaces.heavy },
  };
});

/** The open picker of the card the tour is on: it lights the four reactions (one `useTutorialTarget`, so only that card has it). */
function LitPicker({ children }: { children: (ref: React.Ref<ViewRef>) => React.ReactNode }) {
  const lit = useTutorialTarget("feed.picker", { radius: 28 });
  return <>{children(lit.ref)}</>;
}

/** The picker's wrapper view: lit for the tour's card, plain for every other. */
function PickerFrame({ lit, children }: { lit: boolean; children: (ref: React.Ref<ViewRef> | undefined) => React.ReactNode }) {
  return lit ? <LitPicker>{children}</LitPicker> : <>{children(undefined)}</>;
}

export interface ReactionRowProps {
  target: { type: ReactionTargetType; id: string };
  summary: ReactionSummary;
  cast: ReadonlyMap<string, Npc>;
  /** A blog card: how many NPC comments the piece has; a "View N comments" button shows beside the pill when above 0. */
  commentCount?: number;
  onViewComments?: () => void;
  /** Shrodi's tour lights the reaction pill through this ref (docs/features/TUTORIAL_SPEC.md): only the first card on the page gets one. */
  pillRef?: React.Ref<ViewRef>;
}

export const ReactionRow = memo(function ReactionRow({ target, summary, cast, commentCount = 0, onViewComments, pillRef }: ReactionRowProps) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const colors = useReactionColors();
  const reduced = useReducedMotion();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const choose = (reaction: Reaction) => {
    emitTutorial("reacted");
    select();
    // Picking a new reaction pops (pitched by which one); picking your own again takes it back
    if (summary.mine === reaction) void playSfx("ui.unequip");
    else void playSfx("reward.pop", { rate: REACTION_RATE[reaction] ?? 1 });
    setPickerOpen(false);
    void toggleReaction(target.type, target.id, reaction).catch((error) => console.warn("[feed] react", error));
  };

  const heads = summary.heads.map((id) => cast.get(id) ?? null);
  const names = summary.heads.flatMap((id) => {
    const name = cast.get(id)?.name;
    return name ? [name] : [];
  });
  const segments = likedBySegments(names, summary.others, summary.mine !== null);

  return (
    <View style={styles.wrap}>
      <View style={styles.line}>
      <Pressable
        ref={pillRef}
        collapsable={false}
        onPress={() => {
          emitTutorial("reaction-opened");
          select();
          void playSfx(pickerOpen ? "ui.panel-close" : "ui.panel-open");
          setPickerOpen((open) => !open);
        }}
        accessibilityRole="button"
        accessibilityLabel={reactPillLabel(summary.mine, summary.total)}
        accessibilityState={{ selected: summary.mine !== null, expanded: pickerOpen }}
        accessibilityHint="Opens the four reactions"
        style={({ pressed }) => [styles.pill, summary.mine ? styles.pillOn : null, pressed ? styles.pillPressed : null]}
      >
        {/* Choosing a reaction pops the pill's glyph (a small version of the option pop) and three of them float up */}
        <PopWhen trigger={summary.mine} active={summary.mine !== null} intensity={0.6} sparkles={false}>
          <View accessible={false}>
            {summary.mine ? (
              <ReactionGlyph reaction={summary.mine} size={22} />
            ) : (
              <Icon name="Heart" size={22} color={theme.colors.textSecondary} variant="Linear" />
            )}
          </View>
          <FloatUp
            trigger={summary.mine}
            active={summary.mine !== null}
            size={14}
            render={() => (summary.mine ? <ReactionGlyph reaction={summary.mine} size={14} /> : null)}
          />
        </PopWhen>
        {summary.total > 0 ? <Text style={styles.count}>{summary.total}</Text> : null}
      </Pressable>

      {onViewComments && commentsLabel(commentCount) ? (
        <Pressable style={styles.comments} onPress={onViewComments} accessibilityRole="button" accessibilityLabel={commentsLabel(commentCount) ?? undefined}>
          <Text style={styles.commentsText}>{commentsLabel(commentCount)}</Text>
        </Pressable>
      ) : null}
      </View>

      {pickerOpen ? (
        <PickerFrame lit={pillRef !== undefined}>
          {(ref) => (
            <View ref={ref} collapsable={false} style={styles.pickerWrap}>
              <Animated.View entering={reduced ? undefined : FadeIn.duration(POP_MS).easing(EASE_OUT)} style={styles.picker} accessibilityRole="toolbar" accessibilityLabel="Choose a reaction">
                {REACTION_ORDER.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => choose(r)}
                    style={[styles.pick, summary.mine === r ? styles.pickOn : null]}
                    accessibilityRole="button"
                    accessibilityLabel={pickerButtonLabel(r, summary.mine)}
                    accessibilityState={{ selected: summary.mine === r }}
                  >
                    <ReactionGlyph reaction={r} size={26} color={colors[r]} />
                  </Pressable>
                ))}
              </Animated.View>
            </View>
          )}
        </PickerFrame>
      ) : null}

      {segments.length > 0 ? (
        <Pressable
          style={styles.liked}
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${likedBySpoken(segments)}. See who reacted`}
        >
          <HeadStack npcs={heads} size={32} />
          <Text style={styles.likedText} numberOfLines={2}>
            {segments.map((s, i) => (
              <Text key={i} style={s.bold ? styles.likedBold : undefined}>
                {s.text}
              </Text>
            ))}
          </Text>
        </Pressable>
      ) : null}

      <ReactorsSheet visible={sheetOpen} target={target} cast={cast} onClose={() => setSheetOpen(false)} />
    </View>
  );
});
