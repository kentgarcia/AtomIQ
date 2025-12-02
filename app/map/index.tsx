import { Icon } from '@/components/ui/icon';
import { UNITS as SYLLABUS_UNITS } from '@/content/units';
import { useAllLevels } from '@/hooks/use-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

const THEME = {
  bg: '#8BC34A', // Main Grass Color
  primary: '#EA580C',
  locked: '#E5E7EB',
  text: '#1F2937',
  textMuted: '#9CA3AF',
};

// Helper function to darken a color
const darkenColor = (color: string, amount: number = 0.3): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const newR = Math.max(0, Math.floor(r * (1 - amount)));
  const newG = Math.max(0, Math.floor(g * (1 - amount)));
  const newB = Math.max(0, Math.floor(b * (1 - amount)));
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// Pseudo-random generator
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// --- SVG Assets (Game Style) ---

const Tree = ({ x, y, scale = 1 }: { x: number, y: number, scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    {/* Shadow */}
    <Circle cx="0" cy="8" r="10" fill="rgba(0,0,0,0.1)" />
    {/* Trunk */}
    <Rect x="-2" y="-2" width="4" height="10" fill="#795548" />
    {/* Foliage (Simple Round) */}
    <Circle cx="0" cy="-10" r="12" fill="#4CAF50" />
    <Circle cx="-8" cy="-5" r="8" fill="#43A047" />
    <Circle cx="8" cy="-5" r="8" fill="#66BB6A" />
  </G>
);

const Rock = ({ x, y, scale = 1 }: { x: number, y: number, scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    <Circle cx="0" cy="2" r="8" fill="rgba(0,0,0,0.1)" />
    <Path d="M-6,0 Q0,-8 6,0 Q4,6 -6,0" fill="#9E9E9E" />
    <Path d="M-4,-1 Q0,-5 4,-1" stroke="#BDBDBD" strokeWidth="1" fill="none" />
  </G>
);

const GrassTuft = ({ x, y, scale = 1 }: { x: number, y: number, scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    <Path d="M-4,0 Q-2,-6 0,0 Q2,-4 4,0" stroke="#689F38" strokeWidth="2" fill="none" />
  </G>
);

const WaterPond = ({ x, y, scale = 1 }: { x: number, y: number, scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    <Path d="M-30,0 Q-15,-20 10,-10 Q30,0 20,20 Q0,30 -20,10 Q-40,10 -30,0" fill="#29B6F6" />
    <Path d="M-20,5 Q-10,0 0,5" stroke="rgba(255,255,255,0.4)" strokeWidth="2" fill="none" />
  </G>
);

const DirtPatch = ({ x, y, scale = 1 }: { x: number, y: number, scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    <Path d="M-40,0 Q-20,-30 20,-20 Q50,0 30,30 Q0,40 -30,20 Q-50,10 -40,0" fill="#FF9800" opacity={0.8} />
  </G>
);

const Flower = ({ x, y, scale = 1 }: { x: number, y: number, scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    <Circle cx="-3" cy="-3" r="3" fill="#E91E63" />
    <Circle cx="3" cy="-3" r="3" fill="#E91E63" />
    <Circle cx="-3" cy="3" r="3" fill="#E91E63" />
    <Circle cx="3" cy="3" r="3" fill="#E91E63" />
    <Circle cx="0" cy="0" r="4" fill="#FFEB3B" />
  </G>
);

const Mushroom = ({ x, y, scale = 1 }: { x: number, y: number, scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    <Rect x="-2" y="0" width="4" height="6" fill="#FFE0B2" />
    <Path d="M-6,0 Q0,-8 6,0" fill="#F44336" />
    <Circle cx="-3" cy="-2" r="1" fill="#FFF" />
    <Circle cx="2" cy="-3" r="1.5" fill="#FFF" />
  </G>
);

const Bush = ({ x, y, scale = 1 }: { x: number, y: number, scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    <Circle cx="-5" cy="2" r="6" fill="#8BC34A" />
    <Circle cx="5" cy="2" r="6" fill="#8BC34A" />
    <Circle cx="0" cy="-4" r="7" fill="#7CB342" />
  </G>
);

const Mountain = ({ x, y, scale = 1 }: { x: number, y: number, scale?: number }) => (
  <G transform={`translate(${x}, ${y}) scale(${scale})`}>
    <Path d="M-30,0 L0,-40 L30,0" fill="#795548" />
    <Path d="M-15,-20 L0,-40 L15,-20" fill="#FFF" opacity={0.9} />
  </G>
);

// --- Logic ---

const convertSyllabusToMapUnits = (completedLessonIds: string[]) => {
  return SYLLABUS_UNITS.map((unit, unitIndex) => {
    const isPreviousUnitCompleted = unitIndex === 0 || (() => {
      const previousUnit = SYLLABUS_UNITS[unitIndex - 1];
      return previousUnit.lessonIds.every(id => completedLessonIds.includes(id));
    })();
    
    const isUnitLocked = !isPreviousUnitCompleted;
    
    const levels = unit.lessonIds.map((lessonId, index) => {
      const isCompleted = completedLessonIds.includes(lessonId);
      const isFirst = index === 0;
      const previousCompleted = index === 0 || completedLessonIds.includes(unit.lessonIds[index - 1]);
      
      let status = 'locked';
      if (isUnitLocked) {
        status = 'locked';
      } else if (isCompleted) {
        status = 'completed';
      } else if (previousCompleted || isFirst) {
        status = 'current';
      }
      
      const types = ['star', 'book', 'chest'];
      const type = types[index % types.length];
      
      return {
        id: lessonId,
        type: type,
        status: status
      };
    });
    
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
      color: isUnitLocked ? '#9CA3AF' : unit.color,
      icon: unit.icon,
      levels: levels,
      isLocked: isUnitLocked,
      index: unitIndex
    };
  });
};

// Global Node Position Calculator
const getNodePosition = (globalIndex: number) => {
  // Use a sine wave for X to create a winding path
  const xOffset = Math.sin(globalIndex * 0.8) * 80; // Smoother curve, wider
  return { 
    x: width / 2 + xOffset, 
  };
};

const TerrainLayer = ({ 
  levels, 
  width, 
  height, 
  unitIndex, 
  globalStartIndex 
}: { 
  levels: any[], 
  width: number, 
  height: number, 
  unitIndex: number,
  globalStartIndex: number
}) => {
  
  // Generate path points for this unit
  // levels are reversed (Top to Bottom visually)
  // levels[0] is the LAST logical level (Highest Global Index)
  // levels[last] is the FIRST logical level (Lowest Global Index)
  const pathPoints = levels.map((_, index) => {
    // Calculate logical index
    // If levels has 3 items. globalStart is 10.
    // levels[0] (Top) -> global 12
    // levels[1] (Mid) -> global 11
    // levels[2] (Bot) -> global 10
    const logicalIndex = globalStartIndex + (levels.length - 1 - index);
    const pos = getNodePosition(logicalIndex);
    return { x: pos.x, y: 60 + index * 120 };
  });

  // Connection to previous unit (Below)
  // We need to connect the Bottom node (levels[last]) to the Top node of the unit below.
  // The unit below starts at globalStartIndex - 1.
  let connectionPath = '';
  if (globalStartIndex > 0) {
    const lastPoint = pathPoints[pathPoints.length - 1];
    const prevUnitTopPos = getNodePosition(globalStartIndex - 1);
    // Draw line to bottom of component + 60 (which is where the next node would be)
    connectionPath = `M ${lastPoint.x} ${lastPoint.y} L ${prevUnitTopPos.x} ${height + 60}`;
  }

  // Construct Path D
  let pathD = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
  for (let i = 0; i < pathPoints.length - 1; i++) {
    pathD += ` L ${pathPoints[i+1].x} ${pathPoints[i+1].y}`;
  }

  // Helper: Distance from point to line segment
  const pointToSegmentDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Check if point is too close to the path
  const isNearPath = (x: number, y: number, minDistance: number) => {
    // Check all path segments
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const dist = pointToSegmentDistance(
        x, y,
        pathPoints[i].x, pathPoints[i].y,
        pathPoints[i + 1].x, pathPoints[i + 1].y
      );
      if (dist < minDistance) return true;
    }
    
    // Check connection to previous unit
    if (globalStartIndex > 0) {
      const lastPoint = pathPoints[pathPoints.length - 1];
      const prevUnitTopPos = getNodePosition(globalStartIndex - 1);
      const dist = pointToSegmentDistance(
        x, y,
        lastPoint.x, lastPoint.y,
        prevUnitTopPos.x, height + 60
      );
      if (dist < minDistance) return true;
    }
    
    return false;
  };

  // Generate decorations
  const decorations = [];
  const numDecorations = Math.floor(height / 20); 
  
  for (let i = 0; i < numDecorations; i++) {
    const seed = unitIndex * 1000 + i;
    const randX = seededRandom(seed);
    const randY = seededRandom(seed + 1);
    const typeRand = seededRandom(seed + 2);
    
    const x = randX * width;
    const y = randY * height;
    
    // Determine element type and required clearance
    let elementType = '';
    let scale = 1;
    let minClearance = 35; // Default clearance (half road width + buffer)
    
    if (typeRand < 0.05) {
      elementType = 'dirt';
      scale = 1.5 + seededRandom(seed) * 0.5;
      minClearance = 70; // Larger elements need more clearance
    } else if (typeRand < 0.1) {
      elementType = 'water';
      scale = 1.2 + seededRandom(seed) * 0.5;
      minClearance = 60;
    } else if (typeRand < 0.15) {
      elementType = 'mountain';
      scale = 1.5 + seededRandom(seed) * 1.0;
      minClearance = 80; // Mountains are tall, need most clearance
    } else if (typeRand < 0.35) {
      elementType = 'tree';
      scale = 0.8 + seededRandom(seed + 3) * 0.6;
      minClearance = 50 + scale * 15; // Trees vary by size
    } else if (typeRand < 0.45) {
      elementType = 'rock';
      scale = 0.7 + seededRandom(seed + 4) * 0.5;
      minClearance = 35;
    } else if (typeRand < 0.55) {
      elementType = 'bush';
      scale = 0.9 + seededRandom(seed) * 0.4;
      minClearance = 40;
    } else if (typeRand < 0.65) {
      elementType = 'flower';
      scale = 0.8 + seededRandom(seed) * 0.4;
      minClearance = 30; // Small elements can be closer
    } else if (typeRand < 0.70) {
      elementType = 'mushroom';
      scale = 0.8 + seededRandom(seed) * 0.4;
      minClearance = 30;
    } else {
      elementType = 'grass';
      scale = 0.8 + seededRandom(seed) * 0.4;
      minClearance = 25; // Grass can be closest
    }

    // Skip if too close to path
    if (isNearPath(x, y, minClearance)) continue;

    // Add decoration based on type
    switch (elementType) {
      case 'dirt':
        decorations.push(<DirtPatch key={`dirt-${i}`} x={x} y={y} scale={scale} />);
        break;
      case 'water':
        decorations.push(<WaterPond key={`water-${i}`} x={x} y={y} scale={scale} />);
        break;
      case 'mountain':
        decorations.push(<Mountain key={`mountain-${i}`} x={x} y={y} scale={scale} />);
        break;
      case 'tree':
        decorations.push(<Tree key={`tree-${i}`} x={x} y={y} scale={scale} />);
        break;
      case 'rock':
        decorations.push(<Rock key={`rock-${i}`} x={x} y={y} scale={scale} />);
        break;
      case 'bush':
        decorations.push(<Bush key={`bush-${i}`} x={x} y={y} scale={scale} />);
        break;
      case 'flower':
        decorations.push(<Flower key={`flower-${i}`} x={x} y={y} scale={scale} />);
        break;
      case 'mushroom':
        decorations.push(<Mushroom key={`mushroom-${i}`} x={x} y={y} scale={scale} />);
        break;
      case 'grass':
        decorations.push(<GrassTuft key={`grass-${i}`} x={x} y={y} scale={scale} />);
        break;
    }
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height + 60} style={{ overflow: 'visible' }}>
        <Defs>
          <LinearGradient id="roadGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFEB3B" stopOpacity="1" />
            <Stop offset="1" stopColor="#FDD835" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        
        {/* Decorations (Behind Path) */}
        {decorations.filter((_, i) => i % 2 === 0)} 

        {/* Road Border */}
        <Path
          d={pathD}
          stroke="#FBC02D"
          strokeWidth="50"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Connection Border */}
        {connectionPath && (
          <Path
            d={connectionPath}
            stroke="#FBC02D"
            strokeWidth="50"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {/* Road Surface */}
        <Path
          d={pathD}
          stroke="url(#roadGradient)"
          strokeWidth="40"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Connection Surface */}
        {connectionPath && (
          <Path
            d={connectionPath}
            stroke="url(#roadGradient)"
            strokeWidth="40"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {/* Road Dashes */}
        <Path
          d={pathD}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="15, 20"
        />
        {/* Connection Dashes */}
        {connectionPath && (
          <Path
            d={connectionPath}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="15, 20"
          />
        )}

        {/* Decorations (Front) */}
        {decorations.filter((_, i) => i % 2 !== 0)}
      </Svg>
    </View>
  );
};

const LevelNode = ({ level, index, globalIndex, unitColor, onPress, showStart = false }: { level: any, index: number, globalIndex: number, unitColor: string, onPress: () => void, showStart?: boolean }) => {
  const pos = getNodePosition(globalIndex);
  const yPos = 60 + index * 120;
  
  const isLocked = level.status === 'locked';
  const isCurrent = level.status === 'current';
  const isCompleted = level.status === 'completed';

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
    <View style={[styles.nodeContainer, { left: pos.x - 40, top: yPos - 40 }]}>
      <TouchableOpacity 
        activeOpacity={0.8} 
        onPress={isLocked ? undefined : onPress}
        style={styles.nodeWrapper}
      >
        <Animated.View style={[
          styles.nodeCircle,
          isCurrent ? animatedStyle : {},
        ]}>
           <View style={[
             styles.nodeLip, 
             { backgroundColor: darkColor } 
           ]} />
           
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
             
             {isCompleted && (
               <View style={styles.crownBadge}>
                 <Icon name="Crown1" size={12} color="#FFC107" variant="Bold" />
               </View>
             )}
           </View>
        </Animated.View>

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

  useFocusEffect(
    useCallback(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  const completedLessonIds = levels
    .filter(l => l.status === 'completed')
    .map(l => l.id);

  const UNITS = convertSyllabusToMapUnits(completedLessonIds);

  let firstCurrentLevelId: string | null = null;
  let currentUnitIndex = -1;
  let currentLevelIndexInUnit = -1;
  
  for (let unitIdx = 0; unitIdx < UNITS.length; unitIdx++) {
    const unit = UNITS[unitIdx];
    const levelIdx = unit.levels.findIndex(l => l.status === 'current');
    if (levelIdx !== -1) {
      firstCurrentLevelId = unit.levels[levelIdx].id;
      currentUnitIndex = unitIdx;
      currentLevelIndexInUnit = levelIdx;
      break;
    }
  }

  // Calculate scroll position to current node
  const calculateScrollToCurrentNode = useCallback(() => {
    if (currentUnitIndex === -1 || !UNITS.length) {
      // No current level found, scroll to end (bottom/start)
      scrollViewRef.current?.scrollToEnd({ animated: false });
      return;
    }

    // Calculate total height from top to the current node
    // Units are displayed in reverse order (last unit at top)
    // So we need to calculate height of all units AFTER currentUnitIndex (which appear BEFORE in reversed order)
    
    let offsetY = 100; // Initial padding at top
    
    // Units after currentUnitIndex are displayed first (at the top) in reversed view
    for (let i = UNITS.length - 1; i > currentUnitIndex; i--) {
      const unit = UNITS[i];
      const sectionHeight = unit.levels.length * 120 + 160;
      offsetY += sectionHeight;
    }
    
    // Now add offset within the current unit
    // Levels within a unit are also reversed for display
    // levelsForDisplay[0] is the last logical level (highest index)
    // The current level at currentLevelIndexInUnit becomes:
    // displayIndex = (unit.levels.length - 1) - currentLevelIndexInUnit
    const currentUnit = UNITS[currentUnitIndex];
    const displayIndex = (currentUnit.levels.length - 1) - currentLevelIndexInUnit;
    
    // Each node is at y = 60 + displayIndex * 120 within the section
    offsetY += 60 + displayIndex * 120;
    
    // Center the node on screen (subtract half screen height)
    const screenHeight = Dimensions.get('window').height;
    offsetY -= screenHeight / 2 - 50; // 50 for some padding
    
    // Ensure we don't scroll to negative
    offsetY = Math.max(0, offsetY);
    
    scrollViewRef.current?.scrollTo({ y: offsetY, animated: false });
  }, [UNITS, currentUnitIndex, currentLevelIndexInUnit]);

  useEffect(() => {
    setTimeout(() => {
      calculateScrollToCurrentNode();
    }, 100);
  }, [calculateScrollToCurrentNode]);

  const handleLevelPress = (levelId: string, levelType: string) => {
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

  // Calculate global start indices
  let globalIndexCounter = 0;
  const unitsWithGlobalIndex = UNITS.map(u => {
    const start = globalIndexCounter;
    globalIndexCounter += u.levels.length;
    return { ...u, globalStartIndex: start };
  });
  
  const reversedUnitsWithGlobal = [...unitsWithGlobalIndex].reverse();

  return (
    <View style={{ flex: 1, backgroundColor: '#8BC34A' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
           <Icon name="ArrowLeft2" size={24} color={THEME.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Learning Path</Text>
        </View>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: 100 }} /> 

        {reversedUnitsWithGlobal.map((unit) => {
          const levelsForDisplay = [...unit.levels].reverse();
          const sectionHeight = levelsForDisplay.length * 120 + 160; // Add space for unit header

          return (
            <View key={unit.id} style={[styles.unitSection, { height: sectionHeight }]}>
              {/* Terrain & Path */}
              <TerrainLayer 
                levels={levelsForDisplay} 
                width={width} 
                height={sectionHeight}
                unitIndex={unit.index}
                globalStartIndex={unit.globalStartIndex}
              />
              
              {/* Nodes */}
              {levelsForDisplay.map((level, index) => {
                // Calculate logical global index for this node
                // levelsForDisplay[0] is the LAST logical node of this unit
                // logical index = globalStartIndex + (length - 1 - index)
                const logicalIndex = unit.globalStartIndex + (levelsForDisplay.length - 1 - index);
                
                return (
                  <LevelNode 
                    key={level.id}
                    level={level}
                    index={index} 
                    globalIndex={logicalIndex}
                    unitColor={unit.color}
                    onPress={() => handleLevelPress(level.id, level.type)}
                    showStart={level.id === firstCurrentLevelId}
                  />
                );
              })}

              {/* Unit Header (Floating) */}
              <View style={[styles.unitHeader, { backgroundColor: unit.color, opacity: unit.isLocked ? 0.8 : 1 }]}>
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
    zIndex: 100,
    position: 'absolute', 
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitleContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 16,
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
    marginBottom: 0, // Seamless
    position: 'relative',
    overflow: 'visible', // Allow connection lines to draw outside
    zIndex: 1,
  },
  unitHeader: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 50,
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
  nodeContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
    zIndex: -1,
    transform: [{ translateY: 6 }], 
  },
  nodeFace: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
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
