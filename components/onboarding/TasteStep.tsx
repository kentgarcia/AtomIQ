/**
 * "Try your first questions": value before the form. Two real, easy questions from lesson 1 are
 * played with the lesson's own card, grading and feedback sheet (single taps are graded at once, a
 * wrong one shakes, the sheet explains), so the learner has done something real before being asked
 * for a name. Nothing is recorded against a lesson or objective. After the second the XP is stamped
 * on (Shrodi stamped in with a burst, "+10 XP" counting up) and Continue arrives. The XP is banked
 * once by `completeOnboarding`. The step skips itself if the questions cannot be loaded, and has a
 * quiet "Skip for now" until the first is answered.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Image, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FeedbackDock } from "@/components/lesson/FeedbackDock";
import { LESSON_FRAME } from "@/components/lesson/LessonFrame";
import { ItemCard } from "@/components/lesson/cards/ItemCard";
import { Stamp } from "@/components/lesson/Stamp";
import { STAMP_LANDS, STAMP_TOTAL } from "@/components/lesson/stamp-core";
import { STAT_FX, STAT_TOTAL } from "@/components/lesson/stat-reveal-core";
import { StatTile } from "@/components/lesson/StatTile";
import { TextButton } from "@/components/lesson/TextButton";
import { ShrodiStill } from "@/components/mascot/ShrodiStill";
import { Burst } from "@/components/motion/Burst";
import { BURST } from "@/components/motion/burst-core";
import { Reveal } from "@/components/motion/Reveal";
import { settle } from "@/components/motion/settle";
import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { ContinueFooter, StepLayout } from "@/components/onboarding/StepLayout";
import { evaluateItem } from "@/content/curriculum/evaluate";
import type { Item, ItemResponse, ItemResult } from "@/content/curriculum/types";
import { contentRepository } from "@/services/content-db";
import { impactLight, notifyError, notifySuccess } from "@/services/haptics";
import { stepProgress, TASTE_ITEM_IDS, TASTE_XP } from "@/services/onboarding-core";
import { playSfx } from "@/services/sfx";
import { createStyles, fontFaces, fontSizes, spacing, useTheme } from "@/theme";

/** The reward moment: the fox lands, the title lands, the XP counts up, the button arrives. */
// The finish screen's order: Shrodi, the title, the line under it, then the XP tile revealing itself (the number counts while it arrives)
const XP_ICON = require("@/assets/images/icons/xp.png");

const REWARD = { fox: 0, title: 300, line: 560, tile: 760, button: 760 + STAT_FX.gatherEnd } as const;
/** The narrowest the line under the title gets (it is a sentence, not a banner). */
const LINE_MAX_WIDTH = 270;

const useStyles = createStyles((theme) => ({
  caption: { ...fontFaces.bold, fontSize: fontSizes.lg, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.textMuted, paddingBottom: spacing.md },
  hero: { alignItems: "center", gap: spacing.lg },
  foxWrap: { alignItems: "center", justifyContent: "center" },
  title: { ...fontFaces.heavy, fontSize: fontSizes["7xl"], lineHeight: 40, color: theme.colors.text, textAlign: "center" },
  tiles: { flexDirection: "row", justifyContent: "center", paddingTop: spacing.sm },
  line: { ...fontFaces.semibold, fontSize: fontSizes["2xl"], lineHeight: 26, color: theme.colors.textSecondary, textAlign: "center", maxWidth: LINE_MAX_WIDTH },
}));

function Reward({ onContinue }: { onContinue: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const clock = useDelayedClock(Math.max(REWARD.fox + STAMP_TOTAL, STAMP_LANDS + BURST.total), 0);
  useEffect(() => {
    const timers = [
      setTimeout(() => {
        notifySuccess();
        void playSfx("lesson.stamp");
      }, REWARD.fox + STAMP_LANDS),
      setTimeout(() => void playSfx("reward.coin"), REWARD.tile + STAT_FX.countStart + 200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <StepLayout center footer={<Reveal at={REWARD.button} blockUntilShown><ContinueFooter onPress={onContinue} onBack={null} /></Reveal>}>
      <View style={styles.hero}>
        <View style={styles.foxWrap}>
          <Stamp at={REWARD.fox}>
            <ShrodiStill size={150} />
          </Stamp>
          <Burst clock={clock} at={REWARD.fox + STAMP_LANDS} diameter={150} color={theme.colors.gold} ringColor={theme.colors.primary} reach={90} />
        </View>
        <Stamp at={REWARD.title} tilt={-1}>
          <Text accessibilityRole="header" style={styles.title}>
            Nice start!
          </Text>
        </Stamp>
        <Reveal at={REWARD.line}>
          <Text style={styles.line}>That is how every lesson feels. Now let&apos;s make this yours.</Text>
        </Reveal>
        <View style={styles.tiles}>
          <StatTile
            tone={theme.colors.gold}
            label="XP earned"
            value={`+${TASTE_XP}`}
            countTo={TASTE_XP}
            format={(n) => `+${n}`}
            revealAt={REWARD.tile}
            shineAt={REWARD.tile + STAT_TOTAL + 900}
            icon={<Image source={XP_ICON} style={{ width: 28, height: 28 }} resizeMode="contain" />}
            accessibilityLabel={`${TASTE_XP} XP earned`}
          />
        </View>
      </View>
    </StepLayout>
  );
}

export function TasteStep({ onDone, onSkip, onBack }: { /** Both questions answered (the learner has earned the XP). */ onDone: () => void; /** Left without finishing, or the questions could not be loaded. */ onSkip: () => void; onBack: () => void }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[] | null>(null);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<ItemResult | null>(null);
  const [finished, setFinished] = useState(false);
  const settled = useRef(false);
  const skipRef = useRef(onSkip);
  useEffect(() => {
    skipRef.current = onSkip;
  });

  useEffect(() => {
    let alive = true;
    contentRepository
      .getItemsByIds([...TASTE_ITEM_IDS])
      .then((list) => {
        if (!alive) return;
        if (list.length < TASTE_ITEM_IDS.length) skipRef.current();
        else setItems(list);
      })
      .catch(() => alive && skipRef.current());
    return () => {
      alive = false;
    };
  }, []);

  const item = items?.[index] ?? null;

  const onChange = useCallback(
    (response: ItemResponse | null) => {
      if (!item || !response || settled.current) return;
      settled.current = true;
      const evaluated = evaluateItem(item.type, item.data, response);
      setResult(evaluated);
      if (evaluated.correct) {
        notifySuccess();
        void playSfx("lesson.answer-correct");
      } else {
        notifyError();
        void playSfx("lesson.answer-wrong");
      }
    },
    [item],
  );

  const next = useCallback(() => {
    impactLight();
    settled.current = false;
    setResult(null);
    if (items && index + 1 < items.length) setIndex(index + 1);
    else setFinished(true);
  }, [items, index]);

  if (finished) return <Reward onContinue={onDone} />;
  if (!items || !item) return <StepLayout progress={stepProgress("taste")} onBack={onBack}>{null}</StepLayout>;

  return (
    <StepLayout
      progress={stepProgress("taste")}
      onBack={onBack}
      bleedFooter={!!result}
      footer={
        result ? (
          <FeedbackDock
            result={result}
            explanation={String((item.data as { explanation?: string }).explanation ?? "")}
            seed={item.id}
            onContinue={next}
            paddingHorizontal={LESSON_FRAME.paddingHorizontal}
            paddingBottom={insets.bottom + spacing.sm}
          />
        ) : (
          <TextButton label="Skip for now" onPress={onSkip} />
        )
      }
    >
      <Animated.View key={item.id} entering={settle()} style={{ flexGrow: 1 }}>
        <Text style={styles.caption}>
          Your first questions · {index + 1} of {items.length}
        </Text>
        <ItemCard item={item} instanceId={`onboarding-${index}`} locked={!!result} result={result} onChange={onChange} />
      </Animated.View>
    </StepLayout>
  );
}
