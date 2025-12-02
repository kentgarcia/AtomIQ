import { Icon } from '@/components/ui/icon';
import { getAllEncyclopediaEntries, searchEncyclopedia } from '@/content/explorer';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2;

const THEME = {
  bg: '#F8F7FF',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#EA580C',
  primaryDark: '#C2410C',
  primaryLight: '#FFF3E0',
  success: '#58CC02',
  successDark: '#46A302',
  warning: '#FFC800',
  warningDark: '#E5B300',
  info: '#1CB0F6',
  infoDark: '#1899D6',
  purple: '#CE82FF',
  purpleDark: '#A855F7',
  border: '#E5E7EB',
  cardShadow: '#D1D5DB',
};

// Enhanced category configurations with descriptions and gradients
const CATEGORY_CONFIG: Record<string, { 
  bg: string; 
  border: string; 
  icon: string;
  gradient: [string, string];
  title: string;
  description: string;
  mascot: string;
}> = {
  'science': { 
    bg: '#EDE9FE', 
    border: '#8B5CF6', 
    icon: '🔬',
    gradient: ['#8B5CF6', '#6D28D9'],
    title: 'Scientific Terms',
    description: 'Fundamental concepts of nuclear physics',
    mascot: '⚛️'
  },
  'technology': { 
    bg: '#DBEAFE', 
    border: '#3B82F6', 
    icon: '⚙️',
    gradient: ['#3B82F6', '#1D4ED8'],
    title: 'Technology',
    description: 'Reactors, equipment & innovations',
    mascot: '🔧'
  },
  'safety': { 
    bg: '#D1FAE5', 
    border: '#10B981', 
    icon: '🛡️',
    gradient: ['#10B981', '#047857'],
    title: 'Safety Systems',
    description: 'Protection & security measures',
    mascot: '✅'
  },
  'history': { 
    bg: '#FEF3C7', 
    border: '#F59E0B', 
    icon: '📜',
    gradient: ['#F59E0B', '#D97706'],
    title: 'History & People',
    description: 'Pioneers & key milestones',
    mascot: '👨‍🔬'
  },
  'radiation': { 
    bg: '#FEE2E2', 
    border: '#EF4444', 
    icon: '☢️',
    gradient: ['#EF4444', '#DC2626'],
    title: 'Radiation',
    description: 'Types, effects & measurements',
    mascot: '⚡'
  },
  'energy': { 
    bg: '#FEF3C7', 
    border: '#F59E0B', 
    icon: '⚡',
    gradient: ['#F97316', '#EA580C'],
    title: 'Energy',
    description: 'Power generation & applications',
    mascot: '💡'
  },
  'medicine': { 
    bg: '#FCE7F3', 
    border: '#EC4899', 
    icon: '💊',
    gradient: ['#EC4899', '#DB2777'],
    title: 'Medicine',
    description: 'Medical applications & treatments',
    mascot: '🏥'
  },
  'environment': { 
    bg: '#ECFDF5', 
    border: '#059669', 
    icon: '🌿',
    gradient: ['#059669', '#047857'],
    title: 'Environment',
    description: 'Ecological impact & sustainability',
    mascot: '🌍'
  },
  'default': { 
    bg: '#F3F4F6', 
    border: '#6B7280', 
    icon: '📖',
    gradient: ['#6B7280', '#4B5563'],
    title: 'General',
    description: 'Other important terms',
    mascot: '📚'
  },
};

export default function EncyclopediaScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [speakingEntryId, setSpeakingEntryId] = useState<string | null>(null);
  const [showCategoryCards, setShowCategoryCards] = useState(true);
  
  const allEntries = getAllEncyclopediaEntries();
  
  const filteredEntries = useMemo(() => {
    let entries = allEntries;
    
    if (searchQuery.trim()) {
      entries = searchEncyclopedia(searchQuery);
    }
    
    if (selectedCategory) {
      entries = entries.filter(entry => entry.category === selectedCategory);
    }
    
    // Sort alphabetically
    return entries.sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery, selectedCategory, allEntries]);

  // Get categories with counts
  const categoriesWithCounts = useMemo(() => {
    const countMap: Record<string, number> = {};
    allEntries.forEach(e => {
      countMap[e.category] = (countMap[e.category] || 0) + 1;
    });
    return Object.entries(countMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  }, [allEntries]);

  const categories = useMemo(() => {
    return categoriesWithCounts.map(c => c.category);
  }, [categoriesWithCounts]);

  const getCategoryConfig = (category: string) => {
    const key = category.toLowerCase();
    return CATEGORY_CONFIG[key] || CATEGORY_CONFIG['default'];
  };

  const speakTerm = useCallback((entry: typeof allEntries[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (speakingEntryId === entry.id) {
      Speech.stop();
      setSpeakingEntryId(null);
    } else {
      Speech.stop();
      setSpeakingEntryId(entry.id);
      const textToSpeak = `${entry.term}. ${entry.definition}`;
      Speech.speak(textToSpeak, {
        language: 'en',
        rate: 0.85,
        pitch: 1.0,
        onDone: () => setSpeakingEntryId(null),
        onStopped: () => setSpeakingEntryId(null),
      });
    }
  }, [speakingEntryId]);

  const handleCategorySelect = (category: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCategory(category);
    setShowCategoryCards(false);
  };

  const handleBackToCategories = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(null);
    setShowCategoryCards(true);
    setSearchQuery('');
  };

  const totalEntries = allEntries.length;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <LinearGradient
        colors={[THEME.primary, THEME.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => selectedCategory ? handleBackToCategories() : router.back()} 
            style={styles.backButton}
          >
            <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>
                {selectedCategory ? getCategoryConfig(selectedCategory).title : 'Knowledge Vault'}
              </Text>
              <Text style={styles.headerEmoji}>
                {selectedCategory ? getCategoryConfig(selectedCategory).mascot : '📚'}
              </Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {selectedCategory 
                ? `${filteredEntries.length} terms in this category`
                : `Explore ${totalEntries} nuclear science terms!`
              }
            </Text>
          </View>
        </View>
        
        {/* Stats Banner - only show on main screen */}
        {!selectedCategory && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.statsBanner}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalEntries}</Text>
              <Text style={styles.statLabel}>Terms</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{categories.length}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>🔊</Text>
              <Text style={styles.statLabel}>TTS Ready</Text>
            </View>
          </Animated.View>
        )}
      </LinearGradient>

      {/* Search Bar */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="SearchNormal" size={20} color={THEME.info} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search terms, definitions, facts..."
            placeholderTextColor={THEME.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length > 0) {
                setShowCategoryCards(false);
              } else if (!selectedCategory) {
                setShowCategoryCards(true);
              }
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              if (!selectedCategory) setShowCategoryCards(true);
            }}>
              <Icon name="CloseCircle" size={20} color={THEME.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Category Cards Section - Show when no category selected and no search */}
        {showCategoryCards && !searchQuery && !selectedCategory ? (
          <>
            {/* Section Header */}
            <Animated.View entering={FadeInDown.delay(150)} style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Browse by Category</Text>
              <Text style={styles.sectionSubtitle}>Tap a card to explore related terms</Text>
            </Animated.View>

            {/* Category Cards Grid */}
            <View style={styles.categoryGrid}>
              {categoriesWithCounts.map(({ category, count }, index) => {
                const config = getCategoryConfig(category);
                return (
                  <Animated.View
                    key={category}
                    entering={FadeInDown.delay(200 + index * 80).springify()}
                    style={styles.categoryCardWrapper}
                  >
                    <TouchableOpacity
                      style={styles.categoryCard}
                      activeOpacity={0.85}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <LinearGradient
                        colors={config.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.categoryCardGradient}
                      >
                        {/* Decorative circles */}
                        <View style={styles.decorCircle1} />
                        <View style={styles.decorCircle2} />
                        
                        {/* Icon */}
                        <View style={styles.categoryCardIcon}>
                          <Text style={styles.categoryCardEmoji}>{config.icon}</Text>
                        </View>
                        
                        {/* Title */}
                        <Text style={styles.categoryCardTitle}>{config.title}</Text>
                        
                        {/* Description */}
                        <Text style={styles.categoryCardDesc} numberOfLines={2}>
                          {config.description}
                        </Text>
                        
                        {/* Count Badge */}
                        <View style={styles.categoryCardBadge}>
                          <Text style={styles.categoryCardCount}>{count} terms</Text>
                          <Icon name="ArrowRight2" size={12} color="#FFF" />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Browse All Section */}
            <Animated.View entering={FadeInDown.delay(600)} style={styles.browseAllSection}>
              <TouchableOpacity 
                style={styles.browseAllButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCategoryCards(false);
                }}
              >
                <Icon name="Book1" size={20} color={THEME.primary} />
                <Text style={styles.browseAllText}>Browse All {totalEntries} Terms</Text>
                <Icon name="ArrowRight2" size={18} color={THEME.primary} />
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          <>
            {/* Back to Categories Button (when viewing a category) */}
            {selectedCategory && (
              <Animated.View entering={FadeInDown.delay(100)}>
                <TouchableOpacity 
                  style={styles.backToCategoriesBtn}
                  onPress={handleBackToCategories}
                >
                  <Icon name="Category2" size={18} color={THEME.purple} />
                  <Text style={styles.backToCategoriesText}>Back to Categories</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Results Count */}
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filteredEntries.length} {filteredEntries.length === 1 ? 'term' : 'terms'} found
              </Text>
            </View>

            {/* Entries List */}
            {filteredEntries.length === 0 ? (
              <Animated.View entering={ZoomIn.delay(100)} style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Text style={styles.emptyEmoji}>🔍</Text>
                </View>
                <Text style={styles.emptyText}>No entries found</Text>
                <Text style={styles.emptySubtext}>Try a different search term or category</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={handleBackToCategories}
                >
                  <Text style={styles.emptyButtonText}>Browse Categories</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              filteredEntries.map((entry, index) => {
                const categoryConfig = getCategoryConfig(entry.category);
                const isSpeaking = speakingEntryId === entry.id;
                
                return (
                  <Animated.View
                    key={entry.id}
                    entering={FadeInDown.delay(index * 30).springify()}
                  >
                    <TouchableOpacity
                      style={styles.entryCard}
                      activeOpacity={0.8}
                      onPress={() => router.push(`/explorer/encyclopedia-entry?id=${entry.id}`)}
                    >
                      <View style={styles.entryHeader}>
                        <View style={[styles.entryLetter, { backgroundColor: categoryConfig.border }]}>
                          <Text style={styles.entryLetterText}>{entry.term.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.entryContent}>
                          <Text style={styles.entryTerm}>{entry.term}</Text>
                          <View style={[styles.entryCategoryBadge, { backgroundColor: categoryConfig.bg }]}>
                            <Text style={styles.entryCategoryIcon}>{categoryConfig.icon}</Text>
                            <Text style={[styles.entryCategory, { color: categoryConfig.border }]}>{entry.category}</Text>
                          </View>
                        </View>
                        
                        {/* TTS Button */}
                        <TouchableOpacity 
                          style={[styles.ttsButton, isSpeaking && styles.ttsButtonActive]}
                          onPress={(e) => {
                            e.stopPropagation();
                            speakTerm(entry);
                          }}
                        >
                          <Icon 
                            name={isSpeaking ? "VolumeSlash" : "VolumeHigh"} 
                            size={18} 
                            color={isSpeaking ? '#FFF' : THEME.info} 
                          />
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.entryDefinition} numberOfLines={2}>
                        {entry.definition}
                      </Text>
                      
                      {entry.quickFacts && entry.quickFacts.length > 0 && (
                        <View style={styles.quickFacts}>
                          <View style={styles.quickFactsHeader}>
                            <Icon name="Flashy" size={14} color={THEME.warning} variant="Bold" />
                            <Text style={styles.quickFactsTitle}>Quick Fact</Text>
                          </View>
                          <Text style={styles.quickFactsText} numberOfLines={1}>
                            {entry.quickFacts[0]}
                          </Text>
                        </View>
                      )}
                      
                      {/* Entry Footer */}
                      <View style={styles.entryFooter}>
                        <View style={styles.tapHint}>
                          <Text style={styles.tapHintText}>Tap to learn more</Text>
                          <Icon name="ArrowRight2" size={14} color={THEME.textMuted} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })
            )}
          </>
        )}
        
        {/* Bottom Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderBottomWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerEmoji: {
    fontSize: 22,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '600',
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  // Section Header
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  
  // Category Cards Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryCardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 12,
  },
  categoryCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    borderBottomWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryCardGradient: {
    padding: 16,
    minHeight: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  categoryCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  categoryCardEmoji: {
    fontSize: 24,
  },
  categoryCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  categoryCardDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
    marginBottom: 12,
  },
  categoryCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  categoryCardCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  
  // Browse All Section
  browseAllSection: {
    marginTop: 8,
  },
  browseAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
    gap: 10,
  },
  browseAllText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.primary,
  },
  
  // Back to Categories
  backToCategoriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
    borderWidth: 2,
    borderColor: THEME.purple,
  },
  backToCategoriesText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.purpleDark,
  },
  
  // Results Header
  resultsHeader: {
    paddingBottom: 12,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  
  // Entry Cards
  entryCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  entryLetter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  entryLetterText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  entryContent: {
    flex: 1,
  },
  entryTerm: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 6,
  },
  entryCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  entryCategoryIcon: {
    fontSize: 10,
  },
  entryCategory: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ttsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.info,
    borderBottomWidth: 3,
  },
  ttsButtonActive: {
    backgroundColor: THEME.info,
    borderColor: THEME.infoDark,
  },
  entryDefinition: {
    fontSize: 14,
    color: THEME.text,
    lineHeight: 21,
    marginBottom: 12,
  },
  quickFacts: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  quickFactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  quickFactsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.warningDark,
    textTransform: 'uppercase',
  },
  quickFactsText: {
    fontSize: 13,
    color: THEME.text,
    lineHeight: 18,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapHintText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: THEME.border,
    borderBottomWidth: 5,
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: THEME.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: THEME.success,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.successDark,
    borderBottomWidth: 4,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
});

