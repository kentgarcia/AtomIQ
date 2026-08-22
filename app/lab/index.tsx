import { fontFamilies, useTheme } from "@/theme";
import { DURATION, PRESS_EASING } from "@/theme/motion";
import { Icon } from "@/components/ui/icon";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

// ==================================================================
// Shared palette (autumn / amber — matches Profile & home surfaces)
// ==================================================================
const C = {
  amberOuter: "#FFCA5F",
  amber: "#FF8C00",
  amberDark: "#E67E22",
  cream: "#FFF3E0",
  white: "#FFFFFF",
  ink: "#333333",
  inkSoft: "#666666",
  muted: "#9CA3AF",
  success: "#2ECC71",
  successDark: "#10B981",
  danger: "#FF6B6B",
  dangerDark: "#EF4444",
  info: "#1CB0F6",
  border: "#E5E7EB",
  onAmber: "#434343",
};

// ==================================================================
// Reusable building blocks
// ==================================================================
function LabHeader({
  emoji,
  title,
  onBack,
}: {
  emoji?: string;
  title: string;
  onBack: () => void;
}) {
  const pressed = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.06 }],
  }));
  return (
    <View style={styles.headerRow}>
      <Animated.View style={pressStyle}>
        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.85}
          onPressIn={() =>
            (pressed.value = withTiming(1, { duration: DURATION.press, easing: PRESS_EASING }))
          }
          onPressOut={() =>
            (pressed.value = withTiming(0, { duration: DURATION.press, easing: PRESS_EASING }))
          }
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBack();
          }}
        >
          <Icon name="ArrowLeft2" size={20} color="#555555" variant="Bold" />
        </TouchableOpacity>
      </Animated.View>
      <View style={styles.titlePill}>
        {emoji ? <Text style={styles.titlePillEmoji}>{emoji}</Text> : null}
        <Icon name="Atom" size={14} color={C.white} variant="Bold" />
        <Text style={styles.titlePillText}>{title}</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
  );
}

function SelectPill({
  label,
  active,
  onPress,
  color = C.amber,
  emoji,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
  emoji?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && { backgroundColor: color, borderColor: color }]}
      activeOpacity={0.85}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      {emoji ? <Text style={[styles.pillEmoji, active && styles.pillTextActive]}>{emoji}</Text> : null}
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PrimaryButton({
  label,
  onPress,
  emoji,
}: {
  label: string;
  onPress: () => void;
  emoji?: string;
}) {
  const pressed = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.03 }],
  }));
  return (
    <Animated.View style={pressStyle}>
      <TouchableOpacity
        style={styles.primaryBtn}
        activeOpacity={0.9}
        onPressIn={() =>
          (pressed.value = withTiming(1, { duration: DURATION.press, easing: PRESS_EASING }))
        }
        onPressOut={() =>
          (pressed.value = withTiming(0, { duration: DURATION.press, easing: PRESS_EASING }))
        }
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
      >
        {emoji ? <Text style={styles.primaryBtnEmoji}>{emoji}</Text> : null}
        <Text style={styles.primaryBtnText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function Stepper({
  value,
  onDec,
  onInc,
  min = 0,
  max = 30,
  accent = C.amber,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  min?: number;
  max?: number;
  accent?: string;
}) {
  const decDisabled = value <= min;
  const incDisabled = value >= max;
  const btn = (disabled: boolean, symbol: string, handler: () => void) => (
    <TouchableOpacity
      style={[
        styles.stepperBtn,
        { backgroundColor: accent },
        disabled && styles.stepperBtnDisabled,
      ]}
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handler();
      }}
    >
      <Text style={styles.stepperBtnText}>{symbol}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={styles.stepper}>
      {btn(decDisabled, "−", onDec)}
      <View style={styles.stepperValue}>
        <Text style={[styles.stepperValueText, { color: accent }]}>{value}</Text>
      </View>
      {btn(incDisabled, "+", onInc)}
    </View>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onValueChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (v: number) => void;
  display: string;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const dec = () => onValueChange(Math.max(min, Math.round(value - step)));
  const inc = () => onValueChange(Math.min(max, Math.round(value + step)));
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderLabelRow}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <View style={styles.sliderValuePill}>
          <Text style={styles.sliderValueText}>{display}</Text>
        </View>
      </View>
      <View style={styles.sliderTrackRow}>
        <TouchableOpacity
          style={styles.sliderDec}
          activeOpacity={0.8}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dec();
          }}
        >
          <Text style={styles.sliderDecText}>−</Text>
        </TouchableOpacity>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${pct}%` }]} />
          <View style={[styles.sliderThumb, { left: `${pct}%` }]} />
        </View>
        <TouchableOpacity
          style={styles.sliderDec}
          activeOpacity={0.8}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            inc();
          }}
        >
          <Text style={styles.sliderDecText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ResultCard({
  emoji,
  title,
  subtitle,
  concept,
  children,
  actions,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  concept?: string;
  children?: React.ReactNode;
  actions: { label: string; onPress: () => void; primary?: boolean }[];
}) {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reducedMotion ? FadeIn.duration(140) : FadeInDown.springify()}
      style={[styles.sectionCard, { borderColor: C.success, alignItems: "center", gap: 12 }]}
    >
      <View style={[styles.resultIcon, { backgroundColor: C.success + "18" }]}>
        <Text style={styles.resultEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.resultTitle}>{title}</Text>
      <Text style={styles.resultSubtitle}>{subtitle}</Text>
      {concept ? (
        <View style={[styles.conceptPill, { backgroundColor: C.cream }]}>
          <Text style={styles.conceptPillLabel}>Concept Discovered</Text>
          <Text style={styles.conceptPillValue}>{concept}</Text>
        </View>
      ) : null}
      {children}
      <View style={styles.actionRow}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.actionBtn, a.primary ? styles.actionBtnPrimary : styles.actionBtnGhost]}
            activeOpacity={0.85}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              a.onPress();
            }}
          >
            <Text style={[styles.actionBtnText, a.primary && styles.actionBtnTextPrimary]}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

function HintBox({ text }: { text: string }) {
  return (
    <View style={styles.hintBox}>
      <Icon name="Bulb" size={16} color={C.amberDark} variant="Bold" />
      <Text style={styles.hintText}>{text}</Text>
    </View>
  );
}

// ==================================================================
// Mini-game 1 — Radiation Shield Lab
// ==================================================================
type Radiation = "alpha" | "beta" | "gamma";
type Material = "paper" | "plastic" | "aluminum" | "concrete" | "lead";

const RADIATIONS: { key: Radiation; label: string; emoji: string; factor: number }[] = [
  { key: "alpha", label: "Alpha", emoji: "α", factor: 4 },
  { key: "beta", label: "Beta", emoji: "β", factor: 1.3 },
  { key: "gamma", label: "Gamma", emoji: "γ", factor: 1 },
];
const MATERIALS: { key: Material; label: string; baseK: number }[] = [
  { key: "paper", label: "Paper", baseK: 0.083 },
  { key: "plastic", label: "Plastic", baseK: 0.11 },
  { key: "aluminum", label: "Aluminum", baseK: 0.162 },
  { key: "concrete", label: "Concrete", baseK: 0.223 },
  { key: "lead", label: "Lead", baseK: 0.357 },
];

function detectorReading(rad: Radiation, mat: Material, thickness: number): number {
  const factor = RADIATIONS.find((r) => r.key === rad)!.factor;
  const baseK = MATERIALS.find((m) => m.key === mat)!.baseK;
  const raw = 100 * Math.exp(-baseK * factor * thickness);
  return Math.max(1, Math.round(raw));
}

type ExpEntry = { rad: Radiation; mat: Material; thickness: number; reading: number };

function RadiationShieldLab({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { theme } = useTheme();
  const THEME = theme.palettes.tab;
  const bgTop = theme.mode === "dark" ? THEME.bg : C.cream;
  const bgBottom = theme.mode === "dark" ? THEME.bg : C.white;

  const [rad, setRad] = useState<Radiation>("gamma");
  const [mat, setMat] = useState<Material>("paper");
  const [thickness, setThickness] = useState(5);
  const [reading, setReading] = useState<number | null>(null);
  const [history, setHistory] = useState<ExpEntry[]>([]);
  const [challengeDone, setChallengeDone] = useState(false);

  const runExperiment = useCallback(() => {
    const r = detectorReading(rad, mat, thickness);
    setReading(r);
    setHistory((h) => [{ rad, mat, thickness, reading: r }, ...h].slice(0, 6));
    if (r < 20) setChallengeDone(true);
    else setChallengeDone(false);
  }, [rad, mat, thickness]);

  const reset = () => {
    setReading(null);
    setChallengeDone(false);
    setHistory([]);
  };

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      <LinearGradient colors={[bgTop, bgBottom]} style={styles.bgGradient} pointerEvents="none" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.simContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LabHeader emoji="☢️" title="Radiation Shield Lab" onBack={onBack} />

        <Animated.View
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.springify()}
          style={[styles.sectionCard, { borderColor: THEME.border }]}
        >
          <Text style={styles.cardTitle}>Radiation Source</Text>
          <View style={styles.pillRow}>
            {RADIATIONS.map((r) => (
              <SelectPill
                key={r.key}
                label={r.label}
                emoji={r.emoji}
                active={rad === r.key}
                onPress={() => setRad(r.key)}
              />
            ))}
          </View>

          <Text style={styles.cardTitle}>Shielding Material</Text>
          <View style={styles.pillRow}>
            {MATERIALS.map((m) => (
              <SelectPill
                key={m.key}
                label={m.label}
                active={mat === m.key}
                onPress={() => setMat(m.key)}
              />
            ))}
          </View>

          <SliderRow
            label="Thickness"
            value={thickness}
            min={1}
            max={20}
            step={1}
            onValueChange={(v) => setThickness(Math.round(v))}
            display={`${thickness} mm`}
          />

          <View style={styles.detectorBox}>
            <Text style={styles.detectorLabel}>Detector Reading</Text>
            <Text style={[styles.detectorValue, reading !== null && reading < 20 && { color: C.success }]}>
              {reading !== null ? `${reading} units` : "—"}
            </Text>
          </View>

          <PrimaryButton label="Run Experiment" onPress={runExperiment} emoji="⚡" />
        </Animated.View>

        {!challengeDone ? (
          <Animated.View
            entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(60).springify()}
            style={[styles.challengeCard, { borderColor: C.amber }]}
          >
            <View style={styles.challengeHeader}>
              <Icon name="Beaker" size={16} color={C.amberDark} variant="Bold" />
              <Text style={styles.challengeTitle}>Lab Challenge</Text>
            </View>
            <Text style={styles.challengeText}>
              Reduce the detector reading below <Text style={{ fontFamily: fontFamilies.heavy }}>20 units</Text>. Change the
              material and thickness to find the best shield.
            </Text>
          </Animated.View>
        ) : (
          <ResultCard
            emoji="🎉"
            title="Experiment Complete!"
            subtitle="You discovered that different materials provide different levels of shielding against radiation."
            concept="Radiation Shielding"
            actions={[
              { label: "📖 Learn More", onPress: () => onBack(), primary: true },
              { label: "🧪 Experiment Again", onPress: reset },
            ]}
          >
            <HintBox text="Denser materials (like lead) and greater thickness attenuate radiation more effectively." />
          </ResultCard>
        )}

        {history.length > 0 ? (
          <Animated.View
            entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(80).springify()}
            style={[styles.sectionCard, { borderColor: THEME.border }]}
          >
            <Text style={styles.cardTitle}>Experiment History</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Radiation</Text>
              <Text style={styles.tableHeaderCell}>Material</Text>
              <Text style={styles.tableHeaderCell}>Thick</Text>
              <Text style={[styles.tableHeaderCell, { textAlign: "right" }]}>Reading</Text>
            </View>
            {history.map((h, i) => {
              const rLabel = RADIATIONS.find((x) => x.key === h.rad)!.label;
              const mLabel = MATERIALS.find((x) => x.key === h.mat)!.label;
              return (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{rLabel}</Text>
                  <Text style={styles.tableCell}>{mLabel}</Text>
                  <Text style={styles.tableCell}>{h.thickness} mm</Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { textAlign: "right", fontFamily: fontFamilies.heavy, color: h.reading < 20 ? C.success : C.ink },
                    ]}
                  >
                    {h.reading}
                  </Text>
                </View>
              );
            })}
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ==================================================================
// Mini-game 2 — Build an Atom
// ==================================================================
const ELEMENTS: Record<number, { symbol: string; name: string }> = {
  1: { symbol: "H", name: "Hydrogen" },
  2: { symbol: "He", name: "Helium" },
  3: { symbol: "Li", name: "Lithium" },
  4: { symbol: "Be", name: "Beryllium" },
  5: { symbol: "B", name: "Boron" },
  6: { symbol: "C", name: "Carbon" },
  7: { symbol: "N", name: "Nitrogen" },
  8: { symbol: "O", name: "Oxygen" },
  9: { symbol: "F", name: "Fluorine" },
  10: { symbol: "Ne", name: "Neon" },
  11: { symbol: "Na", name: "Sodium" },
  12: { symbol: "Mg", name: "Magnesium" },
  13: { symbol: "Al", name: "Aluminum" },
  14: { symbol: "Si", name: "Silicon" },
  15: { symbol: "P", name: "Phosphorus" },
  16: { symbol: "S", name: "Sulfur" },
  17: { symbol: "Cl", name: "Chlorine" },
  18: { symbol: "Ar", name: "Argon" },
  19: { symbol: "K", name: "Potassium" },
  20: { symbol: "Ca", name: "Calcium" },
};

type AtomTarget = {
  level: 1 | 2 | 3;
  label: string;
  protons: number;
  neutrons: number;
  electrons: number;
};

const ATOM_CHALLENGES: AtomTarget[] = [
  { level: 1, label: "Hydrogen", protons: 1, neutrons: 0, electrons: 1 },
  { level: 1, label: "Carbon", protons: 6, neutrons: 6, electrons: 6 },
  { level: 1, label: "Nitrogen", protons: 7, neutrons: 7, electrons: 7 },
  { level: 1, label: "Oxygen", protons: 8, neutrons: 8, electrons: 8 },
  { level: 2, label: "Carbon-12", protons: 6, neutrons: 6, electrons: 6 },
  { level: 2, label: "Carbon-14", protons: 6, neutrons: 8, electrons: 6 },
  { level: 2, label: "Hydrogen-2", protons: 1, neutrons: 1, electrons: 1 },
  { level: 3, label: "Na⁺", protons: 11, neutrons: 12, electrons: 10 },
  { level: 3, label: "Cl⁻", protons: 17, neutrons: 18, electrons: 18 },
  { level: 3, label: "Mg²⁺", protons: 12, neutrons: 12, electrons: 10 },
];

function chargeLabel(protons: number, electrons: number): string {
  const c = protons - electrons;
  if (c === 0) return "Neutral (0)";
  if (c > 0) return `+${c}`;
  return `−${Math.abs(c)}`;
}

function BuildAnAtom({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { theme } = useTheme();
  const THEME = theme.palettes.tab;
  const bgTop = theme.mode === "dark" ? THEME.bg : C.cream;
  const bgBottom = theme.mode === "dark" ? THEME.bg : C.white;

  const [index, setIndex] = useState(0);
  const [protons, setProtons] = useState(ATOM_CHALLENGES[0].protons);
  const [neutrons, setNeutrons] = useState(ATOM_CHALLENGES[0].neutrons);
  const [electrons, setElectrons] = useState(ATOM_CHALLENGES[0].electrons);
  const [result, setResult] = useState<"idle" | "correct" | "wrong">("idle");
  const [hint, setHint] = useState<string | null>(null);

  const target = ATOM_CHALLENGES[index];
  const element = ELEMENTS[protons];

  const loadChallenge = (i: number) => {
    const t = ATOM_CHALLENGES[i];
    setIndex(i);
    setProtons(t.protons);
    setNeutrons(t.neutrons);
    setElectrons(t.electrons);
    setResult("idle");
    setHint(null);
  };

  const build = () => {
    if (
      protons === target.protons &&
      neutrons === target.neutrons &&
      electrons === target.electrons
    ) {
      setResult("correct");
      setHint(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setResult("wrong");
      if (protons !== target.protons) {
        setHint("Remember: the number of protons determines which element you're building.");
      } else if (neutrons !== target.neutrons) {
        setHint("Same element, different mass — that's an isotope. Check the neutron count.");
      } else {
        setHint("Electrons set the charge. A neutral atom has equal protons and electrons.");
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const next = () => loadChallenge((index + 1) % ATOM_CHALLENGES.length);

  const mass = protons + neutrons;
  const charge = protons - electrons;

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      <LinearGradient colors={[bgTop, bgBottom]} style={styles.bgGradient} pointerEvents="none" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.simContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LabHeader emoji="🧬" title="Build an Atom" onBack={onBack} />

        {result !== "correct" ? (
          <>
            <Animated.View
              entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.springify()}
              style={[styles.targetCard, { borderColor: C.amber }]}
            >
              <View style={styles.targetHeader}>
                <View style={[styles.levelPill, { backgroundColor: C.amber }]}>
                  <Text style={styles.levelPillText}>
                    {target.level === 1 ? "Elements" : target.level === 2 ? "Isotopes" : "Ions"}
                  </Text>
                </View>
                <Text style={styles.targetLabel}>{target.label}</Text>
              </View>
              <Text style={styles.targetHint}>Match the protons, neutrons and electrons.</Text>
            </Animated.View>

            <Animated.View
              entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(60).springify()}
              style={[styles.sectionCard, { borderColor: THEME.border, alignItems: "center", gap: 14 }]}
            >
              <View style={styles.nucleus}>
                <Text style={styles.nucleusSymbol}>{element ? element.symbol : "?"}</Text>
                <View style={styles.nucleusCounts}>
                  <Text style={styles.nucleusCount}>p {protons}</Text>
                  <Text style={styles.nucleusCount}>n {neutrons}</Text>
                </View>
              </View>
              <View style={styles.electronCloud}>
                {Array.from({ length: Math.min(electrons, 18) }).map((_, i) => (
                  <View key={i} style={styles.electronDot} />
                ))}
                {electrons > 18 ? <Text style={styles.electronMore}>+{electrons - 18}</Text> : null}
              </View>
              <Text style={styles.atomCaption}>
                {element ? element.name : "Unknown"} · {chargeLabel(protons, electrons)}
              </Text>
            </Animated.View>

            <Animated.View
              entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(100).springify()}
              style={[styles.sectionCard, { borderColor: THEME.border, gap: 14 }]}
            >
              <View style={styles.buildRow}>
                <Text style={styles.buildLabel}>Protons</Text>
                <Stepper
                  value={protons}
                  min={0}
                  max={20}
                  onDec={() => setProtons((p) => Math.max(0, p - 1))}
                  onInc={() => setProtons((p) => Math.min(20, p + 1))}
                />
              </View>
              <View style={styles.buildRow}>
                <Text style={styles.buildLabel}>Neutrons</Text>
                <Stepper
                  value={neutrons}
                  min={0}
                  max={30}
                  accent={C.info}
                  onDec={() => setNeutrons((n) => Math.max(0, n - 1))}
                  onInc={() => setNeutrons((n) => Math.min(30, n + 1))}
                />
              </View>
              <View style={styles.buildRow}>
                <Text style={styles.buildLabel}>Electrons</Text>
                <Stepper
                  value={electrons}
                  min={0}
                  max={20}
                  accent={C.success}
                  onDec={() => setElectrons((e) => Math.max(0, e - 1))}
                  onInc={() => setElectrons((e) => Math.min(20, e + 1))}
                />
              </View>
              <PrimaryButton label="Build Atom" onPress={build} emoji="🧬" />
            </Animated.View>

            {result === "wrong" && hint ? (
              <Animated.View entering={FadeIn.duration(160)} style={styles.wrongCard}>
                <Icon name="InfoCircle" size={18} color={C.amberDark} variant="Bold" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.wrongTitle}>Almost!</Text>
                  <Text style={styles.wrongText}>{hint}</Text>
                </View>
                <TouchableOpacity
                  style={styles.adjustBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setResult("idle");
                  }}
                >
                  <Text style={styles.adjustBtnText}>Adjust</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}
          </>
        ) : (
          <ResultCard
            emoji="🧬"
            title={`${target.label} Created!`}
            subtitle={
              element
                ? `${protons} protons → ${element.name}. ${protons} + ${neutrons} nucleons → Mass number ${mass}.`
                : "Atom created!"
            }
            concept="Atomic Structure"
            actions={[
              { label: "⏳ Try Decay Lab", onPress: () => onBack(), primary: true },
              { label: "Next Challenge →", onPress: next },
            ]}
          >
            <View style={styles.atomStatRow}>
              <View style={styles.atomStat}>
                <Text style={styles.atomStatValue}>{protons}</Text>
                <Text style={styles.atomStatLabel}>Atomic #</Text>
              </View>
              <View style={styles.atomStatDivider} />
              <View style={styles.atomStat}>
                <Text style={styles.atomStatValue}>{mass}</Text>
                <Text style={styles.atomStatLabel}>Mass #</Text>
              </View>
              <View style={styles.atomStatDivider} />
              <View style={styles.atomStat}>
                <Text
                  style={[
                    styles.atomStatValue,
                    { color: charge === 0 ? C.success : C.amberDark },
                  ]}
                >
                  {chargeLabel(protons, electrons)}
                </Text>
                <Text style={styles.atomStatLabel}>Charge</Text>
              </View>
            </View>
            {target.label === "Carbon-14" ? (
              <HintBox text="Carbon-14 is a radioactive isotope — a natural bridge to radioactive decay." />
            ) : null}
          </ResultCard>
        )}
      </ScrollView>
    </View>
  );
}

// ==================================================================
// Mini-game 3 — Radioactive Decay Lab
// ==================================================================
type Isotope = {
  key: string;
  label: string;
  halfLife: number;
  unit: string;
  color: string;
};

const ISOTOPES: Isotope[] = [
  { key: "c14", label: "Carbon-14", halfLife: 5730, unit: "years", color: C.amber },
  { key: "i131", label: "Iodine-131", halfLife: 8, unit: "days", color: C.success },
  { key: "tc99m", label: "Technetium-99m", halfLife: 6, unit: "hours", color: C.info },
];

function remaining(initial: number, halfLife: number, t: number): number {
  return initial * Math.pow(0.5, t / halfLife);
}

function DecayLab({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { theme } = useTheme();
  const THEME = theme.palettes.tab;
  const bgTop = theme.mode === "dark" ? THEME.bg : C.cream;
  const bgBottom = theme.mode === "dark" ? THEME.bg : C.white;
  const { width: windowWidth } = useWindowDimensions();

  const [iso, setIso] = useState<Isotope>(ISOTOPES[0]);
  const [initial, setInitial] = useState(1000);
  const [time, setTime] = useState(0);
  const [phase, setPhase] = useState<"predict" | "observe">("predict");
  const [prediction, setPrediction] = useState<number | null>(null);
  const [conclusion, setConclusion] = useState<string | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeDone, setChallengeDone] = useState(false);

  const maxTime = iso.halfLife * 4;
  const rem = Math.round(remaining(initial, iso.halfLife, time));
  const halfLives = iso.halfLife > 0 ? time / iso.halfLife : 0;

  const graphW = windowWidth - 40;
  const graphH = 160;
  const pad = 16;

  const points: { x: number; y: number }[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = (maxTime * i) / steps;
    const r = remaining(initial, iso.halfLife, t);
    const x = pad + (graphW - 2 * pad) * (t / maxTime);
    const y = graphH - pad - (graphH - 2 * pad) * (r / initial);
    points.push({ x, y });
  }
  const curvePath = "M " + points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ");
  const areaPath =
    curvePath +
    ` L ${(graphW - pad).toFixed(1)} ${(graphH - pad).toFixed(1)} L ${pad.toFixed(1)} ${(graphH - pad).toFixed(1)} Z`;
  const currentX = pad + (graphW - 2 * pad) * (time / maxTime);
  const currentY = graphH - pad - (graphH - 2 * pad) * (rem / initial);

  const dotCount = Math.max(0, Math.round((rem / initial) * 100));

  const runSimulation = () => {
    setPhase("observe");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  useEffect(() => {
    if (challengeOpen && initial === 800 && rem >= 150 && rem <= 250) {
      setChallengeDone(true);
    } else if (challengeOpen) {
      setChallengeDone(false);
    }
  }, [rem, initial, challengeOpen]);

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      <LinearGradient colors={[bgTop, bgBottom]} style={styles.bgGradient} pointerEvents="none" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.simContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LabHeader emoji="⏳" title="Radioactive Decay Lab" onBack={onBack} />

        <Animated.View
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.springify()}
          style={[styles.sectionCard, { borderColor: THEME.border }]}
        >
          <Text style={styles.cardTitle}>Sample</Text>
          <View style={styles.pillRow}>
            {ISOTOPES.map((s) => (
              <SelectPill
                key={s.key}
                label={s.label}
                active={iso.key === s.key}
                color={s.color}
                onPress={() => {
                  setIso(s);
                  setTime(0);
                  setPhase("predict");
                  setPrediction(null);
                  setConclusion(null);
                }}
              />
            ))}
          </View>
          <View style={styles.sampleStatsRow}>
            <View style={styles.sampleStat}>
              <Text style={styles.sampleStatValue}>{initial.toLocaleString()}</Text>
              <Text style={styles.sampleStatLabel}>Initial atoms</Text>
            </View>
            <View style={styles.sampleStat}>
              <Text style={[styles.sampleStatValue, { color: iso.color }]}>{iso.halfLife.toLocaleString()}</Text>
              <Text style={styles.sampleStatLabel}>Half-life ({iso.unit})</Text>
            </View>
          </View>

          <View style={styles.sampleBox}>
            <View style={styles.dotGrid}>
              {Array.from({ length: 100 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < dotCount ? { backgroundColor: iso.color } : { backgroundColor: "#F3F4F6" },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.sampleCaption}>Radioactive sample · {dotCount}% remaining</Text>
          </View>

          <SliderRow
            label="Time"
            value={time}
            min={0}
            max={maxTime}
            step={iso.halfLife / 8}
            onValueChange={(v) => setTime(v)}
            display={`${Math.round(time).toLocaleString()} ${iso.unit} · ${halfLives.toFixed(1)} half-lives`}
          />

          <View style={styles.detectorBox}>
            <Text style={styles.detectorLabel}>Remaining</Text>
            <Text style={styles.detectorValue}>{rem.toLocaleString()} atoms</Text>
          </View>

          <View style={[styles.graphWrap, { borderColor: THEME.border }]}>
            <Svg width={graphW} height={graphH}>
              <Path d={areaPath} fill={`${iso.color}14`} />
              <Path d={curvePath} stroke={iso.color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
              <Circle cx={currentX} cy={currentY} r={6} fill={iso.color} />
              <Circle cx={currentX} cy={currentY} r={10} fill={`${iso.color}30`} />
            </Svg>
            <View style={styles.graphLabels}>
              <Text style={styles.graphLabel}>Time</Text>
              <Text style={styles.graphLabel}>Remaining</Text>
            </View>
          </View>

          <PrimaryButton label="Run Simulation" onPress={runSimulation} emoji="▶" />
        </Animated.View>

        <Animated.View
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(60).springify()}
          style={[styles.sectionCard, { borderColor: THEME.border, gap: 12 }]}
        >
          <View style={styles.challengeHeader}>
            <Icon name="LampCharge" size={16} color={C.amberDark} variant="Bold" />
            <Text style={styles.challengeTitle}>Predict</Text>
          </View>
          <Text style={styles.challengeText}>
            If the sample starts with 1,000 radioactive atoms, approximately how many remain after two half-lives?
          </Text>
          <View style={styles.pillRow}>
            {[750, 500, 250, 125].map((v) => (
              <SelectPill
                key={v}
                label={String(v)}
                active={prediction === v}
                onPress={() => setPrediction(v)}
              />
            ))}
          </View>
        </Animated.View>

        {phase === "observe" && prediction !== null ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            style={[styles.sectionCard, { borderColor: THEME.border, gap: 10 }]}
          >
            <Text style={styles.compareText}>
              Your prediction: <Text style={{ fontFamily: fontFamilies.heavy }}>{prediction}</Text>
            </Text>
            <Text style={styles.compareText}>
              Observed (at 2 half-lives):{" "}
              <Text style={{ fontFamily: fontFamilies.heavy, color: C.success }}>
                {Math.round(remaining(1000, iso.halfLife, iso.halfLife * 2)).toLocaleString()}
              </Text>
            </Text>
            <Text style={[styles.cardTitle, { marginTop: 4 }]}>What did you discover?</Text>
            <View style={styles.pillRow}>
              {[
                "Half of the sample decays every half-life",
                "All atoms disappear after one half-life",
                "The sample increases over time",
              ].map((label) => (
                <SelectPill
                  key={label}
                  label={label}
                  active={conclusion === label}
                  onPress={() => setConclusion(label)}
                />
              ))}
            </View>
            {conclusion ? (
              <View style={[styles.conclusionInline, conclusion === "Half of the sample decays every half-life" && { borderColor: C.success }]}>
                <Icon
                  name={conclusion === "Half of the sample decays every half-life" ? "TickCircle" : "CloseCircle"}
                  size={16}
                  color={conclusion === "Half of the sample decays every half-life" ? C.success : C.danger}
                  variant="Bold"
                />
                <Text
                  style={[
                    styles.conclusionInlineText,
                    { color: conclusion === "Half of the sample decays every half-life" ? C.success : C.danger },
                  ]}
                >
                  {conclusion === "Half of the sample decays every half-life"
                    ? "Correct! Each half-life halves the remaining sample."
                    : "Not quite — half the remaining sample decays each half-life."}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {!challengeOpen ? (
          <TouchableOpacity
            style={[styles.challengeCard, { borderColor: C.amber }]}
            activeOpacity={0.85}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setChallengeOpen(true);
              setInitial(800);
              setTime(0);
              setPhase("predict");
              setPrediction(null);
              setConclusion(null);
              setChallengeDone(false);
            }}
          >
            <View style={styles.challengeHeader}>
              <Icon name="Cup" size={16} color={C.amberDark} variant="Bold" />
              <Text style={styles.challengeTitle}>Lab Challenge</Text>
            </View>
            <Text style={styles.challengeText}>
              You have a sample with <Text style={{ fontFamily: fontFamilies.heavy }}>800 atoms</Text>. Adjust the
              simulation until approximately <Text style={{ fontFamily: fontFamilies.heavy }}>200 atoms remain</Text>.
              (Hint: 800 → 400 → 200.)
            </Text>
            <Text style={styles.challengeTap}>Tap to start the challenge →</Text>
          </TouchableOpacity>
        ) : challengeDone ? (
          <ResultCard
            emoji="🎉"
            title="Experiment Complete"
            subtitle="You observed how radioactive samples change over time. A sample doesn't disappear all at once — its amount decreases progressively."
            concept="Half-Life"
            actions={[
              { label: "📖 Explore Decay", onPress: () => onBack(), primary: true },
              {
                label: "🧪 Try Another Isotope",
                onPress: () => {
                  setChallengeOpen(false);
                  setChallengeDone(false);
                  setInitial(1000);
                  setTime(0);
                  setPrediction(null);
                  setConclusion(null);
                  setPhase("predict");
                },
              },
            ]}
          />
        ) : (
          <View style={[styles.sectionCard, { borderColor: C.amber, alignItems: "center", gap: 10 }]}>
            <Icon name="TimeCircle" size={20} color={C.amberDark} variant="Bold" />
            <Text style={styles.challengeTitle}>Adjust time until ~200 atoms remain.</Text>
            <Text style={styles.challengeText}>Current: {rem.toLocaleString()} atoms</Text>
            {rem >= 150 && rem <= 250 ? (
              <Text style={{ color: C.success, fontFamily: fontFamilies.heavy }}>Great — you are in range!</Text>
            ) : null}
            <PrimaryButton
              label="Back to Challenge"
              onPress={() => {
                setChallengeOpen(false);
                setInitial(1000);
                setTime(0);
                setPrediction(null);
                setConclusion(null);
                setPhase("predict");
              }}
            />
          </View>
        )}

        <Animated.View
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(80).springify()}
          style={[styles.sectionCard, { borderColor: THEME.border, gap: 10 }]}
        >
          <Text style={styles.cardTitle}>Which sample decays fastest?</Text>
          <Text style={styles.sectionSubtitle}>
            Run the three simulations and compare. Shorter half-life = faster decay.
          </Text>
          <View style={styles.compareTable}>
            {ISOTOPES.map((s) => (
              <View key={s.key} style={styles.compareRow}>
                <View style={[styles.compareDot, { backgroundColor: s.color }]} />
                <Text style={styles.compareLabel}>{s.label}</Text>
                <Text style={styles.compareHalfLife}>
                  {s.halfLife.toLocaleString()} {s.unit}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[styles.compareText, { color: C.muted, textAlign: "center" }]}>
            Technetium-99m (~6 hours) decays fastest; Carbon-14 (5,730 years) slowest.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ==================================================================
// Router — lab mini-games are selected from the Games tab's
// DifficultyPanel; bare /lab redirects to the game picker.
// ==================================================================
export default function LabScreen() {
  const router = useRouter();
  const { exp } = useLocalSearchParams<{ exp?: string }>();

  const handleGameBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/awards");
  }, [router]);

  useEffect(() => {
    const valid =
      exp === "radiation-shield" ||
      exp === "build-atom" ||
      exp === "decay-lab" ||
      exp === "dose-visualizer" ||
      exp === "energy-showdown";
    if (!valid) {
      const t = setTimeout(() => router.replace("/(tabs)/awards"), 0);
      return () => clearTimeout(t);
    }
  }, [exp, router]);

  if (exp === "radiation-shield" || exp === "dose-visualizer") return <RadiationShieldLab onBack={handleGameBack} />;
  if (exp === "build-atom") return <BuildAnAtom onBack={handleGameBack} />;
  if (exp === "decay-lab" || exp === "energy-showdown") return <DecayLab onBack={handleGameBack} />;

  return (
    <View style={[styles.container, { backgroundColor: "#FFF3E0", justifyContent: "center", alignItems: "center" }]}>
      <Text style={{ fontFamily: fontFamilies.heavy, color: C.ink }}>Redirecting to Games…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGradient: { ...StyleSheet.absoluteFillObject },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  titlePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.onAmber,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 14,
  },
  titlePillEmoji: { fontSize: 14 },
  titlePillText: { fontSize: 13, fontFamily: fontFamilies.heavy, color: C.white },
  simContent: { paddingHorizontal: 20, gap: 20 },
  sectionCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    elevation: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    gap: 14,
  },
  cardTitle: { fontSize: 14, fontFamily: fontFamilies.heavy, color: C.ink },
  sectionSubtitle: { fontSize: 12, fontFamily: fontFamilies.regular, color: C.muted, lineHeight: 18 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.border,
  },
  pillText: { fontSize: 13, fontFamily: fontFamilies.heavy, color: C.inkSoft },
  pillTextActive: { color: C.white },
  pillEmoji: { fontSize: 14, fontFamily: fontFamilies.heavy, color: C.inkSoft },
  primaryBtn: {
    backgroundColor: C.amber,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderBottomWidth: 4,
    borderBottomColor: C.amberDark,
  },
  primaryBtnText: { fontSize: 15, fontFamily: fontFamilies.heavy, color: C.white },
  primaryBtnEmoji: { fontSize: 16 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: { opacity: 0.35 },
  stepperBtnText: { fontSize: 20, fontFamily: fontFamilies.heavy, color: C.white },
  stepperValue: {
    minWidth: 52,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  stepperValueText: { fontSize: 16, fontFamily: fontFamilies.heavy },
  sliderRow: { gap: 10 },
  sliderLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sliderLabel: { fontSize: 13, fontFamily: fontFamilies.heavy, color: C.ink },
  sliderValuePill: { backgroundColor: C.cream, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  sliderValueText: { fontSize: 12, fontFamily: fontFamilies.heavy, color: C.amberDark },
  sliderTrackRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sliderDec: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderDecText: { fontSize: 18, fontFamily: fontFamilies.heavy, color: C.ink },
  sliderTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFE3B3",
    overflow: "hidden",
    position: "relative",
  },
  sliderFill: { height: "100%", borderRadius: 5, backgroundColor: C.amber },
  sliderThumb: {
    position: "absolute",
    top: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.amber,
    borderWidth: 3,
    borderColor: C.white,
    marginLeft: -11,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  detectorBox: {
    backgroundColor: C.cream,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#FFDD8D",
  },
  detectorLabel: { fontSize: 11, fontFamily: fontFamilies.bold, color: C.muted, textTransform: "uppercase", letterSpacing: 1 },
  detectorValue: { fontSize: 22, fontFamily: fontFamilies.heavy, color: C.ink },
  challengeCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: C.white,
    borderWidth: 2,
    borderBottomWidth: 4,
    gap: 10,
    elevation: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  challengeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  challengeTitle: { fontSize: 14, fontFamily: fontFamilies.heavy, color: C.ink },
  challengeText: { fontSize: 13, fontFamily: fontFamilies.regular, color: C.inkSoft, lineHeight: 20 },
  challengeTap: { fontSize: 12, fontFamily: fontFamilies.bold, color: C.amberDark },
  tableHeader: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableHeaderCell: { flex: 1, fontSize: 11, fontFamily: fontFamilies.heavy, color: C.muted, textTransform: "uppercase" },
  tableRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tableCell: { flex: 1, fontSize: 12, fontFamily: fontFamilies.regular, color: C.inkSoft },
  resultIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  resultEmoji: { fontSize: 24 },
  resultTitle: { fontSize: 18, fontFamily: fontFamilies.heavy, color: C.ink, textAlign: "center" },
  resultSubtitle: { fontSize: 13, fontFamily: fontFamilies.regular, color: C.inkSoft, lineHeight: 20, textAlign: "center" },
  conceptPill: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", gap: 2 },
  conceptPillLabel: { fontSize: 11, fontFamily: fontFamilies.bold, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 },
  conceptPillValue: { fontSize: 13, fontFamily: fontFamilies.heavy, color: C.amberDark },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", borderWidth: 2 },
  actionBtnPrimary: { backgroundColor: C.amber, borderColor: C.amberDark, borderBottomWidth: 4 },
  actionBtnGhost: { backgroundColor: C.white, borderColor: C.border },
  actionBtnText: { fontSize: 13, fontFamily: fontFamilies.heavy, color: C.inkSoft },
  actionBtnTextPrimary: { color: C.white },
  hintBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center",
  },
  hintText: { flex: 1, fontSize: 12, fontFamily: fontFamilies.regular, color: C.inkSoft, lineHeight: 18 },
  targetCard: {
    backgroundColor: C.amberOuter,
    borderRadius: 26,
    padding: 16,
    borderWidth: 2,
    borderColor: C.amber,
    borderBottomWidth: 4,
    gap: 10,
  },
  targetHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  levelPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  levelPillText: { fontSize: 11, fontFamily: fontFamilies.heavy, color: C.white },
  targetLabel: { fontSize: 16, fontFamily: fontFamilies.heavy, color: C.onAmber, flex: 1 },
  targetHint: { fontSize: 12, fontFamily: fontFamilies.regular, color: C.onAmber, opacity: 0.8 },
  nucleus: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.onAmber,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 3,
    borderColor: C.amber,
  },
  nucleusSymbol: { fontSize: 32, fontFamily: fontFamilies.heavy, color: C.white },
  nucleusCounts: { flexDirection: "row", gap: 12 },
  nucleusCount: { fontSize: 12, fontFamily: fontFamilies.heavy, color: C.cream },
  electronCloud: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 220 },
  electronDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.amber },
  electronMore: { fontSize: 12, fontFamily: fontFamilies.heavy, color: C.muted },
  atomCaption: { fontSize: 12, fontFamily: fontFamilies.heavy, color: C.muted },
  buildRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  buildLabel: { fontSize: 13, fontFamily: fontFamilies.heavy, color: C.ink },
  wrongCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center",
  },
  wrongTitle: { fontSize: 13, fontFamily: fontFamilies.heavy, color: C.amberDark },
  wrongText: { fontSize: 12, fontFamily: fontFamilies.regular, color: C.inkSoft, lineHeight: 18, marginTop: 2 },
  adjustBtn: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  adjustBtnText: { fontSize: 12, fontFamily: fontFamilies.heavy, color: C.ink },
  atomStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: C.cream,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  atomStat: { alignItems: "center", gap: 2 },
  atomStatValue: { fontSize: 16, fontFamily: fontFamilies.heavy, color: C.amber },
  atomStatLabel: { fontSize: 11, fontFamily: fontFamilies.bold, color: C.muted },
  atomStatDivider: { width: 1, height: 32, backgroundColor: "#FFDD8D" },
  sampleStatsRow: { flexDirection: "row", gap: 12 },
  sampleStat: { flex: 1, backgroundColor: C.cream, borderRadius: 12, padding: 10, alignItems: "center", gap: 2 },
  sampleStatValue: { fontSize: 16, fontFamily: fontFamilies.heavy, color: C.ink },
  sampleStatLabel: { fontSize: 11, fontFamily: fontFamilies.bold, color: C.muted },
  sampleBox: { gap: 10, alignItems: "center" },
  dotGrid: { flexDirection: "row", flexWrap: "wrap", width: 160, gap: 4, justifyContent: "center" },
  dot: { width: 12, height: 12, borderRadius: 6 },
  sampleCaption: { fontSize: 11, fontFamily: fontFamilies.bold, color: C.muted },
  graphWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    backgroundColor: "#FAFAFA",
    gap: 6,
  },
  graphLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 },
  graphLabel: { fontSize: 10, fontFamily: fontFamilies.bold, color: C.muted },
  compareTable: { gap: 8 },
  compareRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  compareDot: { width: 10, height: 10, borderRadius: 5 },
  compareLabel: { flex: 1, fontSize: 13, fontFamily: fontFamilies.heavy, color: C.ink },
  compareHalfLife: { fontSize: 12, fontFamily: fontFamilies.regular, color: C.muted },
  compareText: { fontSize: 12, fontFamily: fontFamilies.regular, color: C.inkSoft, lineHeight: 18 },
  conclusionInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.cream,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  conclusionInlineText: { flex: 1, fontSize: 12, fontFamily: fontFamilies.bold, lineHeight: 18 },
});

