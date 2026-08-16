import {fontFamilies} from "@/theme";
import { Icon } from '@/components/ui/icon';
import { HowToPlayCard } from '@/components/games/HowToPlayCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { 
  FadeInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  withRepeat,
  interpolate,
  Extrapolate,
  useAnimatedScrollHandler,
  type SharedValue,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 80;
const CARD_SPACING = 20;

const THEME = {
  bg: '#0A0E27',
  card: '#1A1F3A',
  text: '#FFFFFF',
  textMuted: '#8B92B2',
  primary: '#00D9FF',
  secondary: '#7B2CBF',
  accent: '#FF006E',
  success: '#06FFA5',
  danger: '#FF006E',
  border: '#2A2F4A',
  glow: '#00D9FF',
};

type LabMode = 'entrance' | 'dose-visualizer' | 'energy-showdown';

interface ExperimentCardData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  color: string;
  gradient: [string, string];
  guide?: false;
}

interface GuideCardData {
  id: string;
  icon: string;
  guide: true;
}

type ExperimentEntry = ExperimentCardData | GuideCardData;

const guidePalette = {
  cardBg: THEME.card,
  cardBorder: THEME.border,
  primaryText: THEME.text,
  mutedText: THEME.textMuted,
  subtleBg: 'rgba(255, 255, 255, 0.06)',
  subtleBorder: THEME.border,
  iconWrapBg: 'rgba(255, 255, 255, 0.1)',
};

const HOW_TO_PLAY_STEPS = [
  {
    id: 'choose',
    title: 'Pick an Experiment',
    hint: 'Swipe between Dose Visualizer and Energy Showdown.',
    icon: 'Layer',
  },
  {
    id: 'compare',
    title: 'Tap & Compare',
    hint: 'Tap sources and switch metrics to compare the values.',
    icon: 'Chart',
  },
  {
    id: 'verdict',
    title: 'Learn the Verdict',
    hint: 'Read the verdicts and see why nuclear wins on safety.',
    icon: 'InfoCircle',
  },
];

function ExperimentCardView({
  exp,
  scrollX,
  index,
  onSelectSim,
}: {
  exp: ExperimentEntry;
  scrollX: SharedValue<number>;
  index: number;
  onSelectSim: (sim: 'dose-visualizer' | 'energy-showdown') => void;
}) {
  const animatedCardStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + CARD_SPACING),
      index * (CARD_WIDTH + CARD_SPACING),
      (index + 1) * (CARD_WIDTH + CARD_SPACING),
    ];

    return {
      transform: [
        {
          scale: interpolate(
            scrollX.value,
            inputRange,
            [0.9, 1, 0.9],
            Extrapolate.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        scrollX.value,
        inputRange,
        [0.6, 1, 0.6],
        Extrapolate.CLAMP,
      ),
    };
  });

  if (exp.guide) {
    return (
      <Animated.View
        style={[styles.experimentCard, { width: CARD_WIDTH }, animatedCardStyle]}
      >
        <View style={styles.howToSlide}>
          <View style={styles.experimentIconContainer}>
            <Icon name={exp.icon} size={64} color={THEME.primary} variant="Bold" />
          </View>
          <View style={{ width: '100%' }}>
            <HowToPlayCard
              steps={HOW_TO_PLAY_STEPS}
              palette={guidePalette}
              accentColor={THEME.primary}
            />
          </View>
          <View style={styles.howToHint}>
            <Icon name="ArrowLeft2" size={16} color={THEME.textMuted} />
            <Text style={styles.howToHintText}>Swipe to explore</Text>
            <Icon name="ArrowRight2" size={16} color={THEME.textMuted} />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.experimentCard, { width: CARD_WIDTH }, animatedCardStyle]}
    >
      <LinearGradient
        colors={exp.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.experimentGradient}
      >
        <View style={styles.experimentIconContainer}>
          <Text style={styles.experimentIcon}>{exp.icon}</Text>
        </View>
        <Text style={styles.experimentTitle}>{exp.title}</Text>
        <Text style={styles.experimentSubtitle}>{exp.subtitle}</Text>
        <Text style={styles.experimentDescription}>{exp.description}</Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => onSelectSim(exp.id as 'dose-visualizer' | 'energy-showdown')}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>START EXPERIMENT</Text>
          <Icon name="ArrowRight2" size={20} color="#000" variant="Bold" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

// Entrance Screen Component
function EntranceScreen({ onSelectSim }: { onSelectSim: (sim: 'dose-visualizer' | 'energy-showdown') => void }) {
  const scrollX = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const experiments: ExperimentEntry[] = [
    {
      id: 'dose-visualizer',
      title: 'Dose Visualizer',
      subtitle: 'Radiation Comparison',
      icon: '⚛️',
      description: 'Discover how nuclear power compares to everyday radiation sources',
      color: '#00D9FF',
      gradient: ['#00D9FF', '#7B2CBF'],
    },
    {
      id: 'energy-showdown',
      title: 'Energy Showdown',
      subtitle: 'Safety & Cleanliness',
      icon: '⚡',
      description: 'Compare nuclear energy safety and emissions vs fossil fuels',
      color: '#06FFA5',
      gradient: ['#06FFA5', '#00D9FF'],
    },
    {
      id: 'how-to-play',
      icon: 'Activity',
      guide: true,
    },
  ];

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.05, { duration: 2000 }),
      -1,
      true
    );
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000 }),
      -1,
      false
    );
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const animatedTitleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.entranceContainer}>
      {/* Animated Background */}
      <View style={styles.backgroundGlow}>
        <Animated.View style={[styles.glowCircle, { top: 100, left: 50 }, animatedIconStyle]} />
        <Animated.View style={[styles.glowCircle, { bottom: 150, right: 80 }, animatedIconStyle]} />
      </View>

      {/* Header */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.entranceHeader}>
        <Animated.View style={animatedIconStyle}>
          <Text style={styles.mainIcon}>⚛️</Text>
        </Animated.View>
        <Animated.View style={animatedTitleStyle}>
          <Text style={styles.entranceTitle}>SIMULATION LAB</Text>
          <Text style={styles.entranceSubtitle}>Interactive Nuclear Science</Text>
        </Animated.View>
      </Animated.View>

      {/* Carousel */}
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
      >
        {experiments.map((exp, index) => (
          <ExperimentCardView
            key={exp.id}
            exp={exp}
            scrollX={scrollX}
            index={index}
            onSelectSim={onSelectSim}
          />
        ))}
      </Animated.ScrollView>

      {/* Indicators */}
      <View style={styles.indicators}>
        {experiments.map((_, index) => {
          const isActive = Math.round(scrollX.value / (CARD_WIDTH + CARD_SPACING)) === index;
          return (
            <View
              key={index}
              style={[
                styles.indicator,
                isActive && styles.indicatorActive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

// Sim #1: Dose Visualizer
function DoseVisualizer({ onBack }: { onBack: () => void }) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const bananaValue = 0.1; // μSv per banana
  const nuclearPlantValue = 0.09; // μSv per year living near plant
  const xrayValue = 0.1; // μSv per chest X-ray
  const flightValue = 5; // μSv per transatlantic flight

  const sources = [
    { name: 'Nuclear Power Plant', value: nuclearPlantValue, emoji: '⚛️', color: '#00D9FF', description: 'Living near a plant for 1 year' },
    { name: 'Eating 1 Banana', value: bananaValue, emoji: '🍌', color: '#FFD700', description: 'Just one banana!' },
    { name: 'Chest X-Ray', value: xrayValue, emoji: '🏥', color: '#06FFA5', description: 'One medical X-ray' },
    { name: 'Flight to Europe', value: flightValue, emoji: '✈️', color: '#FF006E', description: 'One transatlantic flight' },
  ];

  const maxValue = Math.max(...sources.map(s => s.value));
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    setTimeout(() => setAnimationProgress(1), 300);
  }, []);

  const getBarHeight = (value: number) => {
    return (value / maxValue) * 100;
  };

  return (
    <ScrollView style={styles.simContainer} contentContainerStyle={styles.simContent}>
      {/* Header */}
      <View style={styles.simHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
        </TouchableOpacity>
        <View style={styles.simHeaderContent}>
          <Text style={styles.simTitle}>Dose Visualizer</Text>
          <Text style={styles.simSubtitle}>Radiation Comparison</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Key Insight Card */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.insightCard}>
        <LinearGradient
          colors={['#00D9FF', '#7B2CBF']}
          style={styles.insightGradient}
        >
          <Text style={styles.insightEmoji}>💡</Text>
          <Text style={styles.insightTitle}>Surprising Fact!</Text>
          <Text style={styles.insightText}>
            A nuclear power plant emits LESS radiation than eating a banana! 
            Living near a plant for a year gives you less radiation than one banana.
          </Text>
        </LinearGradient>
      </Animated.View>

      {/* Comparison Visualization */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.comparisonContainer}>
        <Text style={styles.comparisonTitle}>Radiation Dose Comparison</Text>
        <Text style={styles.comparisonSubtitle}>All values in microsieverts (μSv)</Text>

        {sources.map((source, index) => {
          const barHeight = getBarHeight(source.value);
          const isSelected = selectedSource === source.name;
          const isNuclear = source.name === 'Nuclear Power Plant';
          const isBanana = source.name === 'Eating 1 Banana';

          return (
            <TouchableOpacity
              key={source.name}
              style={[styles.sourceCard, isSelected && styles.sourceCardSelected]}
              onPress={() => setSelectedSource(isSelected ? null : source.name)}
              activeOpacity={0.8}
            >
              <View style={styles.sourceHeader}>
                <View style={[styles.sourceIconContainer, { backgroundColor: source.color + '20' }]}>
                  <Text style={styles.sourceEmoji}>{source.emoji}</Text>
                </View>
                <View style={styles.sourceInfo}>
                  <Text style={styles.sourceName}>{source.name}</Text>
                  <Text style={styles.sourceDescription}>{source.description}</Text>
                </View>
                <View style={styles.sourceValueContainer}>
                  <Text style={[styles.sourceValue, { color: source.color }]}>
                    {source.value} μSv
                  </Text>
                </View>
              </View>

              {/* Animated Bar */}
              <View style={styles.barContainer}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      width: `${barHeight * animationProgress}%`,
                      backgroundColor: source.color,
                    },
                  ]}
                />
              </View>

              {/* Special Highlight */}
              {(isNuclear || isBanana) && (
                <Animated.View entering={FadeInDown} style={styles.highlightBox}>
                  <Text style={styles.highlightText}>
                    {isNuclear 
                      ? '✨ Less radiation than a banana!'
                      : '🍌 This is the comparison baseline'}
                  </Text>
                </Animated.View>
              )}

              {/* Expanded Details */}
              {isSelected && (
                <Animated.View entering={FadeInDown} style={styles.expandedDetails}>
                  <Text style={styles.detailText}>
                    {source.name === 'Nuclear Power Plant'
                      ? 'Living near a nuclear power plant for an entire year exposes you to less radiation than eating a single banana. Nuclear plants are heavily regulated and designed to minimize radiation exposure to near-zero levels.'
                      : source.name === 'Eating 1 Banana'
                      ? 'Bananas contain naturally occurring potassium-40, a radioactive isotope. This is completely safe and natural - you\'d need to eat millions of bananas to see any health effects!'
                      : source.description}
                  </Text>
                </Animated.View>
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Conclusion */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.conclusionCard}>
        <Text style={styles.conclusionTitle}>🎯 The Verdict</Text>
        <Text style={styles.conclusionText}>
          Nuclear power plants are so safe that they emit less radiation than everyday activities 
          like eating bananas or flying on airplanes. The fear of radiation from nuclear power 
          is largely unfounded when compared to natural sources we encounter daily.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

// Sim #2: Energy Showdown
function EnergyShowdown({ onBack }: { onBack: () => void }) {
  const [selectedMetric, setSelectedMetric] = useState<'safety' | 'emissions'>('safety');
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    setTimeout(() => setAnimationProgress(1), 300);
  }, []);

  const safetyData = {
    nuclear: { deaths: 0.07, label: 'Nuclear', color: '#00D9FF', emoji: '⚛️' },
    renewable: { deaths: 0.04, label: 'Renewable', color: '#06FFA5', emoji: '🌱' },
    coal: { deaths: 24.6, label: 'Coal', color: '#FF006E', emoji: '🔥' },
    gas: { deaths: 2.8, label: 'Natural Gas', color: '#FF9500', emoji: '💨' },
  };

  const emissionsData = {
    nuclear: { co2: 12, label: 'Nuclear', color: '#00D9FF', emoji: '⚛️' },
    renewable: { co2: 41, label: 'Renewable', color: '#06FFA5', emoji: '🌱' },
    coal: { co2: 820, label: 'Coal', color: '#FF006E', emoji: '🔥' },
    gas: { co2: 490, label: 'Natural Gas', color: '#FF9500', emoji: '💨' },
  };

  const currentData = selectedMetric === 'safety' ? safetyData : emissionsData;
  const maxValue = Math.max(...Object.values(currentData).map(d => selectedMetric === 'safety' ? d.deaths : d.co2));

  const getBarHeight = (value: number) => {
    return (value / maxValue) * 100;
  };

  return (
    <ScrollView style={styles.simContainer} contentContainerStyle={styles.simContent}>
      {/* Header */}
      <View style={styles.simHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
        </TouchableOpacity>
        <View style={styles.simHeaderContent}>
          <Text style={styles.simTitle}>Energy Showdown</Text>
          <Text style={styles.simSubtitle}>Nuclear vs Fossil Fuels</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Metric Selector */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.metricSelector}>
        <TouchableOpacity
          style={[styles.metricButton, selectedMetric === 'safety' && styles.metricButtonActive]}
          onPress={() => {
            setSelectedMetric('safety');
            setAnimationProgress(0);
            setTimeout(() => setAnimationProgress(1), 300);
          }}
        >
          <Text style={[styles.metricButtonText, selectedMetric === 'safety' && styles.metricButtonTextActive]}>
            🛡️ Safety
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.metricButton, selectedMetric === 'emissions' && styles.metricButtonActive]}
          onPress={() => {
            setSelectedMetric('emissions');
            setAnimationProgress(0);
            setTimeout(() => setAnimationProgress(1), 300);
          }}
        >
          <Text style={[styles.metricButtonText, selectedMetric === 'emissions' && styles.metricButtonTextActive]}>
            🌍 Emissions
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Key Insight */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.insightCard}>
        <LinearGradient
          colors={selectedMetric === 'safety' ? ['#06FFA5', '#00D9FF'] : ['#00D9FF', '#7B2CBF']}
          style={styles.insightGradient}
        >
          <Text style={styles.insightEmoji}>
            {selectedMetric === 'safety' ? '🛡️' : '🌍'}
          </Text>
          <Text style={styles.insightTitle}>
            {selectedMetric === 'safety' 
              ? 'Nuclear is Safer Than Coal'
              : 'Nuclear is Cleaner Than Coal'}
          </Text>
          <Text style={styles.insightText}>
            {selectedMetric === 'safety'
              ? `Nuclear energy causes ${Math.round(safetyData.coal.deaths / safetyData.nuclear.deaths).toLocaleString()}x fewer deaths than coal per unit of electricity produced.`
              : `Nuclear produces ${Math.round(emissionsData.coal.co2 / emissionsData.nuclear.co2).toLocaleString()}x less CO₂ emissions than coal.`}
          </Text>
        </LinearGradient>
      </Animated.View>

      {/* Comparison Chart */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          {selectedMetric === 'safety' ? 'Deaths per TWh' : 'CO₂ Emissions (g/kWh)'}
        </Text>
        <Text style={styles.chartSubtitle}>
          {selectedMetric === 'safety' 
            ? 'Lower is safer'
            : 'Lower is cleaner'}
        </Text>

        {Object.entries(currentData).map(([key, data]) => {
          const value = selectedMetric === 'safety' ? data.deaths : data.co2;
          const barHeight = getBarHeight(value);
          const isNuclear = key === 'nuclear';
          const isCoal = key === 'coal';

          return (
            <View key={key} style={styles.energyCard}>
              <View style={styles.energyHeader}>
                <View style={[styles.energyIconContainer, { backgroundColor: data.color + '20' }]}>
                  <Text style={styles.energyEmoji}>{data.emoji}</Text>
                </View>
                <View style={styles.energyInfo}>
                  <Text style={styles.energyLabel}>{data.label}</Text>
                  <Text style={styles.energyValue}>
                    {selectedMetric === 'safety' 
                      ? `${data.deaths.toFixed(2)} deaths/TWh`
                      : `${data.co2} g CO₂/kWh`}
                  </Text>
                </View>
                {(isNuclear || isCoal) && (
                  <View style={[styles.badge, isNuclear ? styles.badgeGood : styles.badgeBad]}>
                    <Text style={styles.badgeText}>
                      {isNuclear ? '✅ Best' : '❌ Worst'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Animated Bar */}
              <View style={styles.chartBarContainer}>
                <Animated.View
                  style={[
                    styles.chartBar,
                    {
                      width: `${barHeight * animationProgress}%`,
                      backgroundColor: data.color,
                    },
                  ]}
                />
              </View>

              {/* Comparison Text */}
              {isNuclear && isCoal && (
                <Animated.View entering={FadeInDown.delay(500)} style={styles.comparisonText}>
                  <Text style={styles.comparisonTextContent}>
                    Nuclear is {Math.round(
                      selectedMetric === 'safety' 
                        ? safetyData.coal.deaths / safetyData.nuclear.deaths
                        : emissionsData.coal.co2 / emissionsData.nuclear.co2
                    ).toLocaleString()}x {selectedMetric === 'safety' ? 'safer' : 'cleaner'} than coal!
                  </Text>
                </Animated.View>
              )}
            </View>
          );
        })}
      </Animated.View>

      {/* Conclusion */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.conclusionCard}>
        <Text style={styles.conclusionTitle}>🎯 The Verdict</Text>
        <Text style={styles.conclusionText}>
          {selectedMetric === 'safety'
            ? 'Nuclear energy is one of the safest forms of energy production, causing significantly fewer deaths than coal and fossil fuels. The data clearly shows nuclear power is a safe choice for our energy future.'
            : 'Nuclear energy produces minimal CO₂ emissions compared to fossil fuels like coal. It\'s one of the cleanest energy sources available, helping fight climate change.'}
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

export default function LabScreen() {
  const { exp } = useLocalSearchParams<{ exp?: string }>();
  const initialMode: LabMode =
    exp === 'dose-visualizer' || exp === 'energy-showdown' ? exp : 'entrance';
  const [mode, setMode] = useState<LabMode>(initialMode);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {mode === 'entrance' && (
          <EntranceScreen 
            onSelectSim={(sim) => setMode(sim)}
          />
        )}
        {mode === 'dose-visualizer' && (
          <DoseVisualizer onBack={() => setMode('entrance')} />
        )}
        {mode === 'energy-showdown' && (
          <EnergyShowdown onBack={() => setMode('entrance')} />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  // Entrance Styles
  entranceContainer: {
    flex: 1,
    paddingTop: 40,
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: THEME.primary + '20',
    position: 'absolute',
  },
  entranceHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  mainIcon: {
    fontSize: 80,
    fontFamily: fontFamilies.regular,
    marginBottom: 20,
  },
  entranceTitle: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: fontFamilies.black,
    color: THEME.text,
    letterSpacing: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  entranceSubtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
    letterSpacing: 2,
    textAlign: 'center',
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  experimentCard: {
    marginRight: CARD_SPACING,
    borderRadius: 24,
    overflow: 'hidden',
  },
  howToSlide: {
    padding: 32,
    minHeight: 400,
    backgroundColor: THEME.card,
    borderColor: THEME.border,
    borderWidth: 2,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  howToHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  howToHintText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fontFamilies.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  experimentGradient: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 24,
    minHeight: 400,
    justifyContent: 'space-between',
  },
  experimentIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  experimentIcon: {
    fontSize: 64,
    fontFamily: fontFamilies.regular,
  },
  experimentTitle: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: fontFamilies.black,
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  experimentSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: 'rgba(0,0,0,0.7)',
    marginBottom: 16,
    textAlign: 'center',
  },
  experimentDescription: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: fontFamilies.heavy,
    color: '#FFF',
    letterSpacing: 1,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 40,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.border,
  },
  indicatorActive: {
    backgroundColor: THEME.primary,
    width: 24,
  },
  // Simulation Styles
  simContainer: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  simContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simHeaderContent: {
    flex: 1,
    alignItems: 'center',
  },
  simTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
  },
  simSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
    marginTop: 4,
  },
  insightCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  insightGradient: {
    padding: 24,
    alignItems: 'center',
  },
  insightEmoji: {
    fontSize: 48,
    fontFamily: fontFamilies.regular,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: fontFamilies.heavy,
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  insightText: {
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    color: 'rgba(0,0,0,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  comparisonContainer: {
    marginBottom: 24,
  },
  comparisonTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    marginBottom: 8,
  },
  comparisonSubtitle: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
    marginBottom: 20,
  },
  sourceCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  sourceCardSelected: {
    borderColor: THEME.primary,
    borderWidth: 3,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sourceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sourceEmoji: {
    fontSize: 28,
    fontFamily: fontFamilies.regular,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    marginBottom: 4,
  },
  sourceDescription: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
  },
  sourceValueContainer: {
    alignItems: 'flex-end',
  },
  sourceValue: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fontFamilies.heavy,
  },
  barContainer: {
    height: 12,
    backgroundColor: THEME.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  bar: {
    height: '100%',
    borderRadius: 6,
  },
  highlightBox: {
    backgroundColor: THEME.primary + '20',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  highlightText: {
    fontSize: 13,
    color: THEME.primary,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    textAlign: 'center',
  },
  expandedDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  detailText: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
    lineHeight: 20,
  },
  conclusionCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: THEME.success + '40',
    marginTop: 16,
  },
  conclusionTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  conclusionText: {
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
    lineHeight: 24,
    textAlign: 'center',
  },
  // Energy Showdown Styles
  metricSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricButton: {
    flex: 1,
    backgroundColor: THEME.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: 'center',
  },
  metricButtonActive: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primary + '20',
  },
  metricButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: THEME.textMuted,
  },
  metricButtonTextActive: {
    color: THEME.primary,
  },
  chartContainer: {
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    marginBottom: 8,
  },
  chartSubtitle: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: THEME.textMuted,
    marginBottom: 20,
  },
  energyCard: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  energyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  energyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  energyEmoji: {
    fontSize: 28,
    fontFamily: fontFamilies.regular,
  },
  energyInfo: {
    flex: 1,
  },
  energyLabel: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    marginBottom: 4,
  },
  energyValue: {
    fontSize: 14,
    color: THEME.textMuted,
    fontWeight: '600',
    fontFamily: fontFamilies.semibold,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeGood: {
    backgroundColor: THEME.success + '20',
  },
  badgeBad: {
    backgroundColor: THEME.danger + '20',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: THEME.text,
  },
  chartBarContainer: {
    height: 24,
    backgroundColor: THEME.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    borderRadius: 12,
  },
  comparisonText: {
    marginTop: 16,
    padding: 16,
    backgroundColor: THEME.primary + '20',
    borderRadius: 12,
  },
  comparisonTextContent: {
    fontSize: 15,
    color: THEME.primary,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    textAlign: 'center',
  },
});
