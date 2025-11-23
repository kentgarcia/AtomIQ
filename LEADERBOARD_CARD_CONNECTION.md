# Leaderboard Card Connection

## Overview
Connected the leaderboard card on the home dashboard to real leaderboard data and made it clickable to navigate to the full leaderboard screen.

## Changes Made

### 1. **Real Data Integration**

Added `leaderboardPreview` calculation that:
- Uses the same NPC characters as the leaderboard screen
- Includes the user's actual XP and profile
- Sorts all characters by XP (descending)
- Assigns ranks to each character
- Extracts top 3 and user's rank

**Code:**
```typescript
const leaderboardPreview = useMemo(() => {
  // NPC characters (same as leaderboard screen)
  const NPC_CHARACTERS = [...];
  
  // User data
  const userXP = userProfile?.total_xp || 0;
  const userData = {
    name: userProfile?.username || 'You',
    xp: userXP,
    avatar: userProfile?.avatar_url,
    isUser: true,
  };
  
  // Combine and sort
  const allCharacters = [userData, ...npcs];
  const sorted = allCharacters.sort((a, b) => b.xp - a.xp);
  const ranked = sorted.map((char, index) => ({
    ...char,
    rank: index + 1
  }));
  
  return {
    topThree: ranked.slice(0, 3),
    userRank: ranked.find(item => item.isUser)
  };
}, [userProfile]);
```

### 2. **Enhanced Leaderboard Card**

**Before:**
- Hardcoded data (Gilberto Heaney, Annie Doyle)
- Static XP values
- Not clickable
- No user rank display

**After:**
- Real data from leaderboard
- Dynamic XP values
- Clickable card (navigates to leaderboard)
- Shows top 3 with proper rank badges
- Shows user rank if not in top 3
- "View All" button in header

### 3. **Visual Enhancements**

**Rank Badges:**
- 🥇 Gold for rank 1
- 🥈 Silver for rank 2
- 🥉 Bronze for rank 3
- 🟠 Orange for user rank (if not in top 3)

**User Highlighting:**
- User row has orange background tint
- User name shown in orange
- "(You)" label added
- Shows user's title/role

**Card Design:**
- Card container with border
- Divider between top 3 and user rank
- Better spacing and padding
- Clickable with active opacity

### 4. **Navigation**

**Clickable Elements:**
1. **Entire Card**: Tapping anywhere navigates to leaderboard
2. **"View All" Button**: Header button also navigates

**Navigation Path:**
```typescript
router.push('/(tabs)/leaderboard')
```

## Features

### Top 3 Display
- Shows rank 1, 2, 3 with colored badges
- Displays avatar, name, title
- Shows XP with gold icon for rank 1
- Proper spacing and borders

### User Rank Display
- Only shows if user is NOT in top 3
- Separated by divider with "Your Rank" text
- Highlighted with orange background
- Shows user's actual rank number

### Dynamic Updates
- Updates when user earns XP
- Recalculates ranks automatically
- Reflects real-time progress
- Uses `useMemo` for performance

## UI Components

### Header Section
```
┌─────────────────────────────────┐
│ Top Mythbusters    [View All →] │
│ See who's leading...            │
└─────────────────────────────────┘
```

### Leaderboard Card
```
┌─────────────────────────────────┐
│ 🥇 [Avatar] Name (Title)    ⚡ XP │
│ ─────────────────────────────── │
│ 🥈 [Avatar] Name (Title)    ⚡ XP │
│ ─────────────────────────────── │
│ 🥉 [Avatar] Name (Title)    ⚡ XP │
│ ───────── Your Rank ────────── │
│ 🟠 [Avatar] You (Title)      ⚡ XP │
└─────────────────────────────────┘
```

## Styling Details

### Rank Badges
- **Gold (#FFD700)**: Rank 1
- **Silver (#C0C0C0)**: Rank 2
- **Bronze (#CD7F32)**: Rank 3
- **Orange (#FF6B00)**: User rank

### User Row
- Background: `THEME.primary + '08'` (8% opacity)
- Border radius: 12px
- Padding: Extra horizontal padding
- Text color: Orange for name

### Card Container
- Background: Light gray (`THEME.bg`)
- Border: 2px solid
- Border radius: 16px
- Padding: 16px
- Clickable: Active opacity 0.8

## Data Flow

```
User Profile (XP)
    ↓
leaderboardPreview calculation
    ↓
Top 3 + User Rank
    ↓
Render in card
    ↓
User taps card
    ↓
Navigate to /(tabs)/leaderboard
```

## Performance

- **useMemo**: Prevents recalculation on every render
- **Dependency**: Only recalculates when `userProfile` changes
- **Efficient**: Single sort operation
- **Cached**: Results cached until user profile updates

## User Experience

### Before
- Static, uninteresting
- No connection to actual progress
- No way to see full leaderboard
- Hardcoded data

### After
- Dynamic, engaging
- Shows real progress
- Clickable to see full leaderboard
- Real-time updates
- User can see their rank
- Motivational (see top performers)

## Testing Checklist

- [x] Top 3 displays correctly
- [x] Rank badges show correct colors
- [x] User rank shows if not in top 3
- [x] User row is highlighted
- [x] XP values format correctly (commas)
- [x] Card is clickable
- [x] "View All" button works
- [x] Navigation to leaderboard works
- [x] Updates when user earns XP
- [x] Handles user in top 3 (no duplicate)
- [x] Handles user not in top 3 (shows separately)

## Edge Cases Handled

1. **User in Top 3**: Only shows in top 3, no duplicate in "Your Rank"
2. **User Not in Top 3**: Shows top 3 + user rank separately
3. **Zero XP**: User appears at bottom, still shows rank
4. **No Profile**: Uses default values
5. **Missing Avatar**: Uses default avatar URL

## Future Enhancements

- [ ] Animate rank changes
- [ ] Show rank change indicator (↑↓)
- [ ] Add "You're #X away from rank Y" message
- [ ] Show XP needed to reach next rank
- [ ] Add achievement badges
- [ ] Show streak indicators
- [ ] Add quick stats (total players, etc.)

## Files Modified

- `app/(tabs)/index.tsx`
  - Added `leaderboardPreview` calculation
  - Updated leaderboard card JSX
  - Added new styles
  - Added navigation handlers

## Conclusion

The leaderboard card is now fully connected to real data and provides an engaging preview of the leaderboard. Users can see their rank at a glance and easily navigate to the full leaderboard for more details. The card updates dynamically as users earn XP, providing real-time feedback on their progress! 🏆✨

