/**
 * A feed post (docs/NPC_FEED_SPEC.md §3), flat on the page like a social feed: no card, no lip.
 *
 *   (head)  Ada cheered you on               the poster's head, name in bold and what they did
 *           2h · Atom teacher                the time and their title
 *   ┌──────────────────────┐
 *   │ You finished the     │▸   (figure)     the text in a soft speech bubble whose tail points at
 *   │ lesson.              │                 the poster's figure beside it; the optional chip is a
 *   │ Open the lesson  ›   │                 lighter tappable line inside the bubble
 *   └──────────────────────┘
 *   [ heart 3 ]                              the reaction pill
 *   (heads) Liked by Mina and others         who reacted
 *   ──────────────────────────────           a divider closes the post
 *
 * Accessibility: the header is one item that reads the whole post ("Ada, cheered you on, Atom teacher,
 * 2 hours ago: …, 3 reactions"); the bubble text repeats it so it is hidden from the reader; the chip
 * and the reaction controls are their own buttons. The figure is decorative.
 */

import { useRouter } from "expo-router";
import { memo } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { NpcHead } from "@/components/feed/NpcHead";
import { ReactionRow } from "@/components/feed/ReactionRow";
import { Npc as NpcFigure } from "@/components/npc/Npc";
import { rtri } from "@/components/npc/npc-art";
import { CHIP_LABELS, actionPhrase, chipTarget, figurePose, metaLine, postSpokenLabel, reactionSpoken, relativeTime, relativeTimeSpoken } from "@/components/feed/feed-ui-core";
import { openFeedTarget } from "@/components/feed/navigate";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { Npc } from "@/content/npcs";
import type { FeedItem } from "@/services/feed";
import { impactLight } from "@/services/haptics";
import { createStyles, fontFaces, useTheme } from "@/theme";
import { EASE_OUT } from "@/theme/motion";

const TAIL_W = 14;
const TAIL_H = 28;
const TAIL = rtri([0, 0], [0, TAIL_H], [TAIL_W, TAIL_H / 2], 3);
const FIGURE = 84;

/** The flat tail on a bubble's right edge, pointing at the figure. Place it in a relative wrapper. */
export function BubbleSideTail({ color }: { color: string }) {
  return (
    <View style={{ position: "absolute", right: -(TAIL_W - 2), top: 24, width: TAIL_W, height: TAIL_H }} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={TAIL_W} height={TAIL_H} viewBox={`0 0 ${TAIL_W} ${TAIL_H}`}>
        <Path d={TAIL} fill={color} />
      </Svg>
    </View>
  );
}

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    post: { paddingTop: 14, gap: 8 },
    head: { flexDirection: "row", alignItems: "center", gap: 12 },
    who: { flex: 1, gap: 2 },
    line1: { fontSize: 16, lineHeight: 20, ...fontFaces.regular, color: c.text },
    name: { ...fontFaces.heavy },
    line2: { fontSize: 14, ...fontFaces.medium, color: c.textMuted },
    talk: { flexDirection: "row", alignItems: "center", gap: 16 },
    bubbleWrap: { width: "70%" },
    bubble: { paddingHorizontal: 14, paddingVertical: 12, gap: 6, borderRadius: 20, backgroundColor: c.surfaceSoft },
    text: { fontSize: 18, lineHeight: 24, ...fontFaces.semibold, color: c.text },
    chip: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 40, marginBottom: -6 },
    chipText: { flexShrink: 1, fontSize: 14, ...fontFaces.semibold, color: c.textMuted },
    figure: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
    /* The same thin dashed line as between settings rows */
    divider: { marginTop: 2, borderTopWidth: 1, borderStyle: "dashed", borderColor: c.border },
  };
});

export interface PostCardProps {
  item: FeedItem;
  /** The poster, or `null` while the cast loads. */
  npc: Npc | null;
  cast: ReadonlyMap<string, Npc>;
  now: number;
  /** Arrived since the screen was last shown: fades in (200 ms ease-out, none with reduced motion). */
  fresh?: boolean;
}

const kindOf = (k: string) => (k === "celebrate" || k === "milestone" || k === "nudge" || k === "tease" ? k : null);

export const PostCard = memo(function PostCard({ item, npc, cast, now, fresh = false }: PostCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const reduced = useReducedMotion();
  const name = npc?.name ?? "A teacher";
  const title = npc?.title ?? "";
  const chipKind = item.chip?.kind ?? null;
  const action = actionPhrase({ kind: kindOf(item.kind), chipKind });
  const chip = item.chip ? chipTarget(item.chip) : null;

  return (
    <Animated.View entering={fresh && !reduced ? FadeIn.duration(200).easing(EASE_OUT) : undefined}>
      <View style={styles.post}>
        <View
          style={styles.head}
          accessible
          accessibilityLabel={postSpokenLabel({
            name: `${name} ${action}`,
            title: title || "Teacher",
            when: relativeTimeSpoken(item.createdAt, now),
            text: item.text,
            reactions: reactionSpoken(item.reactions),
          })}
        >
          <NpcHead npc={npc} size={44} />
          <View style={styles.who}>
            <Text style={styles.line1} numberOfLines={2}>
              <Text style={styles.name}>{name}</Text> {action}
            </Text>
            <Text style={styles.line2} numberOfLines={1}>
              {metaLine(relativeTime(item.createdAt, now), title)}
            </Text>
          </View>
        </View>

        <View style={styles.talk}>
          <View style={styles.bubbleWrap}>
            <View style={styles.bubble}>
              <Text style={styles.text} importantForAccessibility="no" accessibilityElementsHidden>
                {item.text}
              </Text>
              {item.chip && chip ? (
                <Pressable
                  style={styles.chip}
                  accessibilityRole="button"
                  accessibilityLabel={CHIP_LABELS[item.chip.kind]}
                  onPress={() => {
                    impactLight();
                    openFeedTarget(router, chip);
                  }}
                >
                  <Text style={styles.chipText} numberOfLines={1}>
                    {CHIP_LABELS[item.chip.kind]}
                  </Text>
                  <Icon name="ArrowRight2" size={16} color={theme.colors.textMuted} variant="Bold" />
                </Pressable>
              ) : null}
            </View>
            <BubbleSideTail color={theme.colors.surfaceSoft} />
          </View>
          <View style={styles.figure}>
            {npc ? <NpcFigure spec={npc.spec} form="hero" pose={figurePose({ kind: kindOf(item.kind), chipKind })} size={FIGURE} live={false} /> : null}
          </View>
        </View>

        <ReactionRow target={item.target} summary={item.reactions} cast={cast} />
        <View style={styles.divider} accessible={false} importantForAccessibility="no-hide-descendants" />
      </View>
    </Animated.View>
  );
});
