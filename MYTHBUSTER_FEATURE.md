# MythBuster Mode - Feature Documentation

## Overview
MythBuster Mode is a fully functional minigame with multiple game modes that allows users to earn XP by swiping through nuclear energy myths and facts. It's designed for casual play sessions while waiting for a bus, during breaks, or anytime users want a quick learning session. Now featuring three distinct game modes to match different play styles!

## Features

### 🎯 Game Modes

#### 1. Quick Play (Default)
- **Rounds**: 5 myths
- **Time Limit**: None (casual pace)
- **XP Multiplier**: 1x
- **Perfect for**: Quick sessions, beginners, casual play
- **Icon**: Flash (Orange)

#### 2. Challenge Mode
- **Rounds**: 10 myths
- **Time Limit**: 10 seconds per round
- **XP Multiplier**: 1.5x
- **Perfect for**: Competitive players, skill testing
- **Icon**: Timer (Red)

#### 3. Endless Mode
- **Rounds**: Unlimited (until you fail)
- **Lives**: 3 lives (lose one per wrong answer)
- **XP Multiplier**: 2x
- **Perfect for**: High score chasers, endurance testing
- **Icon**: Infinite (Purple)

### 🎮 Game Mechanics
- **Swipe Interaction**: Swipe left for MYTH, swipe right for TRUTH
- **Alternative Controls**: Tap buttons at the bottom for users who prefer not to swipe
- **Card Stack**: Visual card stack showing the next statement preview
- **Smooth Animations**: React Native Reanimated for fluid card movements

### 🏆 Scoring System
- **Base Score**: 10 XP per correct answer
- **Streak Bonus**: +2 XP per streak level (e.g., 3x streak = +6 XP bonus)
- **Real-time Feedback**: Visual indicators show MYTH/TRUTH as you swipe
- **Streak Counter**: Live streak indicator appears when you get 2+ correct in a row

### 📊 Game Flow

#### 1. Mode Selection Screen
- Three game mode cards with gradient backgrounds
- Mode descriptions and stats
- Rounds count and XP multiplier display
- "PLAY" button for each mode
- Back button to return to home

#### 2. Intro Screen
- Game instructions
- Swipe direction guide
- Streak bonus explanation
- Mode-specific color theme
- "START GAME" button
- Back button to mode selection

#### 3. Playing Screen
- Progress indicator (e.g., "3 / 5")
- Current score display
- Streak banner (when active)
- Card with statement
- Category badge (e.g., "Safety", "Waste", "Energy")
- Difficulty indicator
- Swipe labels (MYTH/TRUTH) that appear during swipe
- Action buttons for tap control

#### 3. Results Screen
- Total XP earned
- Correct answers count
- Accuracy percentage
- Best streak achieved
- "PLAY AGAIN" button
- "BACK TO HOME" button

### 🎨 Design Features
- **Orange Theme**: Matches AtomIQ branding
- **Duolingo-style 3D Buttons**: Thick bottom borders for depth
- **Gradient Backgrounds**: Different colors for intro (orange) and results (green)
- **Visual Feedback**: Card rotation and opacity changes during swipe
- **Responsive Layout**: Adapts to different screen sizes

### 📱 Integration
- Accessible from Home Dashboard "Quick Play" section
- Integrates with local storage system
- Updates user XP automatically
- Logs daily activity for tracking
- Uses content from `@/content/myths`

### 🔧 Technical Implementation

#### Files Created
- `app/mythbuster/_layout.tsx` - Route configuration
- `app/mythbuster/index.tsx` - Main game component

#### Key Technologies
- **React Native Reanimated**: Smooth animations and gestures
- **React Native Gesture Handler**: Swipe detection
- **Expo Linear Gradient**: Beautiful gradient backgrounds
- **Local Storage Integration**: XP and activity tracking

#### State Management
- `gameState`: 'intro' | 'playing' | 'results'
- `currentIndex`: Current card index
- `score`: Total XP earned
- `streak`: Current correct answer streak
- `answers`: Array of correct/incorrect answers

#### Animation Values
- `translateX`: Horizontal card position
- `translateY`: Vertical card position
- `rotate`: Card rotation angle
- `opacity`: Card visibility

### 🎯 User Experience

#### Casual Play
- Quick 2-minute sessions
- 5 statements per game
- Instant feedback
- No commitment required

#### Learning Benefits
- Reinforces nuclear energy facts
- Debunks common myths
- Category-based learning
- Difficulty progression

#### Gamification
- XP rewards
- Streak mechanics
- Accuracy tracking
- Replayability

### 🚀 Future Enhancements
- [ ] Daily challenges with specific themes
- [ ] Leaderboard integration for top myth busters
- [ ] Achievement badges (e.g., "10 Perfect Games")
- [ ] Difficulty selection (Easy, Medium, Hard)
- [ ] Timed mode for extra challenge
- [ ] Multiplayer head-to-head mode
- [ ] Custom myth packs by unit
- [ ] Sound effects and haptic feedback
- [ ] Share results to social media

## Usage

### From Home Dashboard
1. Navigate to Home tab
2. Scroll to "Quick Play" section
3. Tap "MythBuster" card
4. Follow on-screen instructions
5. Swipe or tap to play
6. View results and play again or return home

### Direct Navigation
```typescript
router.push('/mythbuster')
```

## Content Source
The game pulls myths from the centralized content system:
```typescript
import { getAllMyths } from '@/content/myths';
```

Each myth includes:
- `statement`: The claim to evaluate
- `isTrue`: Boolean indicating if it's true or false
- `category`: Topic category
- `difficulty`: Easy, Medium, or Hard
- `explanation`: Why it's true or false
- `sources`: References for the fact

## Performance
- Smooth 60 FPS animations
- Minimal re-renders
- Efficient gesture handling
- Optimized for low-end devices

## Accessibility
- Large touch targets
- Clear visual feedback
- Alternative tap controls
- High contrast text
- Readable font sizes

---

**Status**: ✅ Fully Functional
**Last Updated**: November 23, 2025
**Version**: 1.0.0

