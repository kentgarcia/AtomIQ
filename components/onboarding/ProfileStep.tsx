/**
 * "What should we call you?": asked last, after the learner has already done something in the app.
 * Their avatar stands above the name they type (it updates as they type, so the page answers
 * them), and the Terms and Privacy tick sits under it. Continue needs both, and the screen says
 * what is missing instead of only going grey. The keyboard lifts the footer; the body scrolls.
 */

import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, { Easing, ReduceMotion, withTiming, type EntryExitAnimationFunction } from "react-native-reanimated";

import { Avatar } from "@/components/avatar/Avatar";
import { serializeAvatar, STARTER_AVATARS, type StarterId } from "@/components/avatar/avatar-core";
import { PopWhen } from "@/components/motion/PopOnce";
import { settle } from "@/components/motion/settle";
import { settleDelay } from "@/components/motion/settle-core";
import { ShrodiSays } from "@/components/onboarding/ShrodiSays";
import { ContinueFooter, StepLayout } from "@/components/onboarding/StepLayout";
import { FieldInput } from "@/components/ui/field-input";
import { Icon } from "@/components/ui/icon";
import { impactLight } from "@/services/haptics";
import { playSfx } from "@/services/sfx";
import { stepProgress } from "@/services/onboarding-core";
import { EASE_OUT } from "@/theme/motion";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme, withAlpha } from "@/theme";

const NAME_MAX = 24;
const AVATAR_BIG = 112;
const AVATAR_PICK = 60;

/** The tick in the box: from small and a little turned, past full size, and settling (the one overshoot on this page). */
const tickIn: EntryExitAnimationFunction = () => {
  "worklet";
  const grow = { duration: 280, easing: Easing.bezier(0.34, 1.56, 0.64, 1), reduceMotion: ReduceMotion.System };
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.2 }, { rotate: "-30deg" }] },
    animations: {
      opacity: withTiming(1, { duration: 90, easing: EASE_OUT, reduceMotion: ReduceMotion.System }),
      transform: [{ scale: withTiming(1, grow) }, { rotate: withTiming("0deg", { duration: 280, easing: EASE_OUT, reduceMotion: ReduceMotion.System }) }],
    },
  };
};

const useStyles = createStyles((theme) => ({
  title: { ...fontFaces.heavy, fontSize: fontSizes["6xl"], lineHeight: 34, color: theme.colors.text },
  body: { gap: spacing.xl },
  who: { alignItems: "center", gap: spacing.sm },
  picks: { flexDirection: "row", justifyContent: "center", gap: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  pick: { padding: 4, borderRadius: radius.full, borderWidth: 3, borderColor: "transparent" },
  pickOn: { borderColor: theme.colors.guide, backgroundColor: withAlpha(theme.colors.guide, 0.12) },
  shownName: { ...fontFaces.heavy, fontSize: fontSizes["5xl"], color: theme.colors.text, maxWidth: "100%" },
  level: { ...fontFaces.semibold, fontSize: fontSizes.lg, color: theme.colors.textMuted },
  inputWrap: { position: "relative" },
  input: { backgroundColor: theme.colors.field, borderRadius: radius.lg, minHeight: 56, paddingHorizontal: spacing.lg, paddingRight: 48, fontSize: fontSizes.xl, ...fontFaces.semibold, color: theme.colors.fieldText },
  clear: { position: "absolute", right: spacing.md, top: 0, bottom: 0, justifyContent: "center" },
  count: { alignSelf: "flex-end", ...fontFaces.semibold, fontSize: fontSizes.sm, color: theme.colors.textFaint, marginTop: spacing.xs },
  consent: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  box: { width: 34, height: 34, borderRadius: radius.md, borderWidth: 2, borderBottomWidth: 4, borderColor: theme.colors.border, backgroundColor: theme.colors.card, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryDark },
  consentText: { flex: 1, ...fontFaces.medium, fontSize: fontSizes.lg, lineHeight: 22, color: theme.colors.textMuted },
  link: { ...fontFaces.heavy, color: theme.colors.primary, textDecorationLine: "underline" },
}));

export function ProfileStep({
  name,
  onName,
  agreed,
  onAgreed,
  starter,
  onStarter,
  busy,
  onContinue,
  onBack,
  onOpenTerms,
  onOpenPrivacy,
}: {
  name: string;
  onName: (name: string) => void;
  agreed: boolean;
  onAgreed: (agreed: boolean) => void;
  starter: StarterId;
  onStarter: (id: StarterId) => void;
  busy: boolean;
  onContinue: () => void;
  onBack: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const ready = name.trim().length > 0 && agreed;
  const design = STARTER_AVATARS.find((a) => a.id === starter) ?? STARTER_AVATARS[0];
  const hint = name.trim().length === 0 ? "Type a name, any name you like." : !agreed ? "One last tick and we're ready." : "Great name! Ready when you are.";
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <StepLayout progress={stepProgress("profile")} onBack={onBack} footer={<ContinueFooter label={busy ? "Starting..." : "Continue"} disabled={!ready || busy} onPress={onContinue} />}>
        <View style={styles.body}>
          <Animated.View entering={settle(settleDelay(0))}>
            <Text accessibilityRole="header" style={styles.title}>
              What should we call you?
            </Text>
          </Animated.View>
          <Animated.View entering={settle(settleDelay(1))}>
            <ShrodiSays text={hint} mood={ready ? "happy" : "idle"} typing={false} size={84} />
          </Animated.View>
          <Animated.View entering={settle(settleDelay(2))} style={styles.who}>
            {/* The big avatar pops each time the learner picks the other one */}
            <PopWhen trigger={starter} intensity={0.7} sparkleColor={theme.colors.gold}>
              <Avatar value={serializeAvatar(design.config)} size={AVATAR_BIG} />
            </PopWhen>
            <View style={styles.picks} accessibilityRole="radiogroup">
              {STARTER_AVATARS.map((a) => {
                const on = a.id === starter;
                return (
                  <Pressable
                    key={a.id}
                    accessibilityRole="radio"
                    accessibilityLabel={a.label}
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      if (on) return;
                      impactLight();
                      void playSfx("ui.select");
                      onStarter(a.id);
                    }}
                  >
                    <PopWhen trigger={on} active={on} intensity={0.8} sparkles={false}>
                      <View style={[styles.pick, on && styles.pickOn]}>
                        <Avatar value={serializeAvatar(a.config)} size={AVATAR_PICK} />
                      </View>
                    </PopWhen>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.shownName} numberOfLines={1}>
              {name.trim() || "Your name"}
            </Text>
            <Text style={styles.level}>Level 1 · Atomic Novice</Text>
          </Animated.View>
          <Animated.View entering={settle(settleDelay(3))}>
            <View style={styles.inputWrap}>
              <FieldInput
                style={styles.input}
                placeholder="Your display name"
                value={name}
                onChangeText={(text) => onName(text.slice(0, NAME_MAX))}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={NAME_MAX}
                accessibilityLabel="Display name"
              />
              {name.length > 0 ? (
                <Pressable style={styles.clear} onPress={() => onName("")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear display name">
                  <Icon name="CloseCircle" size={20} color={theme.colors.textFaint} variant="Bold" />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.count}>
              {name.length}/{NAME_MAX}
            </Text>
          </Animated.View>
          <Animated.View entering={settle(settleDelay(4))}>
            <Pressable
              style={styles.consent}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              onPress={() => {
                impactLight();
                if (agreed) {
                  void playSfx("ui.toggle-off");
                } else {
                  // Ticking is a small win: the select sound, then a sparkle just behind it
                  void playSfx("ui.toggle-on");
                  setTimeout(() => void playSfx("reward.sparkle"), 90);
                }
                onAgreed(!agreed);
              }}
            >
              {/* The box pops with two gold sparkles when ticked, and the tick itself springs in */}
              <PopWhen trigger={agreed} active={agreed} intensity={1.1} sparkleColor={theme.colors.gold}>
                <View style={[styles.box, agreed && styles.boxOn]}>{agreed ? <Animated.View entering={tickIn}><Icon name="TickCircle" size={24} color={theme.colors.onPrimary} variant="Bold" /></Animated.View> : null}</View>
              </PopWhen>
              <Text style={styles.consentText}>
                I agree to the{" "}
                <Text style={styles.link} onPress={onOpenTerms}>
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text style={styles.link} onPress={onOpenPrivacy}>
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </StepLayout>
    </KeyboardAvoidingView>
  );
}
