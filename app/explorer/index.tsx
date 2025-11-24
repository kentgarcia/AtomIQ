import { Icon } from '@/components/ui/icon';
import { journeys, getAllJourneys } from '@/content/explorer';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#FF6B00',
  primaryDark: '#E65100',
  primaryLight: '#FF9E40',
  success: '#2ECC71',
  gold: '#FFC107',
  border: '#E5E7EB',
};

export default function ExplorerScreen() {
  const router = useRouter();
  const allJourneys = getAllJourneys();

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AtomIQ Explorer</Text>
          <Text style={styles.headerSubtitle}>Encarta-Style Knowledge Journey</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Guided Knowledge Paths</Text>
            <Text style={styles.sectionSubtitle}>Explore nuclear science through curated journeys</Text>
          </View>

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
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
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
                    
                    <Text style={styles.journeyDescription} numberOfLines={2}>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: THEME.bg,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: THEME.textMuted,
  },
  journeysContainer: {
    gap: 20,
  },
  journeyCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    shadowColor: '#000',
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
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
    lineHeight: 26,
  },
  journeySubtitle: {
    fontSize: 14,
    color: THEME.textMuted,
    fontWeight: '600',
  },
  journeyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: THEME.primary + '15',
    marginLeft: 12,
  },
  journeyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
    textTransform: 'uppercase',
  },
  journeyDescription: {
    fontSize: 14,
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
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 12,
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
    fontWeight: '600',
    color: THEME.textMuted,
    textTransform: 'capitalize',
  },
});

