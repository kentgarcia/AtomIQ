import { Icon } from '@/components/ui/icon';
import { getAllEncyclopediaEntries, searchEncyclopedia } from '@/content/explorer';
import { getEncyclopediaImage } from '@/content/explorer/encyclopedia/images';
import { useTheme, type Palette } from '@/theme';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EncyclopediaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const THEME = theme.palettes.explorer;
  const styles = useMemo(() => makeStyles(THEME), [THEME]);
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
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
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
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]} showsVerticalScrollIndicator={false}>
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
                {entry.image && getEncyclopediaImage(entry.id) && (
                  <Image 
                    source={getEncyclopediaImage(entry.id)} 
                    style={styles.entryThumbnail}
                    resizeMode="cover"
                  />
                )}
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

const makeStyles = (THEME: Palette) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: THEME.bg,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.card,
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
    backgroundColor: THEME.card,
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
  entryThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: THEME.border,
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

