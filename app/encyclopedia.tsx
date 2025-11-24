import { Icon } from '@/components/ui/icon';
import { getAllEncyclopediaEntries, searchEncyclopedia, getEncyclopediaEntryById } from '@/content/explorer';
import { encyclopediaDatabase } from '@/content/explorer/encyclopedia/database';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#FF6B00',
  primaryDark: '#E65100',
  success: '#2ECC71',
  border: '#E5E7EB',
};

export default function EncyclopediaScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
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

  const categories = useMemo(() => {
    const cats = new Set(allEntries.map(e => e.category));
    return Array.from(cats).sort();
  }, [allEntries]);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="ArrowLeft2" size={24} color={THEME.text} variant="Bold" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Knowledge Vault</Text>
          <Text style={styles.headerSubtitle}>Searchable Nuclear Science Encyclopedia</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="SearchNormal" size={20} color={THEME.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search terms, definitions, facts..."
            placeholderTextColor={THEME.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="CloseCircle" size={20} color={THEME.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          style={[styles.categoryPill, !selectedCategory && styles.categoryPillActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryPill, selectedCategory === category && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Entries List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="SearchNormal" size={48} color={THEME.textMuted} />
            <Text style={styles.emptyText}>No entries found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        ) : (
          filteredEntries.map((entry, index) => (
            <Animated.View
              key={entry.id}
              entering={FadeInDown.delay(index * 50)}
            >
              <TouchableOpacity
                style={styles.entryCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/explorer/encyclopedia-entry?id=${entry.id}`)}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.entryLetter}>
                    <Text style={styles.entryLetterText}>{entry.term.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.entryContent}>
                    <Text style={styles.entryTerm}>{entry.term}</Text>
                    <Text style={styles.entryCategory}>{entry.category}</Text>
                  </View>
                  <Icon name="ArrowRight2" size={20} color={THEME.textMuted} />
                </View>
                <Text style={styles.entryDefinition} numberOfLines={2}>
                  {entry.definition}
                </Text>
                {entry.quickFacts && entry.quickFacts.length > 0 && (
                  <View style={styles.quickFacts}>
                    <Text style={styles.quickFactsTitle}>Quick Facts:</Text>
                    <Text style={styles.quickFactsText} numberOfLines={1}>
                      {entry.quickFacts[0]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  categoryPillActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primaryDark,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  categoryTextActive: {
    color: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  entryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: THEME.border,
    borderBottomWidth: 4,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  entryLetter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryLetterText: {
    fontSize: 20,
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
    marginBottom: 2,
  },
  entryCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
    textTransform: 'uppercase',
  },
  entryDefinition: {
    fontSize: 14,
    color: THEME.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  quickFacts: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  quickFactsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMuted,
    marginBottom: 4,
  },
  quickFactsText: {
    fontSize: 13,
    color: THEME.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: THEME.textMuted,
    marginTop: 4,
  },
});

