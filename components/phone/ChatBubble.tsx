/**
 * The pieces of a chat thread (docs/features/PHONE_SPEC.md §5.2), drawn like a messenger: a teacher's bubbles are filled cards on the left
 * with their round picture beside the last bubble of a run (and their name over the first), the learner's replies are blue bubbles
 * on the right, a bubble's corner nearest its speaker is squarer where the run ends, a sticker is one of AtomIQ's own big
 * pictures with no bubble, a reaction is a small one stuck on the bubble it answers (`chat-art.ts`), a typing bubble sits in the
 * beat before a teacher answers, and "write back", sticker and reaction buttons are the replies. A bubble the learner sends flies
 * in as if just sent (`sendIn`), a teacher's one rises quietly (`settle`). Flat, no borders; the page behind is plain. In a conversation the bubbles and reply buttons wear the teacher's cover colours (`ChatPaletteProvider`).
 */

import { createContext, memo, useContext, useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type EntryExitAnimationFunction } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { ChatHead, type ChatSpeaker } from "@/components/phone/ChatHead";
import { settle } from "@/components/motion/settle";
import { ChatArt } from "@/components/phone/ChatArt";
import { chatArtName } from "@/components/phone/chat-art";
import { tourArtName } from "@/components/phone/tour-art";
import { TourArt } from "@/components/phone/TourArt";
import { pictureOf } from "@/services/chat-core";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme, withAlpha } from "@/theme";
import type { ChatPalette } from "@/components/phone/chat-palette";
import { EASE_OUT } from "@/theme/motion";

/**
 * The colours of the conversation (the teacher's cover, `chat-palette.ts`). Without one the pieces wear the app's own blue.
 * Every piece reads it here, so the screen only has to wrap the thread in the provider.
 */
const PaletteContext = createContext<ChatPalette | null>(null);
export const ChatPaletteProvider = PaletteContext.Provider;

/** What a piece wears: the learner's bubble and button edge, the lip, the text on the bubble, and the wash behind a teacher's bubble. */
function useLook() {
  const c = useTheme().theme.colors;
  const p = useContext(PaletteContext);
  return {
    base: p?.face ?? c.guideLip,
    shade: p?.lip ?? c.guideLip,
    on: p?.faceOn ?? c.lessonHeaderText,
    linkFace: p?.face ?? c.guide,
    linkOn: p?.faceOn ?? c.onPrimary,
    wash: p ? withAlpha(p.base, 0.2) : c.field,
    edge: p?.base ?? c.guide,
    tinted: p !== null,
  };
}

const FACE = 36;
const REACTION = 26;
const STICKER = 104;
const PICTURE = 232;
const ROUND = 18;
const SQUARE = 6;
const LIP = 5;

/**
 * `entering` for a letter the learner just sent: it comes up from where the replies were, a little small, and settles at full size
 * (200 ms, ease-out, no spring). With reduced motion it is simply there.
 */
export function sendIn(): EntryExitAnimationFunction {
  return () => {
    "worklet";
    const timing = { duration: 200, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 22 }, { scale: 0.92 }] },
      animations: { opacity: withTiming(1, timing), transform: [{ translateY: withTiming(0, timing) }, { scale: withTiming(1, timing) }] },
    };
  };
}

/** `entering` for a sticker or a reaction landing: it pops from small to a little past full size and settles. */
export function popIn(delay: number = 0): EntryExitAnimationFunction {
  return () => {
    "worklet";
    const out = { duration: 150, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
    const back = { duration: 110, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
    return {
      initialValues: { opacity: 0, transform: [{ scale: 0.3 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, out, undefined), ReduceMotion.System),
        transform: [{ scale: withDelay(delay, withSequence(withTiming(1.18, out), withTiming(1, back)), ReduceMotion.System) }],
      },
    };
  };
}

/** Where a bubble sits in a run of one speaker's bubbles: the first carries the teacher's name, the last their picture, and a run sits close together. */
export interface RunPosition {
  first?: boolean;
  last?: boolean;
}

export const NpcBubble = memo(function NpcBubble({ speaker, text, fresh = false, first = true, last = true, reaction }: { speaker: ChatSpeaker | null | undefined; text: string; fresh?: boolean; reaction?: string } & RunPosition) {
  const styles = useStyles(useTheme().theme);
  const look = useLook();
  const picture = pictureOf(text);
  if (picture) {
    // A picture, not a bubble: the scene on its own, rounded, beside the speaker like any other letter of the run
    return (
      <Animated.View entering={fresh ? settle(0) : undefined} style={[styles.npcRow, { marginBottom: last ? 14 : 4 }]}>
        <View style={styles.faceSlot}>{last ? <ChatHead speaker={speaker} size={FACE} /> : null}</View>
        <View style={styles.pictureFrame} accessible accessibilityRole="image" accessibilityLabel={`${speaker?.name ?? "Teacher"} shows a picture: ${tourArtName(picture)}`}>
          <TourArt id={picture} width={PICTURE} />
        </View>
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={fresh ? settle(0) : undefined} style={[styles.npcRow, { marginBottom: reaction ? 24 : last ? 14 : 4 }]}>
      {/* The picture sits beside the last bubble of a run; the others keep its room */}
      <View style={styles.faceSlot}>{last ? <ChatHead speaker={speaker} size={FACE} /> : null}</View>
      <View style={styles.npcCol}>
        {first && speaker?.name ? (
          <Text style={styles.sender} numberOfLines={1}>
            {speaker.name}
          </Text>
        ) : null}
        <View style={[styles.npcBubble, { backgroundColor: look.wash }, last && styles.npcTail]} accessible accessibilityLabel={`${speaker?.name ?? "Teacher"} says: ${text}`}>
          <Text style={styles.npcText}>{text}</Text>
          {reaction ? (
            <Animated.View key={reaction} entering={popIn()} style={styles.reaction} accessible accessibilityLabel={`You reacted: ${chatArtName(reaction)}`}>
              <ChatArt id={reaction} size={REACTION} />
            </Animated.View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
});

export const MeBubble = memo(function MeBubble({ text, fresh = false, last = true }: { text: string; fresh?: boolean } & RunPosition) {
  const styles = useStyles(useTheme().theme);
  const look = useLook();
  return (
    <Animated.View entering={fresh ? sendIn() : undefined} style={[styles.meRow, { marginBottom: last ? 14 : 6 }]}>
      <View style={[styles.meBubble, { backgroundColor: look.base }, last && styles.meTail]} accessible accessibilityLabel={`You said: ${text}`}>
        <Text style={[styles.meText, { color: look.on }]}>{text}</Text>
      </View>
    </Animated.View>
  );
});

/** A sticker the learner sent: one of the big pictures, no card, on the right. */
export const StickerBubble = memo(function StickerBubble({ id, fresh = false, last = true }: { id: string; fresh?: boolean; last?: boolean }) {
  const styles = useStyles(useTheme().theme);
  return (
    <Animated.View entering={fresh ? popIn() : undefined} style={[styles.meRow, { marginBottom: last ? 14 : 6 }]} accessible accessibilityLabel={`You sent a sticker: ${chatArtName(id)}`}>
      <ChatArt id={id} size={STICKER} />
    </Animated.View>
  );
});

/**
 * A system line: a small grey note in the middle of the thread ("Ada got disconnected."), said by nobody. A soft highlighted
 * pill, no picture beside it and no tail; it eases in like a letter and is simply there with reduced motion.
 */
export const SystemLine = memo(function SystemLine({ text, fresh = false }: { text: string; fresh?: boolean }) {
  const styles = useStyles(useTheme().theme);
  return (
    <Animated.View entering={fresh ? settle(0) : undefined} style={styles.systemRow} accessible accessibilityRole="text" accessibilityLabel={text}>
      <View style={styles.systemPill}>
        <Text style={styles.systemText}>{text}</Text>
      </View>
    </Animated.View>
  );
});

/** Three dots that rise one after another, while a teacher "types". Still with reduced motion. */
export const TypingBubble = memo(function TypingBubble({ speaker }: { speaker: ChatSpeaker | null | undefined }) {
  const styles = useStyles(useTheme().theme);
  const look = useLook();
  return (
    <View style={[styles.npcRow, { marginBottom: 14 }]} accessible accessibilityLabel={`${speaker?.name ?? "Teacher"} is writing`} accessibilityLiveRegion="polite">
      <View style={styles.faceSlot}>
        <ChatHead speaker={speaker} size={FACE} />
      </View>
      <View style={[styles.npcBubble, { backgroundColor: look.wash }, styles.npcTail, styles.typing]}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} delay={i * 140} />
        ))}
      </View>
    </View>
  );
});

function Dot({ delay }: { delay: number }) {
  const styles = useStyles(useTheme().theme);
  const reduced = useReducedMotion();
  const lift = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    lift.set(withDelay(delay, withRepeat(withSequence(withTiming(-4, { duration: 220 }), withTiming(0, { duration: 220 }), withTiming(0, { duration: 280 })), -1)));
  }, [reduced, delay, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.get() }] }));
  return <Animated.View style={[styles.dot, style]} />;
}

/** A reply chip under the thread: a chunky blue-edged button (a face on a lip that it sinks onto when pressed), like the app's other buttons. */
export const ReplyPill = memo(function ReplyPill({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const styles = useStyles(useTheme().theme);
  const look = useLook();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.pill, { borderColor: look.edge }, pressed && styles.pillPressed]}>
      <Text style={[styles.pillText, look.tinted && styles.pillTextTinted]}>{label}</Text>
    </Pressable>
  );
});

/**
 * A link: a reply that only opens another page (AtomDex, the next lesson, a Myth Buster round). It is not a reply, so it does not look
 * like one: a wide button in the app's blue with the icon of where it goes on the left, the label with a small line saying what it opens,
 * and an arrow leaving on the right. Tapping it sends nothing.
 */
export const LinkButton = memo(function LinkButton({ label, icon, caption, onPress }: { label: string; icon: string; caption: string; onPress: () => void }) {
  const styles = useStyles(useTheme().theme);
  const look = useLook();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`${label}. ${caption}.`} style={styles.linkWrap}>
      {({ pressed }) => (
        <>
          {/* The lip is its own rounded layer under the face; pressed, the face sinks onto it and the height stays the same */}
          <View style={[styles.linkLip, { backgroundColor: look.shade }]} />
          <View style={[styles.link, { backgroundColor: look.linkFace, transform: [{ translateY: pressed ? LIP : 0 }] }]}>
            <View style={styles.linkIcon} accessible={false}>
              <Icon name={icon} size={22} color={look.shade} variant="Bold" />
            </View>
            <View style={styles.linkCopy}>
              <Text style={[styles.linkLabel, { color: look.linkOn }]} numberOfLines={2}>
                {label}
              </Text>
              <Text style={[styles.linkCaption, { color: withAlpha(look.linkOn, 0.92) }]} numberOfLines={1}>
                {caption}
              </Text>
            </View>
            <Icon name="ArrowRight2" size={20} color={look.linkOn} variant="Linear" />
          </View>
        </>
      )}
    </Pressable>
  );
});

/**
 * The Replay story / Start again button under an ended thread: a chunky face on a lip like the link button, in the teacher's
 * colours (their cover's readable face, its lip and the text that reads on it), the app's blue when there is no palette.
 */
export const ReplayButton = memo(function ReplayButton({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles(useTheme().theme);
  const look = useLook();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.replay}>
      {({ pressed }) => (
        <>
          {/* The lip is its own layer, the same rounded shape as the face, exactly where the face lands when pressed (like the app's Button) */}
          <View style={[styles.replayLip, { backgroundColor: look.shade }]} />
          <View style={[styles.replayFace, { backgroundColor: look.linkFace, transform: [{ translateY: pressed ? LIP : 0 }] }]}>
            <Icon name="Refresh2" size={20} color={look.linkOn} variant="Bold" />
            <Text style={[styles.replayText, { color: look.linkOn }]}>{label}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
});

/** A sticker to send: its picture on a chunky square button. */
export const StickerButton = memo(function StickerButton({ id, onPress }: { id: string; onPress: () => void }) {
  const styles = useStyles(useTheme().theme);
  const look = useLook();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Send the sticker: ${chatArtName(id)}`} style={({ pressed }) => [styles.stickerButton, look.tinted && { borderColor: look.edge }, pressed && styles.lipPressed]}>
      <ChatArt id={id} size={50} />
    </Pressable>
  );
});

/** A reaction to put on the teacher's last bubble: its picture on a chunky round button. */
export const ReactButton = memo(function ReactButton({ id, onPress }: { id: string; onPress: () => void }) {
  const styles = useStyles(useTheme().theme);
  const look = useLook();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`React: ${chatArtName(id)}`} style={({ pressed }) => [styles.reactButton, look.tinted && { borderColor: look.edge }, pressed && styles.lipPressed]}>
      <ChatArt id={id} size={36} />
    </Pressable>
  );
});

const useStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    npcRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingRight: 40 },
    faceSlot: { width: FACE, height: FACE },
    npcCol: { flexShrink: 1, gap: 3 },
    pictureFrame: { width: PICTURE, borderRadius: ROUND, overflow: "hidden" },
    sender: { marginLeft: 4, fontSize: 12, lineHeight: 16, ...fontFaces.heavy, color: c.textMuted },
    npcBubble: { flexShrink: 1, backgroundColor: c.field, borderRadius: ROUND, paddingVertical: 10, paddingHorizontal: 14 },
    // the run's last bubble is squarer on the side of its speaker
    npcTail: { borderBottomLeftRadius: SQUARE },
    npcText: { fontSize: 16, lineHeight: 23, ...fontFaces.medium, color: c.text },
    reaction: { position: "absolute", bottom: -16, right: -10, width: REACTION + 8, height: REACTION + 8, borderRadius: (REACTION + 8) / 2, alignItems: "center", justifyContent: "center", backgroundColor: c.mapBackground },
    // a face with a thicker bottom edge for its lip; pressed, the face drops onto the lip (the total height stays the same)
    stickerButton: { width: 68, height: 68, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center", backgroundColor: c.card },
    reactButton: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderBottomWidth: 5, borderColor: c.borderStrong, alignItems: "center", justifyContent: "center", backgroundColor: c.card },
    lipPressed: { borderBottomWidth: 2, marginTop: 3 },
    systemRow: { alignItems: "center", marginTop: 4, marginBottom: 18, paddingHorizontal: 24 },
    systemPill: { borderRadius: 12, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: c.field },
    systemText: { fontSize: 13, lineHeight: 18, textAlign: "center", ...fontFaces.semibold, color: c.textMuted },
    meRow: { alignItems: "flex-end", paddingLeft: 56 },
    meBubble: { backgroundColor: c.guideLip, borderRadius: ROUND, paddingVertical: 10, paddingHorizontal: 14 },
    meTail: { borderBottomRightRadius: SQUARE },
    meText: { fontSize: 16, lineHeight: 22, ...fontFaces.medium, color: c.lessonHeaderText },
    typing: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 17 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.textMuted },
    linkWrap: { alignSelf: "stretch", paddingBottom: LIP },
    linkLip: { position: "absolute", top: LIP, left: 0, right: 0, bottom: 0, borderRadius: 18 },
    link: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 12, paddingRight: 14, borderRadius: 18 },
    linkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.card },
    linkCopy: { flex: 1, gap: 1 },
    linkLabel: { fontSize: 16, lineHeight: 21, ...fontFaces.heavy, color: c.onPrimary },
    linkCaption: { fontSize: 12, lineHeight: 16, ...fontFaces.semibold, color: withAlpha(c.onPrimary, 0.8) },
    replay: { paddingBottom: LIP },
    replayLip: { position: "absolute", top: LIP, left: 0, right: 0, bottom: 0, borderRadius: 16 },
    replayFace: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 22, borderRadius: 16 },
    replayText: { fontSize: 16, lineHeight: 21, ...fontFaces.heavy },
    pill: { minHeight: 50, alignItems: "center", justifyContent: "center", paddingTop: 8, paddingBottom: 6, paddingHorizontal: 20, borderRadius: 16, borderWidth: 2, borderBottomWidth: 5, borderColor: c.guide, backgroundColor: c.card },
    pillPressed: { borderBottomWidth: 2, marginTop: 3, backgroundColor: c.surfaceSoft },
    pillText: { flexShrink: 1, fontSize: 16, lineHeight: 21, textAlign: "center", ...fontFaces.heavy, color: c.guideLip },
    // in a teacher's colours the edge says whose it is; the words stay the theme's own so they read on any outfit
    pillTextTinted: { color: c.text },
  };
});
