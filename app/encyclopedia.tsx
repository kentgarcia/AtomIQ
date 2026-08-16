import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import { getAllEncyclopediaEntries } from '@/content/explorer';
import type { EncyclopediaEntry } from '@/content/explorer';
import {useTheme, type Palette, fontFamilies} from "@/theme";
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Category configurations
const CATEGORY_CONFIG: Record<string, { 
  bg: string; 
  border: string; 
  icon: string;
  gradient: readonly [string, string];
}> = {
  'science': { 
    bg: '#EDE9FE', 
    border: '#8B5CF6', 
    icon: '🔬',
    gradient: ['#8B5CF6', '#6D28D9'] as const,
  },
  'technology': { 
    bg: '#DBEAFE', 
    border: '#3B82F6', 
    icon: '⚙️',
    gradient: ['#3B82F6', '#1D4ED8'] as const,
  },
  'safety': { 
    bg: '#D1FAE5', 
    border: '#10B981', 
    icon: '🛡️',
    gradient: ['#10B981', '#047857'] as const,
  },
  'history': { 
    bg: '#FEF3C7', 
    border: '#F59E0B', 
    icon: '📜',
    gradient: ['#F59E0B', '#D97706'] as const,
  },
  'radiation': { 
    bg: '#FEE2E2', 
    border: '#EF4444', 
    icon: '☢️',
    gradient: ['#EF4444', '#DC2626'] as const,
  },
  'energy': { 
    bg: '#FEF3C7', 
    border: '#F59E0B', 
    icon: '⚡',
    gradient: ['#F97316', '#EA580C'] as const,
  },
  'medicine': { 
    bg: '#FCE7F3', 
    border: '#EC4899', 
    icon: '💊',
    gradient: ['#EC4899', '#DB2777'] as const,
  },
  'environment': { 
    bg: '#ECFDF5', 
    border: '#059669', 
    icon: '🌿',
    gradient: ['#059669', '#047857'] as const,
  },
  'default': { 
    bg: '#F3F4F6', 
    border: '#6B7280', 
    icon: '📖',
    gradient: ['#6B7280', '#4B5563'] as const,
  },
};

export default function EncyclopediaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const THEME = theme.palettes.library;
  const styles = useMemo(() => createStyles(THEME), [THEME]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [speakingEntryId, setSpeakingEntryId] = useState<string | null>(null);
  const [showCategoryCards, setShowCategoryCards] = useState(false);

  // Encyclopedia entries live in the content database — resolve once, async.
  const [allEntries, setAllEntries] = useState<EncyclopediaEntry[]>([]);
  useEffect(() => {
    let alive = true;
    getAllEncyclopediaEntries().then((entries) => {
      if (alive) setAllEntries(entries);
    });
    return () => {
      alive = false;
    };
  }, []);

  const filteredEntries = useMemo(() => {
    let entries = allEntries;

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      entries = entries.filter(
        (entry) =>
          entry.term.toLowerCase().includes(query) ||
          entry.definition.toLowerCase().includes(query) ||
          entry.category.toLowerCase().includes(query) ||
          entry.quickFacts.some((fact) => fact.toLowerCase().includes(query)),
      );
    }

    if (selectedCategory) {
      entries = entries.filter(entry => entry.category === selectedCategory);
    }

    // Sort alphabetically
    return [...entries].sort((a, b) => a.term.localeCompare(b.term));
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
    setShowCategoryCards(false);
    setSearchQuery('');
  };

  const totalEntries = allEntries.length;

  return (
    <View style={[styles.container, { backgroundColor: THEME.bg }]}>
      <PageHeader
        title="Knowledge Vault"
        subtitle={
          selectedCategory
            ? `${filteredEntries.length} terms in ${selectedCategory}`
            : `${totalEntries} Nuclear Science Terms`
        }
        onBack={() => (selectedCategory ? handleBackToCategories() : router.back())}
        palette={THEME}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="SearchNormal" size={20} color={THEME.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search terms..."
            placeholderTextColor={THEME.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
            }}>
              <Icon name="CloseCircle" size={20} color={THEME.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>
        
        {/* Category Filter Chips - Show when no search */}
        {!searchQuery && (
          <View style={styles.categoryChipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
              <TouchableOpacity 
                style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
                onPress={handleBackToCategories}
              >
                <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                  All ({totalEntries})
                </Text>
              </TouchableOpacity>
              {categoriesWithCounts.map(({ category, count }) => {
                const config = getCategoryConfig(category);
                const isActive = selectedCategory === category;
                return (
                  <TouchableOpacity 
                    key={category}
                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                    onPress={() => handleCategorySelect(category)}
                  >
                    <Text style={styles.categoryChipIcon}>{config.icon}</Text>
                    <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                      {category} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Results Count */}
        {(selectedCategory || searchQuery) && filteredEntries.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {filteredEntries.length} {filteredEntries.length === 1 ? 'result' : 'results'}
            </Text>
          </View>
        )}

        {/* Entries List */}
        {(selectedCategory || searchQuery || !showCategoryCards) && (
          <>

            {filteredEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="SearchNormal" size={48} color={THEME.textMuted} />
                <Text style={styles.emptyText}>No entries found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            ) : (
              filteredEntries.map((entry, index) => {
                const categoryConfig = getCategoryConfig(entry.category);
                const isSpeaking = speakingEntryId === entry.id;
                
                return (
                  <Animated.View
                    key={entry.id}
                    entering={FadeInDown.delay(index * 50)}
                  >
                    <TouchableOpacity
                      style={styles.entryItem}
                      activeOpacity={0.7}
                      onPress={() => router.push(`/explorer/encyclopedia-entry?id=${entry.id}`)}
                    >
                      <View style={styles.entryLeft}>
                        <Text style={styles.entryTerm}>{entry.term}</Text>
                        <Text style={styles.entryDefinition} numberOfLines={2}>
                          {entry.definition}
                        </Text>
                      </View>
                      <View style={styles.entryActions}>
                        <TouchableOpacity 
                          style={styles.speakButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            speakTerm(entry);
                          }}
                        >
                          <Icon 
                            name={isSpeaking ? "VolumeSlash" : "VolumeHigh"} 
                            size={20} 
                            color={isSpeaking ? THEME.primary : THEME.textMuted} 
                          />
                        </TouchableOpacity>
                        <Icon name="ArrowRight2" size={20} color={THEME.textMuted} />
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

const createStyles = (theme: Palette) => StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: theme.text,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  categoryChipsContainer: {
    backgroundColor: theme.bg,
    paddingBottom: 16,
  },
  categoryChips: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  categoryChipActive: {
    backgroundColor: theme.primary,
    shadowColor: theme.primary,
    shadowOpacity: 0.3,
  },
  categoryChipIcon: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamilies.semibold,
    color: theme.text,
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  
  resultsHeader: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamilies.semibold,
    color: theme.textMuted,
  },
  
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  entryLeft: {
    flex: 1,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryTerm: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: theme.text,
    marginBottom: 4,
  },
  entryDefinition: {
    fontSize: 14,
    color: theme.textMuted,
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: fontFamilies.medium,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  categoryIcon: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    textTransform: 'capitalize',
  },
  speakButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: theme.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: theme.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});

