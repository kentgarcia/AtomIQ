# AtomIQ Guide — Chat UI Full Explanation & Process

> **Location:** `app/(tabs)/chat.tsx` (Tab route `chat` → Guide) + `services/guide/*` + `components/guide/*`
> **Stack:** Expo Router Tabs, React Native, Reanimated, LinearGradient, `theme` tokens, `expo-image`
> **Principle:** No free-text. 100% pill-driven, rule-based, content-backed navigation. Every pill maps to a verified route; no hallucination.

---

## 1. High-Level Overview

AtomIQ Guide replaces the previous Gemini chatbot (Schrödi) with **Shrodi** — a friendly mascot guide that helps learners navigate to real lessons, encyclopedia entries, articles, mazes, journeys and games via a **sentence-completion** chat.

Two modes share the same file:

| Mode | Tab Bar | Purpose |
|---|---|---|
| **Landing** (`mode="landing"`) | **Visible** | Dashboard — non-redundant overview + entry points |
| **Chat** (`mode="chat"`) | **Hidden** (immersive) | Video-call chat — mascot + speech bubble + chatbox |

Switching is internal state (`const [mode, setMode] = useState<"landing"|"chat">`) with `useEffect` syncing to the custom tab bar:

```ts
// chat.tsx:95
useEffect(() => {
  navigation.setParams({ hideTabBar: mode==="chat" ? "true" : undefined });
}, [mode]);
// _layout.tsx:95 ModernTabBar reads it:
const hide = (focused.params as any)?.hideTabBar === "true";
if (focused.name==="chat" && hide) return null;
```

`chat` is a **Tab screen** (`app/(tabs)/chat.tsx`) inside `Tabs` (`app/(tabs)/_layout.tsx:162`) that uses a **custom `ModernTabBar`** (floating `left:36/right:36/bottom:insets.bottom+16`, `borderRadius:34`). Hiding is not via `tabBarStyle.display` but via the custom component returning `null`.

---

## 2. Features

### 2.1 Landing Dashboard (Non-Redundant)
Copied from **Profile/Home design** (`#FFCA5F` amber outer `borderRadius:26`/`padding:10` + white inner cards `borderRadius:20`/`borderBottomWidth:4` + `sectionCard` `borderRadius:24`/`padding:20`).

* **Header — Home copy** (`homeHeaderBar`): avatar (`getProfileAvatarSource`), `getGreeting()` (`Good morning/afternoon/evening`), `homeXpPill` (`Flash` + `total_xp`). No amber title, no image — minimal.
* **Shrodi Intro Card** — *white card **inside** amber wrapper, below header but still inside it*. Left: `Meet Shrodi` title + overview (“Shrodi is your AtomIQ Guide — tap a sentence like ‘I want to learn about —’ and fill the blank…”). Right: `MASCOTS.happy` 64px circle `#FFF3E0`/`#FFE0B2`. Amber gap `12` creates nesting.
* **Overlapping White Wrapper** — *behind* the amber outer, `whiteBehindWrapper` (`#FFFFFF`, `borderTopRadius:0`/`borderBottomRadius:20`, `marginTop:-16`, `paddingTop:28`, `elevation:3`, `zIndex:1`) peeks from under the amber (`zIndex:2`). Contains the **3D Talk to Guide button** (`#FF8C00`/`#E67E22` lip, `borderBottomWidth:4`, `shadow`, `Message` + `ArrowRight`).
* **Weak Spots** (conditional, `ctx.weakQuizIds.length`): `Focus areas` white `sectionCard` — up to 3 `weakRow` (`#F9FAFB`) with `Refresh` icon + quiz title + `Fix` pill → `onEnterChat("review")`.
* **Quick Starts** — `tileGrid` 2×2 `tile` (`#FDFBF7`/`#F4F5F7`) with `tileIcon` (`${color}14` bg) + `Learn`/`Explore`/`Discover`/`Practice` (icon, title, desc) → `onEnterChat(intent)` pre-fills chat at that intent’s topic stage.
* **Removed** to avoid redundancy (per request): `stripRow` (Lvl/Streak/Mastery), `topic mastery grid`, `daily spark`, `Recommended Next`, header image, amber hero CTA.

Landing drives `onEnterChat(intent?)`:
```ts
const enterChat = async (intent?) => {
  setMode("chat");
  const ctx = await getGuideContext(userProfile);
  const fresh = initialGuideState(ctx);
  const pill = fresh.turns[0].pills?.find(p=>p.payload.intent===intent);
  setState(pill ? applySelection(fresh,pill,ctx,content) : fresh);
};
```

### 2.2 Chat — Video-Call Format

#### Header (Fixed, App Design)
* **No amber wrapper**, no `liveDot`/`AtomIQ Guide` title (removed per request).
* **Minimal plain bar** `chatHeaderPlain` (`flexDirection:row`, `paddingHorizontal:16`, `paddingBottom:10`, `paddingTop:insets.top+8`): left `chatBackBtn` white pill (`ArrowLeft` + `Dashboard` → `setMode("landing")`), right `chatResetBtn` (`Refresh` + `Reset` → `handleSelectPill(start-over)`) when `state.turns.length>1`.

#### Center Stage
* **Mascot** — `mascotStage` centered, `mascotWrapLarge` with `useSharedValue` float (`withRepeat(withTiming(-6,1600))`) + `rot` (`1.2deg/2200`), `mascotLarge` `220×220` `contain` (`pickMascot(turn)` → `happy`/`thinking`/`idea`/`explain` based on `turn.text`).
* **Speech Bubble** — *slightly overlapped* on bottom of mascot: `speechOverlayCard` (`#FFFFFF`, `borderRadius:20`, `padding:20/18`, `borderWidth:2`/`borderBottomWidth:4` `#E5E7EB`, `maxWidth:340`/`width:92%`, `marginTop:-28`, `elevation:5`, `zIndex:2`) with **big & bold** `speechOverlayText` (`fontSize:20`, `fontFamilies.heavy`, `lineHeight:26`, `color:#333333`, `textAlign:center`) showing `activeTurn.text` (`FadeInUp` keyed by `activeTurn.id`).

History chips previously in `stage` (`historyRowWrap`) were removed per request; undo now via input bar.

#### Bottom — Typical Chat Box (Animated)
* **Container** `Animated.View entering={FadeInUp.duration(300)}` `chatBox` (`#FFFFFF`, `borderTopLeft/RightRadius:26`, `borderTopWidth:1` `#E5E7EB`, `paddingHorizontal:16`/`paddingTop:12`/`paddingBottom:insets.bottom+14`, `shadow`/`elevation:8`).
* **Handle** `chatHandle` (`36×4`, `#E5E7EB`, `borderRadius:2`, `alignSelf:center`, `marginBottom:12`) — typical bottom-sheet affordance.
* **Pills Area** (inside `chatBox`, above input):
  - `sentenceHeader` (`I want to learn about` + `blankLine` 88px `#E5E7EB` + `Edit` icon) when `activeTurn.pills[0].kind==="topic"|"category"`.
  - `phraseGrid` (root, `kind==="intent"`): `phrasePill` (`#FFFFFF`/`#E5E7EB`, `borderRadius:14`, `padding:14/12`, `shadow`, `inlineBlank` dashed `46px` `#9CA3AF`) for `I want to learn about` etc. — tap shows blank.
  - `optionGrid` (`FadeIn`): `optionPill` (`#FFFFFF`/`#E5E7EB`, `borderRadius:999`, `padding:14/10`) for `[ Radiation ]` etc.
  - `cardsScroll` horizontal (`ContentCard` `300px` wraps) when `activeTurn.cards` (lesson/quiz/encyclopedia/article/maze/journey/mythBuster/profile-summary).
  - Selection highlight: `isSelected = pendingPill?.id===pill.id` → `backgroundColor:c.primary` / `color:#FFFFFF` / `borderColor:c.primary` + `inlineBlank` `#FFFFFF`.
* **Input Bar** `inputBar` (`#F9FAFB`, `borderRadius:999`, `borderWidth:1` `#E5E7EB`, `padding:14/10`, `gap:10`, `marginTop:14`): left `inputPlaceholder` (`flex:1`, `fontSize:13`, `color:#9CA3AF` or `#333333` medium when `draftText`), right `undoBtn` (`#FFFFFF` pill, `Refresh` + `Undo` `9CA3AF`) visible when `userTurns.length>0` → `handleUndo` (reverts last `user` turn via `handleRevert` with `getDraftForTurns`).

Pill press is **sentence-completing**: `handlePillPress` builds `draftText` as full sentence (`INTENT_PHRASE[intent] + " " + pill.label` for topic/category) and **immediately** `handleSelectPill` → Shrodi replies (`activeTurn.text`) and next pills appear, while `inputBar` retains the completed sentence (`I want to learn about atoms`). No `Send` needed; `Undo` reverts.

---

## 3. Process / Flow

### 3.1 Landing → Chat
1. User opens Guide tab → `mode="landing"` → `LandingDashboard` loads `LoadedContent` (`lessons/quizzes/encyclopedia/articles/mazes/journeys`) + `GuideContext` (`getGuideContext(userProfile)` → `currentLevelId`, `completedIds`, `weakQuizIds`, `unlockedUnitIds`, `level`).
2. User taps `Talk to Guide` (3D white-behind) or a `Quick start` tile (`Learn`/`Explore`/`Discover`/`Practice`) → `enterChat(intent?)` → `setMode("chat")` (hides tab bar via params) → `initialGuideState` → optionally `applySelection` with intent pill → chat stage shows mascot + bubble + bottom pills.
3. Alternatively, `Focus areas` `Fix` → `onEnterChat("review")`.

### 3.2 Chat Sentence Completion
```
Turn 0 (guide): "Hi {name}! What would you like to do?"
  Bottom: [I want to learn about ___] [I want to explore ___] [I want to discover ___] [I want to practice ___]
  Input: "Tap a pill to reply…"

User taps: "I want to learn about" (intent=learn)
  → handlePillPress: draft="I want to learn about", pending=learn pill, handleSelectPill(learn)
  → Engine: handleIntent(learn) → guideTurn "What would you like to learn about?" + topic pills [Atoms][Nuclear Reactions][Radiation]…
  → Stage: bubble updates, input shows "I want to learn about", bottom shows topic option pills + sentenceHeader blank

User taps: "Atoms"
  → handlePillPress: draft="I want to learn about Atoms" (prefix + label), handleSelectPill(topic pill)
  → Engine: handleTopic(atoms) → guideTurn "Great — let's dive into Atoms. What first?" + action pills [Read a Lesson][Test Myself][Read Encyclopedia][Play a Game]
  → Stage: bubble "Great — let's dive…", input retains "I want to learn about Atoms", bottom shows action pills

User taps: "Read a Lesson"
  → draft="Read a Lesson", handleSelectPill → resolveActionCards("recommended-lesson" + topic Atoms) → guideTurnWithCards "Here you go:" + 1-3 lesson cards
  → Bottom: cardsScroll horizontal + input still shows last sentence + Undo

Undo: inputBar Undo → handleUndo → handleRevert(lastUserIndex) → slices turns, recomputes draft via getDraftForTurns (e.g., back to "I want to learn about"), Shrodi bubble reverts.
Reset: header Reset → handleSelectPill(start-over) → initialGuideState
Dashboard: header Dashboard → setMode("landing") → tab bar reappears
```

Engine (`services/guide/engine.ts`) is **pure**: `initialGuideState(ctx)` + `applySelection(state,pill,ctx,content)` → appends `userEcho` + `guideTurn` (via `handleIntent`/`handleCategory`/`handleTopic`/`resolveActionCards`/`handleItem`). All content via `getTopicContent`/`getExploreCategories`/`getDiscoverCategories`; no pill for empty bucket.

---

## 4. UI Details

* **Colors / Tokens:** `theme` `SemanticColors` + `colors.brand` (`#FFCA5F` amber, `#FF8C00` orange, `#5E72E4` indigo, `#2ECC71` success), `spacing`/`radius`/`fontFamilies` (`SNPro-Heavy`/`Medium`/`Regular`), `DURATION`/`EASE_OUT`.
* **Typography:** `heroEyebrow` 10 heavy `#724D06` uppercase, `heroTitle` 22 heavy `#724D06`, `speechOverlayText` 20 heavy `#333333` center, `phraseText`/`optionPillText` 14 semibold, `inputPlaceholder` 13 regular.
* **Shadows / Borders:** Amber outer `elevation:4`/`shadowRadius:6`, white cards `elevation:5`/`shadowRadius:10`, `borderBottomWidth:4` for 3D lip, `borderRadius:20-26`/`999` for pills.
* **Animations:** mascot float `withRepeat` 1600/2200 ms, `FadeInUp` 220-300 ms for bubble/chatBox, `FadeIn` 200 ms for optionGrid, `useReducedMotion` guards.
* **Mascots:** `assets/images/mascot/happy.png` (default/cards), `thinking.png` (learn/explore/discover), `idea.png` (dive), `explain.png` (practice/review).

---

## 5. File Map

```
app/(tabs)/chat.tsx         # GuideScreen (landing+chat), LandingDashboard, header/stack/whiteBehindWrapper, mascotStage, chatBox
app/(tabs)/_layout.tsx       # Tabs + ModernTabBar (custom floating bar, hide on chat via params)
services/guide/
  types.ts                   # GuideIntent, GuidePill (kind+payload), GuideAction, GuideDestination, GuideCard, GuideTurn, GuideContext, GuideState
  topics.ts                  # TOPICS registry (6), LoadedContent, getTopicContent, getExploreCategories, getDiscoverCategories
  context.ts                 # getGuideContext (profile + levels → currentLevelId/weakQuizIds)
  engine.ts                  # initialGuideState, applySelection, pill/card builders, resolveActionCards
  navigate.ts                # navigateDestination(router, dest) → expo-router push
components/guide/
  ContentCard.tsx            # card + CTA
  Pill.tsx                   # (legacy, now inline in chat.tsx)
  GuideBubble.tsx            # (legacy, now speechOverlayCard)
theme/*                      # tokens, themes, motion
```

---

## 6. Verification

* `npx tsc --noEmit` — 0 errors
* `npm run lint` (expo) — 0 errors on `chat.tsx` (20 pre-existing warnings elsewhere)
* Manual: `npx expo start` → Guide tab landing (amber header + Shrodi card + overlapping white Talk button + Focus/Quick starts) → Talk to Guide → video-call (mascot 220, overlay bubble, bottom chatbox with handle + pills → input shows sentence → Undo). Tab bar visible on landing, hidden on chat.
