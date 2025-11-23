# Map Infinite Loading Fix

## Problem
The learning path map was stuck in an infinite loading loop, flashing briefly before resetting to the loading state.

## Root Cause
The `useFocusEffect` hook in `app/map/index.tsx` was causing an infinite re-render loop:

1. Screen focuses → `useFocusEffect` calls `refresh()`
2. `refresh()` sets `loading` to `true` → state update triggers re-render
3. `loading` was in the dependency array → `useFocusEffect` callback recreates
4. Callback recreation triggers the effect again → calls `refresh()` again
5. Loop continues infinitely

The key issue was having `loading` in the dependency array of `useFocusEffect`, which caused the effect to run every time the loading state changed.

## Solution
Implemented a "skip first render" pattern:

```typescript
const isFirstRender = useRef(true);

useFocusEffect(
  useCallback(() => {
    // Skip the first render to avoid double-loading
    // The data is already loaded by useAllLevels on mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Only refresh when returning to the screen (e.g., after completing a lesson)
    refresh();
  }, [refresh])
);
```

### Why This Works
1. **First Mount**: When the map screen first loads, `useAllLevels` already loads the data via its internal `useEffect`. The `useFocusEffect` skips execution on first render.
2. **Subsequent Focuses**: When returning to the map (e.g., after completing a lesson), the `useFocusEffect` calls `refresh()` to update the progress.
3. **Stable Dependencies**: Only `refresh` is in the dependency array, which is stable (wrapped in `useCallback` in the hook).

## Additional Fixes
1. **Icon Mapping**: Added `Book: 'Book1'` and `Target: 'Target'` to the icon mapping to prevent missing icon warnings.

## Files Modified
- `app/map/index.tsx` - Fixed infinite loading loop
- `components/ui/icon.tsx` - Added missing icon mappings

## Testing
To verify the fix:
1. Navigate to the map screen from the home dashboard
2. Map should load once and display correctly
3. Complete a lesson
4. Return to the map
5. Map should refresh and show updated progress without looping

## Technical Notes
- `useFocusEffect` runs every time the screen comes into focus
- Dependencies in `useFocusEffect` should be stable to avoid unnecessary re-runs
- State changes during the effect execution can cause loops if not handled carefully
- Using refs to track render state is a common pattern to prevent double-execution

