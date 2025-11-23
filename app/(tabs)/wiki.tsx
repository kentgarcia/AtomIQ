import { Icon } from '@/components/ui/icon';
import { getAllMyths } from '@/content/myths';
import { getAllFacts } from '@/content/facts';
import { getAllArticles, getAllPosts } from '@/content/articles';
import React, { useState, useMemo } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Orange Theme
const THEME = {
  bg: '#F7F7F7',
  card: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#9CA3AF',
  primary: '#FF6B00', // Orange
  primaryDark: '#E65100',
  border: '#E5E7EB',
  success: '#2ECC71',
  gold: '#FFC107',
};

// Storage keys
const BOOKMARKS_KEY = '@atomiq_bookmarks';

// Helper to generate feed items from all content types
const generateFeedItems = () => {
  const myths = getAllMyths();
  const facts = getAllFacts();
  const articles = getAllArticles();
  const posts = getAllPosts();
  
  const feedItems: any[] = [];
  
  // Add articles as feed items
  articles.forEach((article) => {
    feedItems.push({
      id: `article-${article.id}`,
      type: 'article',
      contentType: article.type,
      title: article.title,
      subtitle: article.subtitle,
      content: article.excerpt,
      fullContent: article.content,
      author: article.author,
      publishedDate: article.publishedDate,
      readTime: article.readTime,
      source: article.source,
      category: article.category,
      tags: article.tags,
      image: article.image,
      difficulty: article.difficulty,
      featured: article.featured,
    });
  });
  
  // Add posts as feed items
  posts.forEach((post) => {
    feedItems.push({
      id: `post-${post.id}`,
      type: 'post',
      contentType: post.type,
      title: post.title,
      content: post.content,
      author: post.author,
      publishedDate: post.publishedDate,
      source: post.source,
      category: post.category,
      tags: post.tags,
      image: post.image,
    });
  });
  
  // Add myths as feed items
  myths.forEach((myth) => {
    feedItems.push({
      id: `myth-${myth.id}`,
      type: 'myth',
      title: myth.mythStatement,
      content: myth.reality,
      explanation: myth.explanation,
      source: myth.source,
      category: myth.category,
      tags: myth.tags,
      image: myth.visualAid,
      difficulty: myth.difficulty,
    });
  });
  
  // Add facts as feed items
  facts.forEach((fact) => {
    feedItems.push({
      id: `fact-${fact.id}`,
      type: 'fact',
      title: fact.title,
      content: fact.description,
      statistic: fact.statistic,
      source: fact.source,
      category: fact.category,
      tags: fact.tags,
      image: fact.visualAid,
      importance: fact.importance,
    });
  });
  
  // Sort by published date (newest first) for articles/posts, then shuffle others
  return feedItems.sort((a, b) => {
    if (a.publishedDate && b.publishedDate) {
      return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
    }
    if (a.publishedDate) return -1;
    if (b.publishedDate) return 1;
    return Math.random() - 0.5;
  });
};

export default function WikiScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  
  // Generate feed items
  const allFeedItems = useMemo(() => generateFeedItems(), []);
  
  // Filter feed items based on search and category
  const filteredItems = useMemo(() => {
    let items = allFeedItems;
    
    // Filter by category
    if (selectedFilter !== 'All') {
      if (selectedFilter === 'Articles') {
        items = items.filter(item => item.type === 'article');
      } else if (selectedFilter === 'Posts') {
        items = items.filter(item => item.type === 'post');
      } else if (selectedFilter === 'Myths') {
        items = items.filter(item => item.type === 'myth');
      } else if (selectedFilter === 'Facts') {
        items = items.filter(item => item.type === 'fact');
      } else if (selectedFilter === 'Bookmarked') {
        items = items.filter(item => bookmarkedIds.includes(item.id));
      } else {
        items = items.filter(item => item.category === selectedFilter);
      }
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.title?.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query) ||
        item.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }
    
    return items;
  }, [allFeedItems, selectedFilter, searchQuery, bookmarkedIds]);
  
  // Load bookmarks on mount
  React.useEffect(() => {
    loadBookmarks();
  }, []);
  
  const loadBookmarks = async () => {
    try {
      const saved = await AsyncStorage.getItem(BOOKMARKS_KEY);
      if (saved) {
        setBookmarkedIds(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };
  
  const toggleBookmark = async (itemId: string) => {
    try {
      let newBookmarks: string[];
      if (bookmarkedIds.includes(itemId)) {
        newBookmarks = bookmarkedIds.filter(id => id !== itemId);
      } else {
        newBookmarks = [...bookmarkedIds, itemId];
      }
      setBookmarkedIds(newBookmarks);
      await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(newBookmarks));
    } catch (error) {
      console.error('Error saving bookmark:', error);
    }
  };
  
  const renderFeedItem = ({ item, index }: { item: any; index: number }) => {
    const isBookmarked = bookmarkedIds.includes(item.id);
    
    // Determine badge color and icon based on type
    const getBadgeConfig = () => {
      switch (item.type) {
        case 'article':
          return { color: '#1CB0F6', icon: 'DocumentText', label: 'ARTICLE' };
        case 'post':
          return { color: '#8B5CF6', icon: 'Message', label: 'POST' };
        case 'myth':
          return { color: '#EF4444', icon: 'Danger', label: 'MYTH' };
        case 'fact':
          return { color: THEME.success, icon: 'TickCircle', label: 'FACT' };
        default:
          return { color: THEME.primary, icon: 'InfoCircle', label: 'INFO' };
      }
    };
    
    const badgeConfig = getBadgeConfig();
    
    return (
      <Animated.View 
        entering={FadeInDown.delay(50 + (index % 10) * 50).springify()}
        style={styles.postCard}
      >
        {/* Type Badge */}
        <View style={[styles.typeBadge, { backgroundColor: badgeConfig.color }]}>
          <Icon 
            name={badgeConfig.icon as any} 
            size={14} 
            color="#FFF" 
            variant="Bold" 
          />
          <Text style={styles.typeBadgeText}>{badgeConfig.label}</Text>
        </View>
        
        {/* Author Info for Articles/Posts */}
        {(item.type === 'article' || item.type === 'post') && item.author && (
          <View style={styles.authorRow}>
            <View style={styles.authorAvatar}>
              <Icon name="Profile" size={16} color={THEME.primary} variant="Bold" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>{item.author.name}</Text>
              {item.author.title && (
                <Text style={styles.authorTitle}>{item.author.title}</Text>
              )}
            </View>
            {item.readTime && (
              <View style={styles.readTime}>
                <Icon name="Clock" size={12} color={THEME.textMuted} />
                <Text style={styles.readTimeText}>{item.readTime} min</Text>
              </View>
            )}
          </View>
        )}
        
        {/* Title */}
        <Text style={styles.postTitle}>{item.title}</Text>
        
        {/* Content */}
        <Text style={styles.postContent}>{item.content}</Text>
        
        {/* Statistic (for facts) */}
        {item.statistic && (
          <View style={styles.statisticBox}>
            <Icon name="Chart" size={20} color={THEME.primary} variant="Bold" />
            <Text style={styles.statisticText}>{item.statistic}</Text>
          </View>
        )}
        
        {/* Explanation (for myths) */}
        {item.explanation && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationLabel}>REALITY CHECK</Text>
            <Text style={styles.explanationText}>{item.explanation}</Text>
          </View>
        )}
        
        {/* Source */}
        {item.source && (
          <View style={styles.sourceContainer}>
            <Icon name="Link" size={14} color={THEME.primary} />
            <Text style={styles.sourceText}>{item.source}</Text>
          </View>
        )}
        
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map((tag: string) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Bookmark Action */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.bookmarkBtn, isBookmarked && styles.bookmarkBtnActive]}
            onPress={() => toggleBookmark(item.id)}
          >
            <Icon 
              name={isBookmarked ? 'Archive' : 'ArchiveAdd'} 
              size={20} 
              color={isBookmarked ? '#FFF' : THEME.primary} 
              variant="Bold" 
            />
            <Text style={[styles.bookmarkText, isBookmarked && styles.bookmarkTextActive]}>
              {isBookmarked ? 'Saved' : 'Save for Later'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Fixed Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Learn & Explore</Text>
        <Text style={styles.headerSubtitle}>Scroll through nuclear myths & facts</Text>
        
        {/* Search */}
        <View style={styles.searchContainer}>
          <Icon name="SearchNormal" size={20} color={THEME.textMuted} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search myths and facts..."
            placeholderTextColor={THEME.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        {/* Filter Pills */}
        <View style={styles.filtersRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['All', 'Articles', 'Posts', 'Myths', 'Facts', 'Bookmarked']}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filtersContent}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.filterPill, 
                  selectedFilter === item && styles.filterPillActive
                ]}
                onPress={() => setSelectedFilter(item)}
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === item && styles.filterTextActive
                ]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
      
      {/* Feed */}
      <FlatList
        data={filteredItems}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="SearchStatus" size={64} color={THEME.textMuted} />
            <Text style={styles.emptyText}>No items found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters or search</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: THEME.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: THEME.textMuted,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bg,
    borderWidth: 2,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
  filtersRow: {
    marginHorizontal: -20,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: THEME.bg,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: THEME.border,
  },
  filterPillActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primaryDark,
  },
  filterText: {
    fontWeight: '700',
    color: THEME.textMuted,
    fontSize: 13,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  feedContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: THEME.border,
    padding: 20,
    borderBottomWidth: 4,
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },
  authorTitle: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
  },
  readTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  readTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    lineHeight: 26,
    marginBottom: 12,
  },
  postContent: {
    fontSize: 15,
    color: THEME.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  statisticBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF5EB',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.primary + '30',
    marginBottom: 16,
  },
  statisticText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: THEME.primary,
    lineHeight: 22,
  },
  explanationBox: {
    backgroundColor: THEME.bg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  explanationLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: THEME.text,
    lineHeight: 22,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  sourceText: {
    color: THEME.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagChip: {
    backgroundColor: THEME.bg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  actionRow: {
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: THEME.bg,
  },
  bookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.bg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.primary,
    flex: 1,
  },
  bookmarkBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primaryDark,
  },
  bookmarkText: {
    fontWeight: '700',
    color: THEME.primary,
    fontSize: 14,
  },
  bookmarkTextActive: {
    color: '#FFFFFF',
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
    marginTop: 8,
  },
});
