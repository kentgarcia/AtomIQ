import { Icon } from '@/components/ui/icon';
import { getAllEncyclopediaEntries, searchEncyclopedia } from '@/content/explorer';
import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#EA580C',
  primaryDark: '#C2410C',
  success: '#2ECC71',
  border: '#E5E7EB',
};

export default function EncyclopediaScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  
  const allEntries = getAllEncyclopediaEntries();
  
  const filteredEntries = useMemo(() => {
    let entries = allEntries;
    
    if (searchQuery.trim()) {
      entries = searchEncyclopedia(searchQuery);
    }
    
    // Sort alphabetically
    return entries.sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery, allEntries]);

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
                style={styles.entryItem}
                activeOpacity={0.7}
                onPress={() => router.push(`/explorer/encyclopedia-entry?id=${entry.id}`)}
              >
                <View style={styles.entryContent}>
                  <Text style={styles.entryTerm}>{entry.term}</Text>
                  <Text style={styles.entryDefinition} numberOfLines={2}>
                    {entry.definition}
                  </Text>
                </View>
                <Icon name="ArrowRight2" size={20} color={THEME.textMuted} />
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 12,
  },
  entryContent: {
    flex: 1,
  },
  entryTerm: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 4,
  },
  entryDefinition: {
    fontSize: 14,
    color: THEME.textMuted,
    lineHeight: 20,
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

