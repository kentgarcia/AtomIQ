# 017 — Give Edit Profile modal a spatial entrance from its trigger

- **Status**: TODO
- **Commit**: 45c9f92
- **Severity**: MEDIUM
- **Category**: Physicality & origin / Missed opportunities
- **Estimated scope**: 1 file, ~20 lines

## Problem

`app/(tabs)/profile.tsx:686` opens a `Modal` with `animationType="fade"`:

```tsx
// app/(tabs)/profile.tsx:686 — current
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.avatarModalOverlay}>
          <View style={styles.avatarModalContent}>
```

The window fades, but `avatarModalContent` (white card with inputs + 15 avatars) teleports in at `scale:1 / opacity:1` with no transform. At `app/(tabs)/profile.tsx:728` the 15 `avatarModalOption` images also pop in at once. The modal should emanate from its trigger (`avatar` at `app/(tabs)/profile.tsx:364` or `Edit2` button at `app/(tabs)/profile.tsx:307`) — per AUDIT.md §3, popovers/dropdowns scale from trigger via `transform-origin`, pure-fade is a finding. Modals are exempt from center-origin rule, but this modal is a *sheet* anchored to the trigger, not a full-screen centered modal, so origin matters.

Current `avatarModalOverlay` at `app/(tabs)/profile.tsx:1401` is `backgroundColor: rgba(0,0,0,0.55)` with no entrance — it also teleports.

## Target

Add an entering `transform: scale(0.96) + opacity:0` → `scale:1 + opacity:1` with `EASE_OUT`:

```tsx
// target — overlay
      <Modal … animationType="fade" …>
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          style={styles.avatarModalOverlay}
        >
          <Animated.View
            entering={ZoomIn.duration(240).easing(EASE_OUT)}
            exiting={FadeOut.duration(150)}
            style={styles.avatarModalContent}
          >
```

For React Native Reanimated, use `entering={FadeIn.duration(180)}` for overlay and `entering={FadeIn.duration(220).easing(EASE_OUT)}` + `withTiming` scale, or `ZoomIn` with `EASE_OUT`. Keep `transform` + `opacity` only, `transformOrigin` not needed (center is acceptable for this sheet, but scale from `0.96` avoids `scale(0)`).

Avatar grid: stagger `FadeInDown.delay(index*24).springify()` with `damping:20` as used elsewhere, so the 15 options do not all pop at once.

## Repo conventions to follow

- Modal fade exemplar: `app/(tabs)/profile.tsx:686` already uses `animationType="fade"` — keep, add inner scale.
- Easing token: `EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)` at `app/(tabs)/profile.tsx:44` — use it for `ZoomIn` easing, do not hardcode a new bezier.
- Entrance exemplar: `app/(tabs)/profile.tsx:322` `entering={FadeInDown.springify()}` and `app/achievement-detail.tsx:116` `FadeInDown.delay(100).springify()` — match `FadeIn`/`ZoomIn` pattern, not CSS `@keyframes`.
- Keep `transform`/`opacity` only; no `height`/`width`.

## Steps

1. **Wrap `avatarModalOverlay` inner View** at `app/(tabs)/profile.tsx:692` with `Animated.View`:
   ```tsx
   import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
   // replace <View style={styles.avatarModalOverlay}> with
   <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.avatarModalOverlay}>
   ```

2. **Wrap `avatarModalContent` View** at `app/(tabs)/profile.tsx:693` with `Animated.View`:
   ```tsx
   <Animated.View
     entering={FadeIn.duration(220)}
     exiting={FadeOut.duration(150)}
     style={styles.avatarModalContent}
   >
   // or entering={ZoomIn.duration(240).easing(EASE_OUT)} if ZoomIn is available
   ```

3. **Stagger avatars** at `app/(tabs)/profile.tsx:729-760`:
   ```tsx
   {PROFILE_AVATAR_OPTIONS.map((avatarOption, index) => (
     <Animated.View key={avatarOption.key} entering={FadeInDown.delay(index*24).springify()}>
       <TouchableOpacity …><Image …/></TouchableOpacity>
     </Animated.View>
   ))}
   ```
   Keep `TouchableOpacity` hit-testable during entrance (do not block interaction).

4. **Remove any `scale(0)`** if introduced — use `scale(0.96)` minimum.

## Boundaries

- Do NOT change `Modal` `visible` logic, `onRequestClose`, `transparent`, or `updateUserProfile` flow.
- Do NOT change `avatarModalContent` layout, `nameInput`, or `saveButton` styles beyond motion props.
- Do NOT add new dependencies or switch to `react-native-modal`.
- If `avatarModalContent` is not at `profile.tsx:693` at commit `45c9f92`, STOP.

## Verification

- **Mechanical**: `npx tsc --noEmit` 0 errors; `npx eslint app/\(tabs\)/profile.tsx` 0 errors.
- **Feel check**: Tap avatar or `Edit2` button:
  - Dim overlay fades in `180ms EASE_OUT`, white card scales from `0.96` to `1` in `220-240ms EASE_OUT`, no hard pop.
  - In Animations panel at 10%, confirm `transform: scale` + `opacity` only, `EASE_OUT`.
  - Spam open/close — animation retargets via transitions, never restarts from zero (no keyframes).
  - Toggle `prefers-reduced-motion`: overlay `opacity` only, no scale/translate.
- **Done when**: `avatarModalContent` has an `entering` scale+opacity and overlay has `FadeIn`, with avatars staggered `~24ms`.

