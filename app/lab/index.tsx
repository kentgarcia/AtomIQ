import { fontFamilies, useTheme } from "@/theme";
import { DURATION, EASE_OUT, PRESS_EASING } from "@/theme/motion";
import { Icon } from "@/components/ui/icon";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ------------------------------------------------------------------
// Dose Visualizer — autumn redesign
// ------------------------------------------------------------------
function DoseVisualizer({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const THEME = theme.palettes.tab;
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const bgTop = theme.mode === "dark" ? THEME.bg : "#FFF3E0";
  const bgBottom = theme.mode === "dark" ? THEME.bg : "#FFFFFF";

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const pressed = useSharedValue(0);

  const bananaValue = 0.1;
  const nuclearPlantValue = 0.09;
  const xrayValue = 0.1;
  const flightValue = 5;

  const sources = [
    { name: "Nuclear Power Plant", value: nuclearPlantValue, emoji: "⚛️", color: "#FF8C00", description: "Living near a plant for 1 year", detail: "Living near a nuclear power plant for an entire year exposes you to less radiation than eating a single banana. Plants are heavily regulated to keep exposure near-zero." },
    { name: "Eating 1 Banana", value: bananaValue, emoji: "🍌", color: "#FFB300", description: "Just one banana!", detail: "Bananas contain potassium-40, a natural radioactive isotope. Completely safe — you'd need millions to see any effect." },
    { name: "Chest X-Ray", value: xrayValue, emoji: "🏥", color: "#2ECC71", description: "One medical X-ray", detail: "A single chest X-ray is a routine, low-dose medical procedure — comparable to a banana or a year near a plant." },
    { name: "Flight to Europe", value: flightValue, emoji: "✈️", color: "#FF6B6B", description: "One transatlantic flight", detail: "Cosmic radiation increases at altitude. A single long flight gives you ~50× more dose than a year near a nuclear plant." },
  ];

  const maxValue = Math.max(...sources.map((s) => s.value));

  useEffect(() => {
    const t = setTimeout(() => setProgress(1), 320);
    return () => clearTimeout(t);
  }, []);

  const getBarWidth = (value: number) => (value / maxValue) * 100 * progress;

  const handleSelect = useCallback((name: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSource((prev) => (prev === name ? null : name));
  }, []);

  const backPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.06 }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      <LinearGradient colors={[bgTop, bgBottom]} style={styles.bgGradient} pointerEvents="none" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.simContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.simHeaderRow}>
          <Animated.View style={backPressStyle}>
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.85}
              onPressIn={() => (pressed.value = withTiming(1, { duration: DURATION.press, easing: PRESS_EASING }))}
              onPressOut={() => (pressed.value = withTiming(0, { duration: DURATION.press, easing: PRESS_EASING }))}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onBack();
              }}
            >
              <Icon name="ArrowLeft2" size={20} color="#555555" variant="Bold" />
            </TouchableOpacity>
          </Animated.View>
          <View style={styles.simTitlePill}>
            <Icon name="Activity" size={14} color="#FFFFFF" variant="Bold" />
            <Text style={styles.simTitlePillText}>Dose Visualizer</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Insight — amber outer like profileCard */}
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.springify()}
          layout={reducedMotion ? undefined : LinearTransition.duration(DURATION.medium).easing(EASE_OUT)}
          style={styles.insightOuter}
        >
          <View style={styles.insightHeaderRow}>
            <View style={styles.insightPill}>
              <Text style={styles.insightPillText}>💡 Surprising Fact</Text>
            </View>
            <View style={styles.insightIconCircle}>
              <Icon name="Flash" size={16} color="#FF8C00" variant="Bold" />
            </View>
          </View>
          <View style={styles.insightInner}>
            <Text style={styles.insightTitle}>Less than a banana!</Text>
            <Text style={styles.insightText}>A year living near a nuclear plant gives you less radiation than eating a single banana. The fear is larger than the dose.</Text>
            <View style={styles.insightStatRow}>
              <View style={styles.insightStat}>
                <Text style={styles.insightStatValue}>0.09 μSv</Text>
                <Text style={styles.insightStatLabel}>Plant / year</Text>
              </View>
              <View style={styles.insightDivider} />
              <View style={styles.insightStat}>
                <Text style={styles.insightStatValue}>0.10 μSv</Text>
                <Text style={styles.insightStatLabel}>One banana</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Comparison */}
        <Animated.View entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(80).springify()} style={[styles.sectionCard, { borderColor: THEME.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Radiation Dose Comparison</Text>
            <View style={styles.mutedPill}>
              <Text style={styles.mutedPillText}>μSv</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>All values in microsieverts — tap a card for details</Text>

          {sources.map((source, index) => {
            const barWidth = getBarWidth(source.value);
            const isSelected = selectedSource === source.name;
            const isNuclear = source.name === "Nuclear Power Plant";
            const isBanana = source.name === "Eating 1 Banana";
            return (
              <Animated.View
                key={source.name}
                entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(120 + index * 50).springify()}
                layout={reducedMotion ? undefined : LinearTransition.duration(DURATION.small).easing(EASE_OUT)}
              >
                <TouchableOpacity
                  style={[styles.sourceCard, { borderColor: THEME.border }, isSelected && styles.sourceCardSelected]}
                  activeOpacity={0.85}
                  onPress={() => handleSelect(source.name)}
                >
                  <View style={styles.sourceHeader}>
                    <View style={[styles.sourceIconCircle, { backgroundColor: `${source.color}18` }]}>
                      <Text style={styles.sourceEmoji}>{source.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sourceName}>{source.name}</Text>
                      <Text style={styles.sourceDescription}>{source.description}</Text>
                    </View>
                    <View style={[styles.valuePill, { backgroundColor: `${source.color}14` }]}>
                      <Text style={[styles.sourceValue, { color: source.color }]}>{source.value} μSv</Text>
                    </View>
                  </View>

                  <View style={styles.barTrack}>
                    <Animated.View
                      layout={reducedMotion ? undefined : LinearTransition.duration(DURATION.medium).easing(EASE_OUT)}
                      style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: source.color }]}
                    />
                  </View>

                  {(isNuclear || isBanana) && (
                    <View style={[styles.highlightBox, { backgroundColor: `${source.color}10`, borderColor: `${source.color}20` }]}>
                      <Icon name={isNuclear ? "ShieldTick" : "TickCircle"} size={14} color={source.color} variant="Bold" />
                      <Text style={[styles.highlightText, { color: source.color }]}>{isNuclear ? "Less radiation than a banana!" : "Natural baseline — totally safe"}</Text>
                    </View>
                  )}

                  {isSelected && (
                    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.expandedBox}>
                      <Text style={styles.expandedText}>{source.detail}</Text>
                    </Animated.View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Verdict */}
        <Animated.View entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(260).springify()} style={[styles.conclusionCard, { borderColor: "#2ECC71", backgroundColor: "#FFFFFF" }]}>
          <View style={[styles.conclusionIcon, { backgroundColor: "#2ECC71" + "18" }]}>
            <Icon name="Award" size={22} color="#2ECC71" variant="Bold" />
          </View>
          <Text style={styles.conclusionTitle}>The Verdict</Text>
          <Text style={styles.conclusionText}>Nuclear plants emit less radiation than everyday activities like eating bananas or flying. The fear of radiation from nuclear power is real — but the numbers show it&apos;s smaller than nature itself.</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------------
// Energy Showdown — autumn redesign
// ------------------------------------------------------------------
function EnergyShowdown({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const THEME = theme.palettes.tab;
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const bgTop = theme.mode === "dark" ? THEME.bg : "#FFF3E0";
  const bgBottom = theme.mode === "dark" ? THEME.bg : "#FFFFFF";
  const [selectedMetric, setSelectedMetric] = useState<"safety" | "emissions">("safety");
  const [progress, setProgress] = useState(0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    setProgress(0);
    const t = setTimeout(() => setProgress(1), 280);
    return () => clearTimeout(t);
  }, [selectedMetric]);

  const safetyData = {
    nuclear: { deaths: 0.07, label: "Nuclear", color: "#FF8C00", emoji: "⚛️" },
    renewable: { deaths: 0.04, label: "Renewable", color: "#2ECC71", emoji: "🌱" },
    coal: { deaths: 24.6, label: "Coal", color: "#FF6B6B", emoji: "🔥" },
    gas: { deaths: 2.8, label: "Natural Gas", color: "#9CA3AF", emoji: "💨" },
  };

  const emissionsData = {
    nuclear: { co2: 12, label: "Nuclear", color: "#FF8C00", emoji: "⚛️" },
    renewable: { co2: 41, label: "Renewable", color: "#2ECC71", emoji: "🌱" },
    coal: { co2: 820, label: "Coal", color: "#FF6B6B", emoji: "🔥" },
    gas: { co2: 490, label: "Natural Gas", color: "#9CA3AF", emoji: "💨" },
  };

  const currentData = selectedMetric === "safety" ? safetyData : emissionsData;
  const maxValue = Math.max(...Object.values(currentData).map((d: any) => (selectedMetric === "safety" ? d.deaths : d.co2)));
  const getBarWidth = (value: number) => (value / maxValue) * 100 * progress;

  const backPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.06 }],
  }));

  const handleMetric = useCallback((m: "safety" | "emissions") => {
    if (m === selectedMetric) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMetric(m);
  }, [selectedMetric]);

  return (
    <View style={[styles.container, { backgroundColor: bgTop }]}>
      <LinearGradient colors={[bgTop, bgBottom]} style={styles.bgGradient} pointerEvents="none" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.simContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.simHeaderRow}>
          <Animated.View style={backPressStyle}>
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.85}
              onPressIn={() => (pressed.value = withTiming(1, { duration: DURATION.press, easing: PRESS_EASING }))}
              onPressOut={() => (pressed.value = withTiming(0, { duration: DURATION.press, easing: PRESS_EASING }))}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onBack();
              }}
            >
              <Icon name="ArrowLeft2" size={20} color="#555555" variant="Bold" />
            </TouchableOpacity>
          </Animated.View>
          <View style={styles.simTitlePill}>
            <Icon name="ChartSquare" size={14} color="#FFFFFF" variant="Bold" />
            <Text style={styles.simTitlePillText}>Energy Showdown</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Metric selector — segmented pill like home */}
        <Animated.View entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.springify()} style={styles.metricSelector}>
          <TouchableOpacity
            style={[styles.metricBtn, selectedMetric === "safety" && styles.metricBtnActive]}
            activeOpacity={0.85}
            onPress={() => handleMetric("safety")}
          >
            <Icon name="ShieldTick" size={16} color={selectedMetric === "safety" ? "#FFFFFF" : "#9CA3AF"} variant="Bold" />
            <Text style={[styles.metricBtnText, selectedMetric === "safety" && styles.metricBtnTextActive]}>Safety</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.metricBtn, selectedMetric === "emissions" && styles.metricBtnActive]}
            activeOpacity={0.85}
            onPress={() => handleMetric("emissions")}
          >
            <Icon name="Global" size={16} color={selectedMetric === "emissions" ? "#FFFFFF" : "#9CA3AF"} variant="Bold" />
            <Text style={[styles.metricBtnText, selectedMetric === "emissions" && styles.metricBtnTextActive]}>Emissions</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Insight */}
        <Animated.View
          entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(80).springify()}
          layout={reducedMotion ? undefined : LinearTransition.duration(DURATION.medium).easing(EASE_OUT)}
          style={styles.insightOuter}
        >
          <View style={styles.insightHeaderRow}>
            <View style={styles.insightPill}>
              <Text style={styles.insightPillText}>{selectedMetric === "safety" ? "🛡️ Safety fact" : "🌍 Clean fact"}</Text>
            </View>
            <View style={styles.insightIconCircle}>
              <Icon name={selectedMetric === "safety" ? "ShieldTick" : "Global"} size={16} color="#FF8C00" variant="Bold" />
            </View>
          </View>
          <View style={styles.insightInner}>
            <Text style={styles.insightTitle}>{selectedMetric === "safety" ? "Nuclear is safer than coal" : "Nuclear is cleaner than coal"}</Text>
            <Text style={styles.insightText}>
              {selectedMetric === "safety"
                ? `Nuclear causes ${Math.round(safetyData.coal.deaths / safetyData.nuclear.deaths).toLocaleString()}× fewer deaths than coal per TWh.`
                : `Nuclear emits ${Math.round(emissionsData.coal.co2 / emissionsData.nuclear.co2).toLocaleString()}× less CO₂ than coal.`}
            </Text>
            <View style={styles.insightStatRow}>
              <View style={styles.insightStat}>
                <Text style={[styles.insightStatValue, { color: "#FF8C00" }]}>{selectedMetric === "safety" ? "0.07" : "12"}</Text>
                <Text style={styles.insightStatLabel}>{selectedMetric === "safety" ? "Nuclear / TWh" : "Nuclear gCO₂/kWh"}</Text>
              </View>
              <View style={styles.insightDivider} />
              <View style={styles.insightStat}>
                <Text style={[styles.insightStatValue, { color: "#FF6B6B" }]}>{selectedMetric === "safety" ? "24.6" : "820"}</Text>
                <Text style={styles.insightStatLabel}>{selectedMetric === "safety" ? "Coal / TWh" : "Coal gCO₂/kWh"}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Chart */}
        <Animated.View entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(120).springify()} style={[styles.sectionCard, { borderColor: THEME.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{selectedMetric === "safety" ? "Deaths per TWh" : "CO₂ Emissions (g/kWh)"}</Text>
            <View style={styles.mutedPill}>
              <Text style={styles.mutedPillText}>{selectedMetric === "safety" ? "Lower = safer" : "Lower = cleaner"}</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>{selectedMetric === "safety" ? "Includes accidents + air pollution" : "Lifecycle emissions per kWh"}</Text>

          {Object.entries(currentData).map(([key, data]: any, index) => {
            const value = selectedMetric === "safety" ? data.deaths : data.co2;
            const barWidth = getBarWidth(value);
            const isNuclear = key === "nuclear";
            const isCoal = key === "coal";
            return (
              <Animated.View
                key={key}
                entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(150 + index * 60).springify()}
                layout={reducedMotion ? undefined : LinearTransition.duration(DURATION.small).easing(EASE_OUT)}
              >
                <View style={[styles.energyCard, { borderColor: THEME.border }]}>
                  <View style={styles.energyHeader}>
                    <View style={[styles.energyIconCircle, { backgroundColor: `${data.color}18` }]}>
                      <Text style={styles.energyEmoji}>{data.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.energyLabel}>{data.label}</Text>
                      <Text style={styles.energyValue}>{selectedMetric === "safety" ? `${data.deaths.toFixed(2)} deaths/TWh` : `${data.co2} g CO₂/kWh`}</Text>
                    </View>
                    {(isNuclear || isCoal) && (
                      <View style={[styles.badge, isNuclear ? styles.badgeGood : styles.badgeBad]}>
                        <Icon name={isNuclear ? "TickCircle" : "CloseCircle"} size={12} color={isNuclear ? "#2ECC71" : "#FF6B6B"} variant="Bold" />
                        <Text style={[styles.badgeText, { color: isNuclear ? "#2ECC71" : "#FF6B6B" }]}>{isNuclear ? "Best" : "Worst"}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: data.color }]} />
                  </View>
                  {isNuclear && (
                    <View style={styles.comparisonInline}>
                      <Icon name="ArrowRight2" size={12} color="#FF8C00" variant="Bold" />
                      <Text style={styles.comparisonInlineText}>
                        {Math.round((selectedMetric === "safety" ? safetyData.coal.deaths / safetyData.nuclear.deaths : emissionsData.coal.co2 / emissionsData.nuclear.co2)).toLocaleString()}× {selectedMetric === "safety" ? "safer" : "cleaner"} than coal
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Verdict */}
        <Animated.View entering={reducedMotion ? FadeIn.duration(120) : FadeInDown.delay(320).springify()} style={[styles.conclusionCard, { borderColor: "#FF8C00", backgroundColor: "#FFFFFF" }]}>
          <View style={[styles.conclusionIcon, { backgroundColor: "#FFF3E0" }]}>
            <Icon name="Cup" size={22} color="#FF8C00" variant="Bold" />
          </View>
          <Text style={styles.conclusionTitle}>The Verdict</Text>
          <Text style={styles.conclusionText}>
            {selectedMetric === "safety"
              ? "Nuclear is one of the safest energy sources. When we count real-world deaths from accidents and pollution, nuclear is hundreds of times safer than coal."
              : "Nuclear is one of the cleanest energy sources. Its lifecycle CO₂ is close to wind and solar — and a fraction of coal — helping fight climate change."}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

export default function LabScreen() {
  const router = useRouter();
  const { exp } = useLocalSearchParams<{ exp?: string }>();

  const handleBackToGames = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/awards");
    }
  }, [router]);

  // No simulation tab page — redirect bare /lab to game selection.
  useEffect(() => {
    if (exp !== "dose-visualizer" && exp !== "energy-showdown") {
      const t = setTimeout(() => router.replace("/(tabs)/awards"), 0);
      return () => clearTimeout(t);
    }
  }, [exp, router]);

  if (exp === "dose-visualizer") {
    return <DoseVisualizer onBack={handleBackToGames} />;
  }
  if (exp === "energy-showdown") {
    return <EnergyShowdown onBack={handleBackToGames} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: "#FFF3E0", justifyContent: "center", alignItems: "center" }]}>
      <Text style={{ fontFamily: fontFamilies.heavy, color: "#434343" }}>Redirecting to Games…</Text>
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // Shared section card
  sectionCard: {
    backgroundColor: "#FFFFFF",
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
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { fontSize: 16, fontFamily: fontFamilies.heavy, color: "#333333", flex: 1 },
  sectionSubtitle: { fontSize: 12, fontFamily: fontFamilies.semibold, color: "#9CA3AF", marginTop: -6 },
  mutedPill: { backgroundColor: "#FFF3E0", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  mutedPillText: { fontSize: 11, fontFamily: fontFamilies.heavy, color: "#E67E22" },

  // Sim shared
  simContent: { paddingHorizontal: 20, gap: 20 },
  simHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  simTitlePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#434343",
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 14,
  },
  simTitlePillText: { fontSize: 13, fontFamily: fontFamilies.heavy, color: "#FFFFFF" },

  // Insight outer — amber
  insightOuter: {
    backgroundColor: "#FFCA5F",
    borderRadius: 26,
    padding: 10,
    gap: 10,
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  insightHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 2,
  },
  insightPill: { backgroundColor: "#434343", paddingHorizontal: 12, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  insightPillText: { fontSize: 11, fontFamily: fontFamilies.heavy, color: "#FFFFFF" },
  insightIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFDD8D",
  },
  insightInner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
    gap: 10,
    alignItems: "center",
  },
  insightTitle: { fontSize: 18, fontFamily: fontFamilies.heavy, color: "#333333", textAlign: "center" },
  insightText: { fontSize: 13, fontFamily: fontFamilies.regular, color: "#666666", textAlign: "center", lineHeight: 20 },
  insightStatRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 4, backgroundColor: "#FFF3E0", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  insightStat: { alignItems: "center", gap: 2 },
  insightStatValue: { fontSize: 16, fontFamily: fontFamilies.heavy, color: "#FF8C00" },
  insightStatLabel: { fontSize: 11, fontFamily: fontFamilies.bold, color: "#9CA3AF" },
  insightDivider: { width: 1, height: 32, backgroundColor: "#FFDD8D" },

  // Source / energy cards
  sourceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    gap: 12,
  },
  sourceCardSelected: { borderColor: "#FF8C00", shadowColor: "#FF8C00", shadowOpacity: 0.12 },
  sourceHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  sourceIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  sourceEmoji: { fontSize: 24 },
  sourceName: { fontSize: 14, fontFamily: fontFamilies.heavy, color: "#333333" },
  sourceDescription: { fontSize: 11, fontFamily: fontFamilies.semibold, color: "#9CA3AF", marginTop: 2 },
  valuePill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  sourceValue: { fontSize: 13, fontFamily: fontFamilies.heavy },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: "#FFF3E0", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5 },
  highlightBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  highlightText: { fontSize: 11, fontFamily: fontFamilies.bold },
  expandedBox: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  expandedText: { fontSize: 12, fontFamily: fontFamilies.regular, color: "#555555", lineHeight: 18 },

  // Metric selector
  metricSelector: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderBottomWidth: 4,
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  metricBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  metricBtnActive: { backgroundColor: "#FF8C00", borderColor: "#E67E22" },
  metricBtnText: { fontSize: 13, fontFamily: fontFamilies.heavy, color: "#9CA3AF" },
  metricBtnTextActive: { color: "#FFFFFF" },

  energyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    gap: 12,
  },
  energyHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  energyIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  energyEmoji: { fontSize: 24 },
  energyLabel: { fontSize: 14, fontFamily: fontFamilies.heavy, color: "#333333" },
  energyValue: { fontSize: 11, fontFamily: fontFamilies.semibold, color: "#9CA3AF", marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeGood: { backgroundColor: "#2ECC71" + "14", borderColor: "#2ECC71" + "30" },
  badgeBad: { backgroundColor: "#FF6B6B" + "14", borderColor: "#FF6B6B" + "30" },
  badgeText: { fontSize: 11, fontFamily: fontFamilies.heavy },
  comparisonInline: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF3E0", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  comparisonInlineText: { fontSize: 12, fontFamily: fontFamilies.bold, color: "#E67E22" },

  // Conclusion
  conclusionCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: "center",
    gap: 10,
    elevation: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  conclusionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  conclusionTitle: { fontSize: 18, fontFamily: fontFamilies.heavy, color: "#333333" },
  conclusionText: { fontSize: 13, fontFamily: fontFamilies.regular, color: "#666666", lineHeight: 20, textAlign: "center" },
});
