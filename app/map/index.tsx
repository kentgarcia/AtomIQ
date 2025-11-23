import { Icon } from '@/components/ui/icon';
import { UNITS as SYLLABUS_UNITS } from '@/content/units';
import { useAllLevels } from '@/hooks/use-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const THEME = {
  bg: '#F7F7F7',
  primary: '#FF6B00',
  primaryDark: '#E65100',
  primaryLight: '#FF9E40',
  locked: '#E5E7EB',
  lockedIcon: '#9CA3AF',
  gold: '#FFC107',
  text: '#1F2937',
  textMuted: '#9CA3AF',
};

// Helper function to darken a color
const darkenColor = (color: string, amount: number = 0.3): string => {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Darken
  const newR = Math.max(0, Math.floor(r * (1 - amount)));
  const newG = Math.max(0, Math.floor(g * (1 - amount)));
  const newB = Math.max(0, Math.floor(b * (1 - amount)));
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// Convert syllabus units to map format
const convertSyllabusToMapUnits = (completedLessonIds: string[]) => {
  return SYLLABUS_UNITS.map((unit, unitIndex) => {
    // Check if previous unit is completed
    const isPreviousUnitCompleted = unitIndex === 0 || (() => {
      const previousUnit = SYLLABUS_UNITS[unitIndex - 1];
      return previousUnit.lessonIds.every(id => completedLessonIds.includes(id));
    })();
    
    // If previous unit is not completed, lock entire unit
    const isUnitLocked = !isPreviousUnitCompleted;
    
    // Create level nodes from lessons
    const levels = unit.lessonIds.map((lessonId, index) => {
      const isCompleted = completedLessonIds.includes(lessonId);
      const isFirst = index === 0;
      const previousCompleted = index === 0 || completedLessonIds.includes(unit.lessonIds[index - 1]);
      
      // Determine status
      let status = 'locked';
      if (isUnitLocked) {
        status = 'locked'; // Entire unit is locked
      } else if (isCompleted) {
        status = 'completed';
      } else if (previousCompleted || isFirst) {
        status = 'current';
      }
      
      // Determine type (alternate between different types)
      const types = ['star', 'book', 'chest'];
      const type = types[index % types.length];
      
      return {
        id: lessonId,
        type: type,
        status: status
      };
    });
    
    // Add trophy (boss) at the end if unit has a quiz
    if (unit.quizIds && unit.quizIds.length > 0) {
      const allLessonsCompleted = unit.lessonIds.every(id => completedLessonIds.includes(id));
      levels.push({
        id: unit.quizIds[0],
        type: 'trophy',
        status: isUnitLocked ? 'locked' : (allLessonsCompleted ? 'current' : 'locked')
      });
    }
    
    return {
      id: unit.id,
      title: `${unit.title}`,
      subtitle: unit.subtitle,
      description: unit.description,
      color: isUnitLocked ? '#9CA3AF' : unit.color, // Gray out locked units
      icon: unit.icon,
      levels: levels,
      isLocked: isUnitLocked
    };
  });
};

// Helper to get node position
const getNodePosition = (index: number) => {
  const offset = Math.sin(index * 2.5) * 60;
  // Center of node is center of screen + offset
  return { x: width / 2 + offset, y: 40 + index * 100 }; // Increased spacing from 80 to 100
};

const UnitPath = ({ levels, color }: { levels: any[], color: string }) => {
  const pathStr = levels.map((_, index) => {
    const pos = getNodePosition(index);
    if (index === 0) return `M ${pos.x} ${pos.y}`;
    return `L ${pos.x} ${pos.y}`;
  }).join(' ');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={levels.length * 100}> 
        <Path
          d={pathStr}
          stroke="#E5E7EB"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const LevelNode = ({ level, index, unitColor, onPress, showStart = false }: { level: any, index: number, unitColor: string, onPress: () => void, showStart?: boolean }) => {
  const offset = Math.sin(index * 2.5) * 60; 
  
  const isLocked = level.status === 'locked';
  const isCurrent = level.status === 'current';
  const isCompleted = level.status === 'completed';

  // Bounce animation for current level
  const scale = useSharedValue(1);
  
  React.useEffect(() => {
    if (isCurrent) {
      scale.value = withRepeat(withTiming(1.1, { duration: 800 }), -1, true);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  let iconName = 'Star';
  if (level.type === 'book') iconName = 'Book';
  if (level.type === 'chest') iconName = 'Box';
  if (level.type === 'trophy') iconName = 'Cup';

  const lightColor = isLocked ? '#E5E7EB' : unitColor;
  const darkColor = isLocked ? '#D1D5DB' : darkenColor(unitColor, 0.3);

  return (
    <View style={[styles.nodeContainer, { marginLeft: offset }]}>
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={isLocked ? undefined : onPress}
        style={styles.nodeWrapper}
      >
        <Animated.View style={[
          styles.nodeCircle,
          isCurrent ? animatedStyle : {},
        ]}>
           {/* 1. Lip (Shadow/Darker) - Rendered first (behind) or with zIndex */}
           <View style={[
             styles.nodeLip, 
             { backgroundColor: darkColor } 
           ]} />
           
           {/* 2. Face (Main/Lighter) - Rendered on top */}
           <View style={[
             styles.nodeFace, 
             { 
               backgroundColor: lightColor,
               borderWidth: isCurrent ? 4 : 0,
               borderColor: isCurrent ? '#FFF' : 'transparent',
             }
           ]}>
             <Icon 
               name={iconName as any} 
               size={isCurrent || level.type === 'trophy' ? 32 : 24} 
               color={isLocked ? '#9CA3AF' : '#FFF'} 
               variant="Bold" 
             />
             
             {/* Stars for completed */}
             {isCompleted && (
               <View style={styles.crownBadge}>
                 <Icon name="Crown1" size={12} color="#FFC107" variant="Bold" />
               </View>
             )}
           </View>
        </Animated.View>

        {/* Floating "START" bubble - only show for the first current level */}
        {isCurrent && showStart && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.startBubble}>
            <Text style={styles.startText}>START</Text>
            <View style={styles.bubbleArrow} />
          </Animated.View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default function MapScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const isFirstRender = useRef(true);
  const { levels, loading, refresh } = useAllLevels();

  // Refresh levels when screen comes into focus (e.g., after completing a lesson)
  // Skip the first render to avoid double-loading
  useFocusEffect(
    useCallback(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  // Get completed lesson IDs from storage
  const completedLessonIds = levels
    .filter(l => l.status === 'completed')
    .map(l => l.id);

  // Convert syllabus units to map format with real progress
  const UNITS = convertSyllabusToMapUnits(completedLessonIds);

  // Find the first "current" level across all units (the latest unlocked level)
  let firstCurrentLevelId: string | null = null;
  for (const unit of UNITS) {
    const currentLevel = unit.levels.find(l => l.status === 'current');
    if (currentLevel) {
      firstCurrentLevelId = currentLevel.id;
      break;
    }
  }

  useEffect(() => {
    setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  const handleLevelPress = (levelId: string, levelType: string) => {
    console.log('Level pressed:', levelId, 'Type:', levelType);
    
    // Check if it's a quiz (trophy type or ends with -quiz)
    if (levelType === 'trophy' || levelId.includes('-quiz')) {
      router.push(`/quiz/${levelId}`);
    } else {
      router.push(`/lesson/${levelId}`);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: THEME.textMuted }}>Loading...</Text>
      </View>
    );
  }

  const reversedUnits = [...UNITS].reverse();

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
           <Icon name="ArrowLeft2" size={24} color={THEME.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learning Path</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 100 }} /> 

        {reversedUnits.map((unit) => {
          // We need to process levels in the order they appear visually (top to bottom in the container)
          // Since 'reversed' map means 5 -> 1, this matches top -> bottom.
          const levelsForDisplay = [...unit.levels].reverse();
          
          return (
            <View key={unit.id} style={styles.unitSection}>
              <View style={styles.levelsPath}>
                {/* Path Background */}
                <UnitPath levels={levelsForDisplay} color={unit.color} />
                
                {/* Nodes */}
                {levelsForDisplay.map((level, index) => (
                  <LevelNode 
                    key={level.id}
                    level={level}
                    index={index} 
                    unitColor={unit.color}
                    onPress={() => handleLevelPress(level.id, level.type)}
                    showStart={level.id === firstCurrentLevelId}
                  />
                ))}
              </View>

              {/* Unit Header (Footer) */}
              <View style={[styles.unitHeader, { backgroundColor: unit.color, opacity: unit.isLocked ? 0.6 : 1 }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {unit.isLocked ? (
                      <Icon name="Lock" size={20} color="#FFF" variant="Bold" />
                    ) : (
                      <Icon name={unit.icon as any} size={20} color="#FFF" variant="Bold" />
                    )}
                    <Text style={styles.unitSubtitle}>{unit.subtitle}</Text>
                  </View>
                  <Text style={styles.unitTitle}>{unit.title}</Text>
                  <Text style={styles.unitDesc}>
                    {unit.isLocked ? 'Complete previous unit to unlock' : unit.description}
                  </Text>
                </View>
                <TouchableOpacity style={styles.guideBtn} disabled={unit.isLocked}>
                  <Icon name={unit.isLocked ? "Lock" : "InfoCircle"} size={20} color={unit.color} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: THEME.bg,
    zIndex: 10,
    position: 'absolute', 
    top: 0,
    left: 0,
    right: 0,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 40,
  },
  unitSection: {
    marginBottom: 24,
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginTop: 16,
    marginBottom: 32,
    marginHorizontal: 16,
    borderRadius: 20,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  unitSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  unitTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  unitDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  guideBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#FFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  levelsPath: {
    alignItems: 'center',
    gap: 0, // Gap handled by fixed height containers
    position: 'relative',
  },
  nodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100, // Spacing between nodes increased
    width: 100,
    zIndex: 10, // Above line
  },
  nodeWrapper: {
    alignItems: 'center',
  },
  nodeCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    // Standard Shadow for depth on ground
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  nodeLip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    borderRadius: 35,
    zIndex: -1, // Behind Face
    transform: [{ translateY: 6 }], 
  },
  nodeFace: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // On top of Lip
  },
  nodeContent: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    zIndex: 20,
  },
  startBubble: {
    position: 'absolute',
    top: -45,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  startText: {
    fontWeight: '800',
    color: THEME.primary,
    fontSize: 14,
  },
  bubbleArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#E5E7EB',
    transform: [{ rotate: '45deg' }],
  },
});
