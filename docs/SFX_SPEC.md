# AtomIQ: Sound Effects Specification

**Status:** Implemented in part (2026-11-18). Done: phase 0 (library moved), phase 1 (`sfx-core.ts` + `sfx.ts`, loudness pass, `test:sfx`, `check:sfx`, every old caller moved) and the wiring of phases 2 to 4 (§12 lists what is wired and the few rows left out). Not done: phase 5, the device pass. Nothing here has been heard on a device: the picks in §4 were made from file names, durations and measured levels, so every pick is a default to audition, and each can be swapped in one table (§5).
**Owner:** AtomIQ product, design and engineering
**Applies to:** `assets/sfx/**`, `services/ui-sfx.ts` and `services/game-sfx.ts` (replaced by `services/sfx-core.ts` + `services/sfx.ts`), `services/media-core.ts` (gates), `docs/MEDIA_POLICY.md`, and the call sites in §6
**Builds on:** `docs/MEDIA_POLICY.md` (preferences, route policy, gates; this spec adds cues to it, it does not replace it), `services/haptics.ts` (sound and haptic fire together), `components/motion/MOTION.md` (reduced motion)

## 1. Goal

AtomIQ had five sounds: a button click, correct, wrong, game over and a punch. They covered buttons and two games; lessons, rewards, the shop, the feed and the Guide were silent. The new library (Case Portman Audio, "Cute & Cozy UI", plus a few extra packs) is a full UI set. The goal is one **cue catalog** so that:

1. Every meaningful moment has a sound that always means the same thing (a "claim" never sounds like a "wrong answer").
2. Sound arrives with the thing it belongs to: the stamp's thud on the frame it lands, the coin's tick on the frame it is pulled in.
3. It stays calm. A lesson card is seen hundreds of times, so the sounds on it are short, soft and never stack into noise.
4. It obeys the media policy that already exists: the Sound Effects preference, foreground only, screen readers, Read Aloud, reduced motion.

Principles:

1. **One catalog, one player.** Screens never `require` an audio file or call `expo-audio`; they call `playSfx("lesson.answer-correct")`. Same rule as Read Aloud.
2. **Cues are meanings, files are details.** A cue id names the event. Which file plays it is one row in a table, so swapping a sound never touches a screen.
3. **Match the motion's clock.** Cues that belong to an animation are fired from that animation's own timeline constants (`STAMP_LANDS`, `CLAIM_AT`, `FINISH_STAMPS`...), not from guessed timeouts.
4. **Less is more.** Not everything needs a sound. §6 lists what is deliberately silent.
5. **Never the only signal.** Every cue is paired with something visible (and a haptic where one exists). Sound is never the sole carrier of meaning.

### Non-goals

- Background music (still `registerMusicTrack`; no track bundled).
- Voice, Read Aloud, TTS.
- A Sound Effects volume slider. The preference stays on/off.
- Sounds for content authoring tools (Content Studio).

## 2. What changed in phase 0

| Change | Detail |
|---|---|
| Library converted and moved | 40 of the 55 files in `assets/sfx/kent-sfx/` were renamed and moved to `assets/sfx/<group>/<name>.wav` (§4). |
| One format | Everything is **16-bit PCM, mono, 44.1 kHz WAV**. Reasons: (a) `.ogg` does not play on iOS, and the app ships to iOS too; (b) WAV has no decoder start-up delay, which matters for taps; (c) several source WAVs carried a ~1.1 MB embedded cover image each (the 24-bit "Cute & Cozy UI" files), so the 28 MB folder holds about 1.5 MB of audio. The 40 files are now **2.4 MB**. Stereo sources were downmixed to mono (phone speakers are mono, and it halves the size). |
| Old effects deleted | `button-click.mp3`, `correct.mp3`, `wrong.mp3`, `gameover.mp3` and `punch.mp3` are gone. |
| Interim wiring | Replaced in phase 1: `ui-sfx.ts` and `game-sfx.ts` are deleted and every caller uses `playSfx` (§8). `punch` became `game.hit`, an alias of `ui/lock.wav` (the library has no impact sound, see §10). |
| Not moved | 15 files stay in `assets/sfx/kent-sfx/` as the unused library (§4.2). Metro bundles only what is `require`d, so they cost nothing in the app. |

## 3. Library layout and naming

```
assets/sfx/
  ui/        taps, panels, locks, equip, tick                    (13)
  lesson/    answers, typing blip, zoom, start/finish, unlock    (10)
  reward/    pop, coins, level-up, rank-up, chest, purchase      (10)
  social/    messages, notifications, new friend                 (5)
  game/      game over                                           (1)
  kent-sfx/  the unused remainder of the library                 (15)
```

Names are kebab-case, describe the **role**, and have no pack or numbering. A file used by a second cue keeps its first role's name (`ui/lock.wav` also plays the stamp thud); the second use is an alias in the catalog (§5), never a copy.

**Licence.** The 20 "Cute & Cozy UI" files carry the tag `Licensed under Case Portman Audio Standard SFX Licence` (artist: Case Portman Audio). Read the licence before the repository goes public or a store release ships: it may require attribution (add it to the About/credits screen) and may restrict redistributing the raw files in a public repo. The other files have no tags, so their origin is not recorded; note it next to the file when known.

## 4. The files

### 4.1 Moved (40 bundled: 40 moved, `lesson/bubble.wav` dropped, `ui/shop-open.wav` added)

Level columns are measured on the converted files: mean and peak in dBFS. They are the reason for the loudness pass in §7.4.

| New file | Was | Length | Mean | Peak |
|---|---|---|---|---|
| `ui/press.wav` | `Clicked_In.wav` | 0.05 s | -16.0 | 0.0 |
| `ui/release.wav` | `Clicked_Out.wav` | 0.06 s | -17.1 | 0.0 |
| `ui/tab.wav` | `phone_tap_1.ogg` | 0.15 s | -34.5 | -10.4 |
| `ui/select.wav` | `Highlight.wav` | 0.14 s | -20.7 | -1.4 |
| `ui/cancel.wav` | `UI_Cancel.wav` | 0.31 s | -28.4 | -8.2 |
| `ui/modal-open.wav` | `Menu_Open.wav` | 0.22 s | -20.1 | -9.4 |
| `ui/modal-close.wav` | `Menu_Close.wav` | 0.21 s | -17.4 | -3.9 |
| `ui/lock.wav` | `Lock.wav` | 0.26 s | -23.5 | 0.0 |
| `ui/disable.wav` | `UI_Disable.wav` | 0.39 s | -22.6 | -16.4 |
| `ui/warning.wav` | `Warning.wav` | 0.78 s | -24.2 | -6.0 |
| `ui/equip.wav` | `UI_EquipIn.wav` | 0.53 s | -35.9 | -18.1 |
| `ui/unequip.wav` | `UI_EquipOut.wav` | 0.01 s | -22.5 | -16.1 |
| `ui/tick.wav` | `tick.ogg` | 0.04 s | -32.3 | -15.8 |
| `ui/shop-open.wav` | `shop_pressed.mp3` | 3.86 s | -31.9 | -10.0 |
| `lesson/answer-correct.wav` | `Confirm.wav` | 0.79 s | -27.2 | -4.8 |
| `lesson/answer-wrong.wav` | `Cancel.wav` | 0.35 s | -25.1 | -1.1 |
| `lesson/blip.wav` | `Dialogue_Blip.wav` | 0.08 s | -25.5 | -11.8 |
| `lesson/zoom-in.wav` | `System_Camera_Move_Zoom_In.wav` | 0.52 s | -28.5 | -23.1 |
| `lesson/zoom-out.wav` | `System_Camera_Move_Zoom_Out.wav` | 0.53 s | -30.3 | -22.1 |
| `lesson/start.wav` | `Event_Quest_Start.wav` | 0.96 s | -25.3 | -11.5 |
| `lesson/complete.wav` | `Success.wav` | 2.38 s | -21.2 | -3.2 |
| `lesson/finish.wav` | `Event_Quest_Finish.wav` | 0.88 s | -27.0 | -13.0 |
| `lesson/unlock.wav` | `Unlock.wav` | 0.63 s | -26.9 | 0.0 |
| `lesson/whoosh.wav` | `swipe_away_sound.mp3` | 0.14 s | -39.0 | -24.7 |
| `reward/pop.wav` | `reward_pop.ogg` | 0.38 s | -15.5 | 0.0 |
| `reward/coin.wav` | `Currency.wav` | 0.71 s | -26.3 | -5.8 |
| `reward/fill.wav` | `fast_forward_sound.ogg` | 0.48 s | -26.5 | -10.5 |
| `reward/finish-jingle.wav` | `UI_ISLAND_JIN_RECONNECT_.wav` | 3.60 s | -20.0 | -4.4 |
| `reward/level-up.wav` | `SE_MII_LEVELUP.wav` | 1.37 s | -29.4 | -16.7 |
| `reward/rank-up.wav` | `Upgrade D 2.ogg` | 2.50 s | -28.0 | -9.4 |
| `reward/achievement.wav` | `achievement_notification.ogg` | 2.12 s | -25.9 | -6.9 |
| `reward/requirements-met.wav` | `met_all_requirements_sound.ogg` | 1.76 s | -22.7 | -5.9 |
| `reward/chest-open.wav` | `glitter_sparkle.ogg` | 1.67 s | -31.7 | -16.9 |
| `reward/purchase.wav` | `Purchase.wav` | 0.93 s | -22.1 | -3.1 |
| `reward/sparkle.wav` | `glitter_sfx.ogg` | 0.76 s | -43.2 | -8.1 |
| `social/message-send.wav` | `message-send-292621.ogg` | 0.34 s | -22.9 | -9.6 |
| `social/message-receive.wav` | `phone_notification.ogg` | 1.05 s | -21.9 | -7.8 |
| `social/notification.wav` | `notification.mp3` | 0.50 s | -21.8 | -7.1 |
| `social/new-friend.wav` | `UI_Announce_New_Friend.wav` | 0.75 s | -35.1 | -15.0 |
| `social/achievement-scroll.wav` | `achievement_scroll.mp3` | 0.65 s | -18.2 | -1.5 |
| `game/over.wav` | `Failure.wav` | 2.28 s | -18.8 | -1.0 |
| `game/count-1.wav` | `Event_Count_1.wav` | 1.80 s | -22 | -3.3 |
| `game/count-2.wav` | `Event_Count_2.wav` | 2.00 s | -22 | -2.2 |
| `game/count-3.wav` | `Event_Count_3.wav` | 2.00 s | -21.7 | -1.6 |
| `game/count-finish.wav` | `Event_Count_Finish.wav` | 2.50 s | -20 | -5.4 |
| `game/time-up.wav` | `System_Timer_Finish.wav` | 1.06 s | -22 | -8.7 |
| `game/explosion.wav` | `Event_Ranger.wav` | 2.41 s | -20 | -2.7 |
| `game/platformer-jump.wav` | Kenney New Platformer Pack `sfx_jump.ogg` (CC0) | 0.16 s | -22 | -1.1 |
| `game/platformer-coin.wav` | same, `sfx_coin.ogg` | 0.19 s | -22 | -0.9 |
| `game/platformer-hurt.wav` | same, `sfx_hurt.ogg` | 0.18 s | -22 | -1.1 |
| `game/platformer-defeat.wav` | same, `sfx_disappear.ogg` | 0.58 s | -22 | -1.3 |
| `game/platformer-battle.wav` | same, `sfx_magic.ogg` | 0.28 s | -22 | -1.3 |
| `game/step-<ground>-left/right.wav` (grass, snow, sand, stone, soil), `land-<ground>`, `fall-<ground>` (grass, sand, stone, soil), `jump` (the uploaded `Pl_MarioJump00`, one hop for every ground), `checkpoint`, `fireworks-launch` (trimmed to 2.2 s), `fireworks-burst` (trimmed to 2.6 s) | The uploaded footstep (`Pl_Footstep_Soft_<Ground>_Run_00_L/R`), jump, land, fall, `Checkpoint` and `Env_Fireworks_*` recordings, converted to 16-bit mono 44.1 kHz and levelled by `normalize-sfx.mjs` (steps -28, the rest -22); the originals are kept in `assets/sfx/kent-sfx/dump` | 0.05 to 2.6 s | -22 / -28 | -1 |

### 4.2 Left in the library (15)

| File | Why it has no hook yet |
|---|---|
| `UI_Scroll.wav` | 10 s: a loop or a bed, not a one-shot. |
| `item_button_fail.mp3` (2.0 s), `item_button_pressed.ogg` (1.1 s), `shop_hover_1.ogg` (1.5 s) | Too long for a button, and a phone has no hover. Candidates for a bigger shop moment later. (`shop_pressed.mp3` is now `ui/shop-open.wav`.) |
| `Pause.wav`, `Unpause.wav` | No pause control exists in the games today. Use them if one is added. |
| `System_Camera_Move_Zoom_In_FirstPerson.wav`, `System_Camera_Move_Zoom_Out_Tripot.wav` | A second zoom flavour; `ScaleZoomSim` may use them for its biggest step. |
| `Sell.wav` | No selling or refunds. |
| `Button_Pressed.wav`, `button_click_mechanical.ogg`, `UI_Decide.wav` | Alternatives to `ui/press.wav`; keep for A/B listening. |
| `phone_vibrate.mp3` | Nothing in the app vibrates a phone. |

Keep them out of the repo's weight: they still contain the ~1 MB cover images (~25 MB). Either add `assets/sfx/kent-sfx/` to `.gitignore` or run the §2 conversion on them.

## 5. The cue catalog

A cue is `group.name`. `Category` decides the gate (§7.2). `Vol` is the runtime volume after the loudness pass (§7.4); `Gap` is the minimum time between two plays of the same cue, so a rapid tap storm cannot machine-gun; `Pool` is how many overlapping copies may play.

### 5.1 UI

| Cue | File | Category | Vol | Gap | Pool | Meaning |
|---|---|---|---|---|---|---|
| `ui.press` | `ui/press.wav` | tap | .65 | 60 | 2 | Any button pressed. Replaces the old click. |
| `ui.release` | `ui/release.wav` | tap | .50 | 60 | 1 | Finger lifts on a 3D lip button. Optional, off by default (§10). |
| `ui.tab` | `ui/tab.wav` | tap | .70 | 80 | 1 | Tab bar switch (instead of `ui.press` there). |
| `ui.select` | `ui/select.wav` | feedback | .70 | 50 | 2 | Something chosen or placed but not graded. Also **toggle on** (alias `ui.toggle-on`). |
| `ui.cancel` | `ui/cancel.wav` | panel | .70 | 120 | 1 | A dialog dismissed with its X. |
| `ui.modal-open` | `ui/modal-open.wav` | panel | .60 | 120 | 1 | A `ModalDialog` opens. |
| `ui.modal-close` | `ui/modal-close.wav` | panel | .50 | 120 | 1 | A `ModalDialog` closes by backdrop or Android back. |
| `ui.lock` | `ui/lock.wav` | feedback | .80 | 100 | 1 | "Not yet": a locked node, chest or blog. Also the **stamp thud** (alias `lesson.stamp`) and the interim **maze hit**. |
| `ui.disable` | `ui/disable.wav` | feedback | .60 | 120 | 1 | Refused or switched off: **toggle off** (alias `ui.toggle-off`), not enough diamonds. |
| `ui.warning` | `ui/warning.wav` | panel | .70 | 200 | 1 | A destructive dialog opens (delete account, reset progress). Used instead of `ui.modal-open`. |
| `ui.equip` | `ui/equip.wav` | feedback | .70 | 80 | 1 | Shop: an item tried on or equipped. |
| `ui.unequip` | `ui/unequip.wav` | feedback | .50 | 80 | 1 | Shop: item taken off; a reaction removed. |
| `ui.shop-open` | `ui/shop-open.wav` | panel | .80 | 500 | 1 | The shop screen opens. 3.9 s long (the last 0.7 s silent), so it is stopped when the learner leaves (`stopSfx`). |
| `ui.tick` | `ui/tick.wav` | reward | .40 | 45 | 3 | A tiny counted step: a coin landing. It is a `reward` cue, not `voice`, so a chest's stinger does not duck the diamonds' ticks. |

### 5.2 Lesson

| Cue | File | Category | Vol | Gap | Pool | Meaning |
|---|---|---|---|---|---|---|
| `lesson.answer-correct` | `lesson/answer-correct.wav` | feedback | .90 | 150 | 1 | A graded answer is right. Same cue in lessons, quiz, lab, MythBuster, Atom Maze. |
| `lesson.answer-wrong` | `lesson/answer-wrong.wav` | feedback | .80 | 150 | 1 | A graded answer is wrong, or a wrong pair (at .6). Soft on purpose: wrong is not punished with a long buzzer. |
| `lesson.blip` | `lesson/blip.wav` | voice | .35 | 70 | 3 | One typed-out character group of a talking character's bubble. Not used in lessons; reserved for the Shrodi mascot. |
| `lesson.bubble` | `reward/pop.wav` at rate 0.85 | voice | .50 | 120 | 1 | A speech bubble pops in. It was a dialogue sound (`Dialogue_Expression`, too close to the blip); it is now the soft pop of the node bubble, a little lower so it is not the star's. A cue can carry its own default `rate` (§7.5). |
| `lesson.zoom-in` | `lesson/zoom-in.wav` | feedback | .70 | 150 | 1 | The node bubble zooms into the lesson preview; one step of `ScaleZoomSim` toward the atom. |
| `lesson.zoom-out` | `lesson/zoom-out.wav` | feedback | .60 | 150 | 1 | The preview leaves; one step back out. |
| `lesson.start` | `lesson/start.wav` | feedback | .80 | 300 | 1 | A lesson (or journey node) begins. |
| `lesson.complete` | `lesson/complete.wav` | stinger | .90 | 500 | 1 | Lesson, checkpoint or test-out finished. |
| `lesson.finish` | `lesson/finish.wav` | stinger | .85 | 500 | 1 | Practice or review finished; journey node done. |
| `lesson.unlock` | `lesson/unlock.wav` | feedback | .80 | 300 | 1 | The next node opens up. Also a blog piece unlocking. |
| `lesson.whoosh` | `lesson/whoosh.wav` | feedback | .60 | 80 | 2 | A card is swiped away (MythBuster), an attack swing (Atom Maze). |

### 5.3 Reward

| Cue | File | Category | Vol | Gap | Pool | Meaning |
|---|---|---|---|---|---|---|
| `reward.pop` | `reward/pop.wav` | feedback | .70 | 80 | 3 | A small delight: a finish star, a reaction, the node bubble opening. Pitch is varied per use (§7.5). Alias `lesson.star`. |
| `reward.appear` | `reward/pop.wav` at rate 1.15 | reward | .70 | 200 | 3 | The XP coins or diamonds pop out of the bar or chest, before they fly. Higher than the star's pop. Separate from the landing cues. |
| `reward.coin` | `reward/coin.wav` | reward | .80 | 200 | 1 | A claim lands (XP or diamonds arrive). |
| `reward.fill` | `reward/fill.wav` | reward | .60 | 200 | 1 | The quest bar fills before the claim. |
| `reward.finish-jingle` | `reward/finish-jingle.wav` | stinger | .85 | 800 | 1 | The jingle for a finished round: the lesson finish screen (passed) and every Myth Buster results screen. Pinned (`pinSfx`) when the lesson, practice or game screen opens, so the player pool never unloads it before the end. |
| `reward.level-up` | `reward/level-up.wav` | stinger | .90 | 800 | 1 | The level-up dialog on Home. |
| `reward.rank-up` | `reward/rank-up.wav` | stinger | .90 | 800 | 1 | "Badge ranked up!" on Profile. |
| `reward.achievement` | `reward/achievement.wav` | stinger | .90 | 800 | 1 | An achievement is earned; the daily streak goes up. |
| `reward.requirements-met` | `reward/requirements-met.wav` | stinger | .85 | 800 | 1 | A period's quests are all claimed and the chest becomes ready (alias `reward.chest-ready`). |
| `reward.chest-open` | `reward/chest-open.wav` | stinger | .80 | 800 | 1 | A chest opens and its diamonds burst out. |
| `reward.purchase` | `reward/purchase.wav` | reward | .85 | 300 | 1 | A shop purchase (when buying exists). |
| `reward.sparkle` | `reward/sparkle.wav` | voice | .50 | 300 | 1 | A sparkle moment that is not a reward: a fact card revealed, a stat tile's twinkle. |

### 5.4 Social and game

| Cue | File | Category | Vol | Gap | Pool | Meaning |
|---|---|---|---|---|---|---|
| `social.message-send` | `social/message-send.wav` | feedback | .60 | 150 | 1 | The learner sends a message to Shrodi (Guide). |
| `social.message-receive` | `social/message-receive.wav` | feedback | .70 | 300 | 1 | Shrodi's answer lands. |
| `social.notification` | `social/notification.wav` | feedback | .60 | 1000 | 1 | New feed posts arrive while the app is open. |
| `social.new-friend` | `social/new-friend.wav` | feedback | .80 | 500 | 1 | `MeetSheet` opens: the learner meets an NPC for the first time. |
| `social.achievement-scroll` | `social/achievement-scroll.wav` | feedback | .60 | 300 | 1 | The achievement detail opens. |
| `game.over` | `game/over.wav` | stinger | .80 | 800 | 1 | A game is lost. |
| `game.count-one`, `game.count-two`, `game.count-three` | `game/count-1.wav`, `count-2`, `count-3` | feedback | .80 / .80 / .85 | 400 | 1 | The countdown before every Myth Buster round, a quick beat each (shown as 3, 2, 1). Each rings on into the next beat. |
| `game.count-finish` | `game/count-finish.wav` | stinger | .85 | 400 | 1 | The last beat of that countdown (shown as GO!); the round starts as it ends. |
| `game.time-up` | `game/time-up.wav` | feedback | .80 | 400 | 1 | Endless: the clock reached 0. |
| `game.explosion` | `game/explosion.wav` | stinger | .85 | 800 | 1 | The BOOM that ends a Myth Buster round (out of lives, or out of time after `game.time-up`). |
| `game.platformer-jump` | `game/platformer-jump.wav` | feedback | .60 | 90 | 2 | Atom Maze platformer: the hero leaves the ground. |
| `game.platformer-coin` | `game/platformer-coin.wav` | reward | .70 | 60 | 3 | A coin is picked up. |
| `game.platformer-hurt` | `game/platformer-hurt.wav` | feedback | .80 | 300 | 1 | A heart is lost to spikes, a fall or a wrong answer. |
| `game.platformer-defeat` | `game/platformer-defeat.wav` | feedback | .80 | 300 | 1 | An enemy is beaten and disappears. |
| `game.platformer-battle` | `game/platformer-battle.wav` | feedback | .80 | 400 | 1 | The hero touches an enemy and the question battle opens. |
| `game.step-<ground>-left` / `-right` | `game/step-<ground>-left/right.wav` | voice | .30 | 60 | 1 | A footfall each stride the hero walks on the ground (left, then right); ground = the level's terrain (the purple one sounds like soil). |
| `game.jump` | `game/jump.wav` | feedback | .70 | 90 | 2 | The hero jumps, the same hop on every ground (a spring keeps `game.platformer-jump`). |
| `game.land-<ground>` | `game/land-<ground>.wav` | feedback | .70 | 90 | 2 | The hero lands from a fall of more than a few tiles per second. |
| `game.fall-<ground>` | `game/fall-<ground>.wav` | feedback | .80 | 300 | 1 | A defeated hero reaches the floor (snow uses the grass thud). |
| `game.checkpoint` | `game/checkpoint.wav` | reward | .80 | 500 | 1 | A checkpoint flag is raised. |
| `game.fireworks-launch` / `-burst` | `game/fireworks-launch.wav` / `fireworks-burst.wav` | reward | .70 / .80 | 500 | 1 | "Level complete!" is stamped (launch, then the burst 0.65 s later), and the boss's defeat title (burst). |

**Aliases** (one file, two meanings): `ui.toggle-on` = `ui.select`, `ui.toggle-off` = `ui.disable`, `lesson.stamp` = `ui.lock`, `lesson.star` = `reward.pop`, `reward.chest-ready` = `reward.requirements-met`, `game.hit` = `ui.lock` (interim).

## 6. Where each cue plays

A cue fires from the component that already owns the moment. Sound and haptic fire in the same call, never one after a timeout of the other.

### 6.1 App-wide

| Surface | Moment | Cue | Notes |
|---|---|---|---|
| `components/ui/button.tsx`, `icon-button.tsx`, `layout/pressable-icon-button.tsx`, `lesson/TextButton.tsx`, `installGlobalUiSfxHandlers` | Any press | `ui.press` | Already wired (via `playButtonClickSfx`); only the sound changes. Route policy still silences it on lesson, quiz, MythBuster, Lab and Atom Maze. |
| `app/(tabs)/_layout.tsx` (`handlePress`, line 69) | Tab switch | `ui.tab` | Replaces `ui.press` there. |
| `components/ui/modal-dialog.tsx` (`ModalDialog`, the one place all dialogs go through) | Open | `ui.modal-open` (`ui.warning` when its `destructive` variant is used) | One hook covers every dialog: Edit Profile, Leave lesson, Resume lesson, References, Level-up, Badge ranked up. Plays on every route, including lessons: a dialog is not a button click. |
| same | X pressed / backdrop or back | `ui.cancel` / `ui.modal-close` | |
| `components/ui/toggle.tsx` (every switch, Settings included) | Switch on / off | `ui.toggle-on` / `ui.toggle-off` | **Settings.** The gate is read before the first `await`, so the off cue sounds even though the preference flips in the same tick: turning **Sound Effects** off is heard once, as its own confirmation. Turning it on is silent until the preference flips, so `handleSoundEffectsToggle` in `app/settings.tsx` plays `ui.select` as a preview after it. The Delete Account dialog opens with `ui.warning` (`<ModalDialog warning>`). Every other Settings switch (Dark Mode, Read Aloud, Haptics, Teacher lines, Feed posts) gets the toggle cue for free. |
| `components/npc/MeetSheet.tsx` | First meeting opens | `social.new-friend` | |

### 6.2 Home map and lesson preview

| Component | Moment | Cue |
|---|---|---|
| `components/path/NodeBubble.tsx` | Bubble pops open | `reward.pop` at vol .5 |
| `components/path/LessonNode.tsx` (locked) | Tap a locked node | `ui.lock` (instead of the bubble pop) |
| `NodeBubble` launch (`BUBBLE_FX` launch start) | Start/Review pressed, bubble zooms | `lesson.zoom-in` |
| `components/lesson/LessonPreviewLayer.tsx` | Preview leaves | `lesson.zoom-out` |
| `app/lesson/[id].tsx`, `app/practice/[id].tsx` | Run begins (stage `boot` → run) | `lesson.start` (lesson, journey node) |
| `app/(tabs)/index.tsx` | Returning to Home after a completion flipped the next node from locked to current | `lesson.unlock` once, with the node's pop. Needs one small hook: compare `path-core` statuses on focus. |
| `app/(tabs)/index.tsx` | Level-up dialog visible | `reward.level-up` |
| `app/mythbuster/index.tsx` | Results screen shown | `reward.finish-jingle` |

### 6.3 Lesson run (`components/lesson/LessonRun.tsx`)

| Moment | Cue | Notes |
|---|---|---|
| A graded answer is right (`commit`, beside `notifySuccess`) | `lesson.answer-correct` | |
| A graded answer is wrong (`commit`, beside `notifyError`) | `lesson.answer-wrong` | |
| `onMiss` (a wrong pair in a match) | `lesson.answer-wrong` at vol .6 | A right pair locking green plays `ui.select`. |
| Every press that builds an order, match or sort answer (a piece placed, **a sort item moved to another group**, a left card picked in a match, a right pair locking) | `ui.select` | Per press, not per change: changing your mind sounds as often as choosing. A piece taken back out of an order plays `ui.unequip`. The press that completes the set plays nothing here; it is graded at once and the result cue plays. |
| An answer that has no instant feedback: a **prediction** ("Your guess") option, the **slider** | `ui.select` on every press of a prediction option (switching included); on the slider, `ui.select` when the thumb is touched and a soft `ui.tick` each time it passes a notch (every 5 percent of the rail) | A typed number makes no sound while typing. Instant-graded taps play only the result cue: a `ui.select` right before it would double up. |
| Check, Continue, Skip, Show me, Lock in my guess, Back, Leave (X), the feedback sheet's Continue | `ui.press` | Every lesson button is a `Button`, `TextButton`, `IconButton` or `PressableIconButton`, which click; the lesson route policy allows taps (decision 1, resolved). Option rows are not buttons of that kind and stay silent: their pop and the answer cue are the feedback. |
| Teacher bubble arrives (`TeacherBubble`) | `lesson.bubble` | |
| Bubble types itself (`TypedText.tsx`) | none in lessons | `lesson.blip` is **not played in lessons** (a lesson is read, not spoken). It stays in the catalog for a character who talks, the Shrodi mascot, which is not built yet: `<TypedTermText blips>` opts in (every third visible character, 70 ms apart, pitch varied, §7.5; it stops when typing finishes or a tap completes it). |
| A figure appears in a lecture | `reward.pop` at vol .5 | |
| "Want to go deeper?", "Let's correct the exercises you missed!" | `lesson.bubble` | |
| `cards/ScaleZoomSim.tsx` | Each step toward the atom / back | `lesson.zoom-in` / `lesson.zoom-out` |
| `cards/AtomBuilderSim.tsx` | A particle added or removed | `ui.select` / `ui.unequip` |
| `cards/DecayChainSim.tsx` | Each decay step | `reward.pop`, pitch stepping up along the chain |
| Feedback sheet (`FeedbackDock`) | Appears | silent (the answer cue already played) |

### 6.4 Lesson finish (`components/lesson/LessonFinish.tsx`)

Plays on the screen's own clock (`stamp-core.ts`, `stat-reveal-core.ts`), so it stays in step with the visuals.

| Time | Cue | Notes |
|---|---|---|
| 0 | `reward.finish-jingle` (`lesson.answer-wrong` when a checkpoint is below its pass mark) | The 3.6 s jingle is the bed; everything below sits under it. `lesson.complete` and `lesson.finish` are no longer played here. |
| `FINISH_STAMPS.title + STAMP_LANDS` | `lesson.stamp` (`ui.lock`) at vol .6 | The title stamp's contact frame. |
| Star *i*: `FINISH_STAMPS.stars + i × starStep + STAMP_LANDS` | `lesson.star` (`reward.pop`) | Pitch steps up per star: 1.00, 1.12, 1.26. |
| Stat tile *n*: `statStart(n)` + its landing | `ui.select` at vol .5 | One per tile. |
| Count-up, the repeating shine | silent | A shine that repeats every few seconds must not repeat a sound. |

Reduced motion: everything appears at once, so only the one fanfare plays. Skip the stamp, star and tile cues.

### 6.5 Quests, chests, wallet, shop

| Component | Moment | Cue | Notes |
|---|---|---|---|
| `components/quests/ClaimFx.tsx` | Claim pressed, the bar fills | `reward.fill` | |
| `ClaimCoinLayer` | The coins pop out (`CLAIM_FX.scatterStart`; at once for a chest's diamonds, whose flight skips the fill) | `reward.appear` | One pop for the whole scatter, not one per coin. |
| `ClaimCoinLayer` | Each XP coin pulled into the counter (`landingRing`) | `ui.tick`, pitch rising across the count (§7.5) | |
| `ClaimFx` at `CLAIM_AT` | The claim lands | `reward.coin` | |
| `components/quests/ChestCard.tsx` | Becomes ready (all quests claimed), while the screen is visible | `reward.requirements-met` | Not on every mount: only on the transition. |
| `ChestCard` | Tapped while dimmed | `ui.lock` | |
| `ChestCard` | Opening starts (diamond burst) | `reward.chest-open` | |
| `ClaimCoinLayer` (`kind: "diamond"`) | Each diamond lands | `ui.tick`, then `reward.coin` on the last | |
| `app/shop.tsx` | The screen opens (stopped on leaving) | `ui.shop-open` | `stopSfx("ui.shop-open")` runs on unmount, so a quick back does not leave the jingle playing over Profile. |
| `app/shop.tsx` | Item tapped to try on / tapped again | `ui.equip` / `ui.unequip` | |
| `app/shop.tsx` (when buying exists) | Bought / not enough diamonds | `reward.purchase` / `ui.disable` | |
| `app/(tabs)/profile.tsx` | "Badge ranked up!" opens | `reward.rank-up` | |
| `app/daily-streak.tsx` | Screen shows the streak going up | `reward.achievement` | |
| `app/achievement-detail.tsx` | Opens | `social.achievement-scroll` | Earning one (event) plays `reward.achievement`. |
| `app/daily-facts.tsx`, `components/facts/DailyFactCard.tsx` | Today's fact revealed | `reward.sparkle` | The XP claim after reading plays `reward.coin` through `ClaimFx`. |

### 6.6 Discover, blog, Guide

| Component | Moment | Cue |
|---|---|---|
| `components/feed/ReactionRow.tsx` | A reaction chosen | `reward.pop`, pitch by reaction (like 1.00, love 1.10, clap 0.95, wow 1.20) |
| `ReactionRow` | A reaction removed | `ui.unequip` |
| `hooks/use-feed.ts` (`useFeedUnseenCount` rises while the app is open) | New posts | `social.notification`, at most once a minute |
| `app/blog/[id].tsx` | The "Not unlocked yet" screen shows (a deep link to a piece not unlocked) | `ui.lock`, once |
| blog piece unlocked (event) | | not wired: the feed's `social.notification` covers a new card |
| `app/(tabs)/chat.tsx` | Learner sends | `social.message-send` |
| `chat.tsx` | Shrodi's answer lands | `social.message-receive` |

The Guide has no text box: the learner's "message" is the pill they tap, so `social.message-send` plays on the tap and `social.message-receive` when the new turn is set.

### 6.7 Games and explorer

| Surface | Moment | Cue |
|---|---|---|
| `app/mythbuster/index.tsx` | Card swiped away | `lesson.whoosh` |
| same, `app/explorer/atom-maze.tsx`, `app/lab/index.tsx`, quiz | Graded answer | `lesson.answer-correct` / `lesson.answer-wrong` |
| `app/explorer/atom-maze.tsx` (lines ~1205, 1264) | Attack swing / impact | `lesson.whoosh` then `game.hit` (interim, §10) |
| Atom Maze | Game lost | `game.over` |
| `components/lab/RadiationShieldLab.tsx` | Radiation, shield chip changed | `ui.select` |
| same | Thickness slider moves a step | `ui.tick`, rate rising from 0.8 to 1.6 with the thickness |
| same | A run: source fires | `lesson.whoosh` |
| same | A run: a particle leaves / a stopped one halts in the shield / a survivor reaches the detector | `ui.tick` (rate .7 alpha, 1.1 beta, 1.5 gamma, vol .5) / `game.hit` (vol .45, rate .85) / `ui.tick` (rate 2, vol 2: a Geiger click). Scheduled from `beamCues`, so there is exactly one hit per stopped particle and one click per survivor. |
| same | Run ends | `reward.requirements-met` (under 20 units) or `lesson.answer-wrong` |
| same | Start over / Learn more | `ui.cancel` / `ui.select` |
| `components/lab/BuildAnAtomLab.tsx` | A particle added / removed / the limit is hit | `reward.pop` (rate .9 proton, 1.1 neutron, 1.5 electron) / `ui.unequip` / `ui.disable` |
| same | Check: right / wrong | `reward.requirements-met` and the stat tiles' `ui.select` ticks / `lesson.answer-wrong` |
| same | Next challenge / Start over | `lesson.whoosh` / `ui.cancel` |
| same | The coached build of an Elements challenge | `reward.pop` per particle (same pitches), `reward.sparkle` when the atom is complete, `ui.cancel` on Skip |
| `components/lab/DecayLab.tsx` | Isotope or prediction chosen | `ui.select` |
| same | Watching the sample decay: start / each dot that decays / each half-life | `lesson.whoosh` / `ui.tick` (rate 1.9, vol 1.4: a Geiger click) / `reward.pop` (rate .95 to 1.4) with a caption. Scheduled from `decayCues`: one click per dot that decays, one pop per half-life. |
| same | Discovery answer / Challenge check | `lesson.answer-correct` or `lesson.answer-wrong` / `reward.requirements-met` or `lesson.answer-wrong` |
| same | Time slider step | `ui.tick`, rate rising from 0.8 to 1.6 |
| `app/mythbuster/index.tsx` | Round lost (the BOOM) | `game.explosion`; Endless out of time plays `game.time-up` first |
| `app/mythbuster/index.tsx` | Countdown before every round | `game.count-one`, `game.count-two`, `game.count-three`, then `game.count-finish` |
| `app/explorer/platformer.tsx` | Jump, coin, spikes or fall, enemy touched, enemy beaten | `game.platformer-jump`, `game.platformer-coin`, `game.platformer-hurt`, `game.platformer-battle`, `game.platformer-defeat`; answers use `lesson.answer-correct` / `lesson.answer-wrong`, the end `reward.finish-jingle` or `game.over` |
| `app/explorer/journey-node.tsx` | (none) | Journey nodes are read pages with Previous/Next, with no start or finish moment, so they are silent. |
| `app/onboarding.tsx` | Finished | `lesson.complete` |

### 6.8 Deliberately silent

Splash and content loading, scrolling, the feedback sheet, the repeating stat shine, the Home fireflies, the "more below" cue, Read Aloud start/stop (the speech is the feedback), card transitions in a lesson, and Content Studio.

## 7. Runtime design

### 7.1 Files

| File | Role |
|---|---|
| `services/sfx-core.ts` | Framework-free and unit-tested (erasable syntax, `.ts` import extensions, like `media-core.ts`). The cue table (§5: id, file key, category, volume, gap, pool, aliases), the gate `canPlayCue(category, prefs, env, policy, readAloudSpeaking)`, the throttle (`shouldPlay(cue, now, lastAt)`), the stinger priority rule (§7.3), pitch helpers (`rateFor(cue, index)`) and the cue-id type. |
| `services/sfx.ts` | The runtime over `expo-audio`: the `require` map from file key to asset (the only place assets are required), the player pool, group preloading, `playSfx(cue, options?)`, `stopSfx`, `unloadSfx`. |
| `services/ui-sfx.ts`, `services/game-sfx.ts` | Deleted. `installGlobalUiSfxHandlers`, `initializeSfx`, `unloadSfx`, `warmSfxGroup` and `playSfx` live in `services/sfx.ts`. |
| `components/ui/sfx-on-mount.tsx` | `<SfxOnMount cue=… delay=… />` plays one cue when it mounts, optionally on a point of an animation's clock; used where a cue belongs to a mounting element (bubbles, the finish timeline). |

```ts
playSfx("lesson.answer-correct");
playSfx("reward.pop", { index: 2 });            // pitch step 3 of 3
playSfx("lesson.stamp", { volume: 0.6 });       // multiplies the catalog volume
```

`playSfx` never throws and never awaits UI work. It returns a promise only so the caller may ignore it with `void`.

### 7.2 Categories and gates

Every gate also requires `prefs.soundEffects` and `env.appActive`. Existing helpers in `media-core.ts` are extended, not forked.

| Category | Extra conditions | For |
|---|---|---|
| `tap` | the route policy's `uiClicks`, and no screen reader | press, release, tab |
| `panel` | none (plays on every route, lessons included) | dialogs and sheets |
| `feedback` | none: it plays even with a screen reader (a result is information) | answers, locks, selects, starts, messages |
| `reward` | none | coin, fill, purchase |
| `stinger` | none, plus the priority rule (§7.3) | fanfares and game over |
| `voice` | no screen reader, and **Read Aloud not speaking** | typing blips (opt-in, not in lessons), bubbles, sparkles: they would talk over the speech |

The route policy table in `media-core.ts` keeps its meaning: lessons, quiz, MythBuster, Lab and Atom Maze still turn off generic *taps*; they do not turn off their own cues.

### 7.3 Polyphony and priority

- Each cue has a `Pool` of players. A cue still inside its `Gap` is dropped. A cue with a full pool restarts its oldest player.
- **One stinger at a time.** A new stinger stops the one playing; stingers never layer. Fanfares are rare enough that cutting the older one is fine.
- A stinger **ducks `voice` cues** (blips, sparkles) to silence while it plays, and a stinger plus a `feedback` cue overlap normally.
- At most 6 cues start in any 100 ms window; the rest are dropped (the quietest category first: `voice`, then `tap`).

### 7.4 Loudness

The files are very uneven: mean level runs from -15 dBFS (`reward/pop`) to -43 (`reward/sparkle`), and `expo-audio` volume only goes **down** (0 to 1), so a quiet file cannot be raised at runtime. So level is baked once:

- `scripts/normalize-sfx.mjs` (one-off, repeatable, prints before/after, uses `ffmpeg`): brings each file to a mean target by role, then limits the peak to -1 dBFS. Targets: taps and selects -22, feedback -22, stingers -20, `voice` -28. A file that cannot reach its target without clipping is reported, not clipped.
- Runtime volumes in §5 assume the baked files. They are role-based fine-tuning, not compensation.
- Pairs are judged together on a device: `answer-correct` vs `answer-wrong`, `coin` vs `fill`, and every stinger against every other.

### 7.5 Pitch

A cue may carry a default `rate` in the catalog (`lesson.bubble` 0.85, `reward.appear` 1.15), which lets one file serve two cues; a caller's `rate` or ladder `index` wins over it.

`expo-audio` 58 exposes `player.setPlaybackRate(rate, pitchCorrectionQuality?)` and `player.shouldCorrectPitch`. For a cue with a pitch ladder (`reward.pop` stars and reactions, `ui.tick` coins, `lesson.blip` typing) the runtime sets `shouldCorrectPitch = false` and the rate (1.00 to 1.26), so a higher rate is a higher pitch. Reset to 1 on the next non-ladder play.

Unverified on device: that rate changes apply instantly on a replayed player, and that Android honours `shouldCorrectPitch = false`. If either fails, fall back to baking two or three pitched variants of the cue (a few KB each) and choosing by index.

### 7.6 Players, preloading, memory

A native player is not free (on Android each is a media player). 40 cues with pools is too many to keep alive, so:

- Players are created lazily and kept in an LRU capped at about 24 live players.
- A group is **warmed** when the route that needs it is entered: `ui` + `lesson` at app start (about 1 MB), `reward` on Home, Quests, Profile and the lesson finish, `social` on Discover and Guide, `game` on the games.
- A cue played before its player has loaded is handed to the player as usual (it plays when ready). Warming a group on route entry keeps that to the first play.
- Measure live-player count and memory on a low-end Android device (§9).

### 7.7 Reduced motion, haptics, accessibility

- Reduced motion keeps audio as the media policy says, except where a cue only exists to sync with a skipped animation (typing blips, stamp, stars, tile reveals, pitch ladders): those are not played, because their visuals did not play. The single stinger still plays.
- Haptics (`services/haptics.ts`) stay where they are; the cue is called in the same function. `notifySuccess`/`notifyError` already sit in `LessonRun.commit` and `ChestCard`.
- Nothing is announced by sound alone. Each cue has a visible twin (colour, icon, text).

## 8. Migrating what exists

| Today | Becomes |
|---|---|
| `playButtonClickSfx()` (5 call sites + the global handlers) | `playSfx("ui.press")` through the wrapper; the tab bar moves to `ui.tab`. |
| `playGameSfx("correct" \| "wrong")` in MythBuster and Atom Maze, `playAnswerSfx` | `lesson.answer-correct` / `lesson.answer-wrong`. |
| `playGameSfx("gameover")` | `game.over`. |
| `playGameSfx("punch")` (Atom Maze impacts) | `game.hit` (alias of `ui.lock`) until a real impact file is added. |
| `preloadGameSfx` / `unloadGameSfx` | `warmSfxGroup("game")` / `unloadSfx()`. |
| Lessons, Lab and lesson myth cards | `docs/MEDIA_POLICY.md` §3 says they play correct/wrong, but nothing in `components/lesson` calls an SFX function today (only MythBuster and Atom Maze do). Phase 2 makes the doc true. |

## 9. Tests and checks

| Script | What it proves |
|---|---|
| `npm run test:sfx` (`scripts/test-sfx.mjs`) | Every cue's file key exists in the `require` map and every alias resolves; categories and gates against the preference, foreground, screen reader, route policy and Read Aloud matrix; throttle (`Gap`) and pool rules; stinger replaces stinger and ducks `voice`; the 6-per-100-ms cap; `rateFor` ladders. |
| `npm run check:sfx` (`scripts/check-sfx.mjs`) | No file in `assets/sfx/<group>/` is unreferenced by a cue, no cue points at a missing file, **no `require` of `assets/sfx` outside `services/sfx.ts`**, no import of `kent-sfx`, no direct `expo-audio` import outside `services/sfx.ts` and `services/media.ts`, and each WAV header is 16-bit PCM, mono, 44.1 kHz with no extra chunks bigger than 1 KB (so a cover image cannot sneak back in; it parses the RIFF header in Node, no `ffprobe`). |
| `npm run test:media` | Extended with the new `canPlayCue` cases; the existing cases stay. |

Add both scripts to `package.json` and to the "Before handing off" list in `CLAUDE.md`, and replace the SFX rows in `docs/MEDIA_POLICY.md` §3 and its code map.

## 10. Open decisions and risks

1. **Buttons in lessons. Resolved:** `/lesson` now allows taps (`uiClicks: true` in `getRouteMediaPolicy`), so every lesson button clicks. Quiz, MythBuster, Lab and Atom Maze stay tap-silent. Option rows stay silent either way.
2. **`ui.release`** (a second sound when the lip button comes up). It suits the 3D buttons but doubles every press. Prototype on `Button` only and listen before enabling.
3. **No impact sound.** The library has nothing for a hit or punch; `game.hit` borrows `ui.lock`. Find or add one, or drop impact sound and keep only the whoosh.
4. **Picks are unheard.** Made from names, lengths and levels. Likely first corrections: `answer-correct` (0.8 s, may be long for a card seen hundreds of times: consider a short variant or `reward.pop`), `answer-wrong`, and `ui.equip` (0.53 s) for the shop.
5. **Streaks of correct answers.** A rising pitch on consecutive correct answers is an easy delight, but it adds a state to `LessonRun`. Not in scope.
6. **Licence terms** (§3).
7. **iOS** is configured (`supportsTablet`) but the release path is Android. WAV works on both; the pitch behaviour in §7.5 should be checked on each.

## 11. Phases

| Phase | Work | Done when |
|---|---|---|
| 0 | Convert and move 40 files, delete the old five, repoint `ui-sfx.ts` and `game-sfx.ts`. | **Done.** |
| 1 | `sfx-core.ts` + `sfx.ts`, `normalize-sfx.mjs` (run it), `test:sfx`, `check:sfx`, `MEDIA_POLICY.md`. The games and buttons use the catalog. | **Done.** Old call sites are gone; both scripts pass. (The wrappers were skipped: every caller moved in one go.) |
| 2 | Lesson run, lecture voice, ScaleZoomSim and the other sims, lesson finish timeline, preview and node bubble. | **Done**, typing a number stays silent. |
| 3 | Dialogs (`ModalDialog`), toggles, Home level-up, node unlock, quests, chests, wallet, shop, profile, streak, achievements, daily facts. | **Done**, apart from purchase (no buying yet) and the "achievement earned" event (§12). |
| 4 | Discover reactions and notifications, blog, Guide, MeetSheet, journey and onboarding. | **Done**, apart from the rows §12 lists. |
| 5 | Device pass on a release-like Android build (and iOS if shipped): levels, pitch ladders, stinger cut-off, live-player count and memory, TalkBack and Read Aloud interaction, silent switch and Bluetooth, backgrounding. | The checklist in `MEDIA_POLICY.md` §6 has an SFX line, and open decisions 1 to 4 are resolved. |

## 12. Implementation notes (what is wired, what is not)

**Changed after review.** Typing blips are off in lessons and every lesson button clicks (see §6.3 and decision 1).

**Wired.** The catalog and runtime; the Home map (node pop and lock, zoom into the preview and out, `lesson.start`, `lesson.unlock` when "next up" moves, level-up); the lesson run (answers, wrong pairs, piece placement, bubbles, footer buttons, deeper offer and replay bubbles, figures, `ScaleZoomSim`, `AtomBuilderSim`, `DecayChainSim`); the finish screen timeline; quests (fill, coin ticks, claim), chests (ready, locked, open); shop try-on; Profile rank-up; streak; achievement detail; daily-fact reveal; Discover reactions and new-post notification; the Guide; the blog's locked screen; `MeetSheet`; MythBuster and Atom Maze (answers, swipe, swing, hit, game over); onboarding; every `ModalDialog`; every `Toggle`; the tab bar and every button.

**Not wired, on purpose or for lack of a hook:**
- `ui.release` (open decision 2).
- `reward.purchase` and the "not enough diamonds" `ui.disable`: the shop cannot buy yet. The cue is in the catalog.
- "Achievement earned" (`reward.achievement` as an event): the achievements screen has no earn moment of its own; only the streak screen and Profile's rank-up play it.
- A sound while typing a number (§6.3).
- A blog piece unlocking (`lesson.unlock`): the new feed card rings `social.notification` instead.
- Journey nodes (read pages).

**Behaviour to know.**
- `ModalDialog` plays `ui.cancel` when its X is used, `ui.modal-close` for the scrim, Android back, or the parent closing it, and never both. Pass `warning` for a destructive dialog.
- A claim's `reward.coin` plays at `CLAIM_AT`; the chest's diamonds play it on their last coin instead.
- The loudness pass ran (`node scripts/normalize-sfx.mjs --apply`). Six files could not reach their target without clipping and were left at the peak limit: `ui/tab`, `ui/lock`, `lesson/answer-correct`, `lesson/answer-wrong`, `lesson/unlock`, `reward/sparkle`. `lesson/whoosh` was raised by about 17 dB (it was very quiet), so listen for hiss.
