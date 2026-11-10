import { PageHeader } from '@/components/ui/page-header';
import { SectionHeader } from '@/components/ui/section-header';
import { Icon } from '@/components/ui/icon';
import { getAllJourneys } from '@/content/explorer';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {useTheme, withAlpha, type Palette, fontFamilies, useResponsiveLayout} from "@/theme";

export default function ExplorerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth } = useResponsiveLayout();
  const { theme } = useTheme();
  const THEME = theme.palettes.explorer;
  const styles = useMemo(() => makeStyles(THEME), [THEME]);
  const allJourneys = getAllJourneys();

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <PageHeader
        title={"AtomIQ Explorer"}
        subtitle={"Encarta-Style Knowledge Journey"}
        onBack={() => router.back()}
        palette={THEME}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 20, width: "100%", maxWidth: contentMaxWidth, alignSelf: "center", paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)}>
          <SectionHeader
            title="Guided Knowledge Paths"
            subtitle="Explore nuclear science through curated journeys"
            palette={THEME}
          />

            <View style={styles.journeysContainer}>
              {allJourneys.map((journey, index) => (
                <TouchableOpacity
                  key={journey.id}
                  style={styles.journeyCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/explorer/journey?id=${journey.id}`)}
                >
                  {/* Encarta Kids Style: Image at top */}
                  {journey.coverImage && (
                    <View style={styles.journeyImageContainer}>
                      <Image
                        source={{ uri: journey.coverImage }}
                        style={styles.journeyImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)'] as const}
                        style={styles.journeyImageOverlay}
                      />
                    </View>
                  )}
                  
                  <View style={styles.journeyContent}>
                    <View style={styles.journeyHeader}>
                      <View style={styles.journeyText}>
                        <Text style={styles.journeyTitle}>{journey.title}</Text>
                        <Text style={styles.journeySubtitle}>{journey.subtitle}</Text>
                      </View>
                      <View style={styles.journeyBadge}>
                        <Text style={styles.journeyBadgeText}>{journey.difficulty}</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.journeyDescription}>
                      {journey.description}
                    </Text>
                    
                    <View style={styles.journeyMeta}>
                      <View style={styles.metaItem}>
                        <Icon name="Timer" size={14} color={THEME.textMuted} />
                        <Text style={styles.metaText}>{journey.estimatedMinutes} min</Text>
                      </View>
                      <Text style={styles.metaDot}>•</Text>
                      <View style={styles.metaItem}>
                        <Icon name="Flash" size={14} color={THEME.gold} variant="Bold" />
                        <Text style={styles.metaText}>{journey.xpReward} XP</Text>
                      </View>
                      <Text style={styles.metaDot}>•</Text>
                      <View style={styles.metaItem}>
                        <Icon name="Book" size={14} color={THEME.textMuted} />
                        <Text style={styles.metaText}>{journey.nodes.length} stops</Text>
                      </View>
                    </View>
                    
                    <View style={styles.journeyFooter}>
                      <View style={styles.journeyTags}>
                        {journey.tags.slice(0, 2).map((tag, tagIndex) => (
                          <View key={tagIndex} style={styles.tagPill}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                      <Icon name="ArrowRight2" size={20} color={THEME.primary} variant="Bold" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (THEME: Palette) => StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  journeysContainer: {
    gap: 20,
  },
  journeyCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  journeyImageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  journeyImage: {
    width: '100%',
    height: '100%',
  },
  journeyImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  journeyContent: {
    padding: 20,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  journeyText: {
    flex: 1,
  },
  journeyTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.heavy,
    color: THEME.text,
    marginBottom: 4,
    lineHeight: 26,
  },
  journeySubtitle: {
    fontSize: 14,
    color: THEME.textMuted,
    fontFamily: fontFamilies.semibold,
  },
  journeyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: withAlpha(THEME.primary, 0.08),
    marginLeft: 12,
  },
  journeyBadgeText: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: THEME.primary,
    textTransform: 'uppercase',
  },
  journeyDescription: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: THEME.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  journeyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontFamily: fontFamilies.semibold,
  },
  metaDot: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: THEME.border,
  },
  journeyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journeyTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: THEME.bg,
  },
  tagText: {
    fontSize: 11,
    fontFamily: fontFamilies.semibold,
    color: THEME.textMuted,
    textTransform: 'capitalize',
  },
});

