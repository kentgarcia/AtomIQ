# Dark Mode Smoke Matrix

Manual visual verification companion to [`DARK_MODE_COMPLIANCE_SPEC.md`](./DARK_MODE_COMPLIANCE_SPEC.md).
Capture each route in **light** and **dark**, then toggle live without leaving the screen.

Evidence convention: `docs/evidence/dark-mode/<route>-<light|dark>.png`
(create `docs/evidence/dark-mode/` when capturing; it is not committed by default).

## How to run

```bash
npm start            # or: npm run android / npm run ios
```

In the app: **Profile → Settings → Dark mode** toggles the theme live.
Also test with **Settings → Appearance: Follow system** and flip the OS scheme.

## Pass criteria for every row

- No white panel, light input, or light divider on a dark page.
- No dark text/icon/divider on a dark surface; contrast is readable.
- Accent fills keep their brand hue; on-color text is legible.
- Pressed / disabled / selected / loading / empty / error states all match the mode.
- Toggling while the screen is open updates it immediately, with no route
  change, scroll jump, lost modal, lost form text, or lost game progress.

## Routes and states

| # | Route | States / surfaces to verify | Notes |
| --- | --- | --- | --- |
| 1 | `app/index.tsx` (launch) | Loading spinner + background | Should follow theme, no white flash on dark cold start. |
| 2 | `app/onboarding.tsx` | Every step, page dots, primary/secondary buttons, progress ring, modals | Onboarding palette is mode-aware; icons keep brand colors. |
| 3 | `app/(tabs)/index.tsx` (Home) | Path/units, locked/current/completed nodes, XP pill, level-up modal, lesson preview overlay | Locked node face/icon must be readable in both modes. |
| 4 | `app/(tabs)/awards.tsx` (Games) | Pick-a-Game cards, How-to-Play card, difficulty panel | Game cards, chips, and highlights. |
| 5 | `app/(tabs)/chat.tsx` | Empty state, message list, input bar, suggestion pills, beta notice modal | Input and bubbles must not stay light on dark. |
| 6 | `app/(tabs)/leaderboard.tsx` | Podium 1/2/3, list rows, refresh, loading/error, “You” highlight | Silver medal is an approved exception (EX-02). |
| 7 | `app/(tabs)/community.tsx` | Filter pills, search, feed, saved list, comments sheet, report modal, guidelines modal, undo snackbar | Feed/card/modals all use `theme.palettes.ui`. |
| 8 | `app/(tabs)/profile.tsx` | Front/back flip, stats, title progress, achievements, avatar picker, share, celebration modal | Card flip must preserve state across theme changes. |
| 9 | `app/settings.tsx` | Sections, switches (dark mode, sound, haptics), delete-account modal | Toggle here is the primary live-switch test. |
| 10 | `app/streak.tsx` | Streak calendar, day states, CTA | Calendar cells and outlines. |
| 11 | `app/encyclopedia.tsx` | List, search, letter filter, empty state | Search input + placeholder color. |
| 12 | `app/explorer/encyclopedia.tsx` | Search, category pills, cards, empty, footer | Thumbnails use mode-aware category tints. |
| 13 | `app/explorer/encyclopedia-entry.tsx` | Hero, fact cards, myth block, TTS active, not-found | Myth overlay exception (EX-03). |
| 14 | `app/explorer/index.tsx` | Explorer hub cards and CTAs | `palettes.explorer`. |
| 15 | `app/explorer/journey.tsx` | Journey list, node states | `palettes.explorer`. |
| 16 | `app/explorer/journey-node.tsx` | Node gradients and labels | Node art gradients are brand art. |
| 17 | `app/explorer/atom-maze.tsx` | Intro, battle, quiz, HUD, defeat/victory/complete results | Maze board is an approved art exception (EX-01/EX-04/EX-05). |
| 18 | `app/lesson/[id].tsx` + `components/lesson/*` | Preview, briefing, micro-learn, mythbuster, assessment, lab, debrief | Check step cards, progress bar, feedback, and rewards. |
| 19 | `app/quiz/[id].tsx` | Question, selected/correct/wrong, results | Answer feedback tints must survive dark mode. |
| 20 | `app/mythbuster/index.tsx` | Intro, question, reveal, score | Orange identity, mode-aware surfaces. |
| 21 | `app/lab/index.tsx` | Radiation Shield, Build an Atom, Decay Lab, result/hint/challenge cards | Lab controls and result cards use `useLabStyles()`. |
| 22 | `app/achievement-detail.tsx` | Certificate, progress, locked/unlocked | Certificate surface is mode-aware. |
| 23 | `app/terms-of-service.tsx` / `app/privacy-policy.tsx` | Long-form text, links, headings | Body text, links, dividers. |
| 24 | `app/modal.tsx` | Modal sheet | Navigation chrome + sheet surface. |
| 25 | System bars | Status bar, Android navigation bar, tab bar, dialogs | Icons readable in both modes (driven by `app/_layout.tsx`). |

## Live-toggle state preservation checklist

While a screen is mounted, toggle dark mode and confirm:

- [ ] The route does not change and scroll position is preserved.
- [ ] Any open modal/sheet stays open and restyles.
- [ ] Form text and focus are preserved (profile name, chat input, report reason).
- [ ] Game/quiz progress and timers continue (maze HP, quiz question, lesson step).
- [ ] Returning to a backgrounded route shows the current mode, not a stale palette.
- [ ] No console warnings about missing theme values appear.
