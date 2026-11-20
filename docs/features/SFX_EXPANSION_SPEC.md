# AtomIQ: SFX Expansion Spec

**Status:** Implemented in code (2026-11-20), not yet heard on a device. Picks were made in the lab by ear; the wiring, levels and timings below are untested on hardware (phase 5). `quest.lamp` was dropped.
**Owner:** AtomIQ product, design and engineering
**Applies to:** `assets/sfx/kent-sfx/` (the new upload, gitignored), the call sites in §6, `services/sfx-core.ts` and `services/sfx.ts` (when picks are wired), the dev-only SFX lab (`components/dev/`)
**Builds on:** `docs/features/SFX_SPEC.md` (catalog, categories, gates, polyphony, loudness, reduced motion: all of it still holds and is not repeated here), `docs/critical/MEDIA_POLICY.md`, `docs/features/PHONE_SPEC.md`, `components/motion/MOTION.md`

## 1. Goal

`docs/features/SFX_SPEC.md` gave the app 75 sound files and a cue catalog. Since then the Phone, Shop, Atom Maze platformer and the lesson lecture flow were built, and most of the newest screens are silent or reuse one generic sound: every Phone app, tab and picker plays `ui.select`, a teacher's bubble landing plays `ui.select`, the camera shutter plays `ui.select`, and the Nuclear Map, Scanner and Library have no sound of their own.

A new upload, `assets/sfx/kent-sfx/` (211 files, mostly short UI sounds), is a much better fit for these screens than the first library was. This spec:

1. Sorts the 211 files: 15 already in use, **127 proposed here for 65 moments**, 69 left out with a reason (§2, Appendix B).
2. Says which moment gets which sound and where in the code it plays (§5, §6).
3. Builds a **test page in the app** (§4) so the picks can be heard, compared against what plays today, and changed before anything is wired.

### Principles (new ones, on top of `SFX_SPEC.md` §1)

1. **Listen first, then wire.** Nothing is added to `SFX_FILES` or `CUES` until its pick has been heard in the lab. Picks are made in the lab, not in this document.
2. **A moment is one cue, or a few cues on its timeline.** A cue is still one file (`SFX_SPEC.md` §5). A moment that needs a run of sounds (the install, a count) is several cue calls from the animation's own timeline constants, named `<moment>` plus a suffix (`phone.install`, `phone.install-done`), with ticks done by `index`/`rate` ladders. The lab plays such a moment whole so the sequence can be judged.
3. **Replace before adding.** Where `ui.select` stands in for something specific today (a phone app opening, a bubble arriving, the shutter), the new cue replaces it. Where a moment was silent on purpose (`SFX_SPEC.md` §6.8), it stays silent unless the owner decides otherwise (§10).
4. **Short and quiet by default.** Most of the new files are under 0.3 s and were recorded very quietly (§3.2). The ones that repeat (typing dots, ticks, steps) are `voice` or `reward` ticks with a `gap`; only a rare moment gets a stinger.

### Non-goals

Background music, voice, a volume slider, Content Studio sounds (as in `SFX_SPEC.md`), and wiring any of this in this change.

## 2. The upload

| Group | Files | What |
|---|---|---|
| Already in use | 15 | Converted and in the app: `Event_Count_1/2/3/Finish`, `Event_Quest_Start/Finish`, `Event_Ranger`, `System_Camera_Move_Zoom_In/Out`, `System_Timer_Finish`, `UI_Cancel`, `UI_Disable`, `UI_EquipIn/Out`, `UI_Announce_New_Friend` (Appendix A). The WAVs in the folder are the originals. |
| Proposed here | 127 | One or more candidates for each of the 65 moments in §5. |
| Not proposed | 69 | Loops, near-silent ambience, sub-10 ms clicks, drawing and keyboard sounds with no matching feature (Appendix B). |

The upload has no duplicates (compared by checksum). It has no licence information (§10).

## 3. What the files are like

Measured on the originals (mean and peak level in dBFS, length, channels, leading silence):

### 3.1 Shape

- **Short.** 109 of the 211 are under 0.3 s and 37 are under 30 ms (the `UI_Swkbd_*`, `UI_Interior_Cursor*` and `UI_MyDesignEdit_*` ticks). These are button-and-cursor sounds, which is what the Phone, Shop and Scanner need.
- **A few long ones.** Loops of 10 to 18 s (`UI_Wait`, `UI_Eraser`, `UI_Pen_*`, `UI_Scroll*`, `UI_SurveyCamera_Move`, `UI_Amiibo_Wait`) and stingers or wipes of 2 to 7.5 s. None of them is used: `UI_Wait` (the building-path bed) lost to keeping `reward.fill`.
- **Mixed format.** 48 kHz, 16-bit; 12 are stereo (one is 32 kHz). The lab (and wiring, later) converts to the app's one format: mono, 44.1 kHz, no tags (`SFX_SPEC.md` §3).

### 3.2 Level

The upload is quiet: 126 of the 211 have a mean level below -30 dBFS and 38 are below -40, and `expo-audio` volume only goes down, so the loudness pass raises them (`SFX_SPEC.md` §7.4). The lab does the same pass (target by the loudest role a file is used in, peak at -1 dBFS, never clipped).

- **Raised by 20 dB or more** (so hiss is the thing to listen for): `UI_HighAndLow_Card_2` (+27), `UI_Paper_In` (+26), `UI_Paper_Slide` (+23), `UI_ThemeStart_In` (+24), `UI_RingMenu_Registration` (+24), `UI_Interior_Wipe_On` (+22), `UI_MinigameCounter_Attack` (+21), `UI_AppWipe_In` (+20), `UI_Closet_In` (+20). `UI_AlbumSubmit_Finish` was recorded at -46 and cannot reach its target by 6 dB.
- **Cannot reach the target without clipping** (left at the peak limit, so quieter than their role): `UI_Phone_Start_5` (10 dB short), `UI_Decide_Small_Echo` (9), `UI_Pair_Finish` (6.5), `System_Timer_Start_Event` (5), `UI_Phone_Start_4` (5), `UI_HighAndLow_Card_1` (5), `UI_Count_Poki_Repeat_01` (4), `UI_Interior_Focus` (4), `UI_Check` (3.5). Fix by raising their runtime `volume` ceiling in the catalog row; the lab shows them at the leveled value.
- **Quiet beds, not used**: `System_Lumi_01` to `04` (-65 dBFS, effectively silent).

### 3.3 Lead silence

Silence before the first sound, measured: most files start within 10 ms, but `UI_WipeRemake_In` (196 ms), `UI_AppWipe_In` (141), `UI_Phone_Open` (91), `UI_Storage_In` (65), `UI_Cmn_Open_Small` (58), `UI_Phone_Close` (52), `UI_Interior_Rotate_45` (51) and `UI_Interior_Focus` (50) would feel late on a tap. The lab and the wiring step cut silence below -50 dBFS from the front (keeping 10 ms), so what the lab plays is what the app would play.

### 3.4 Very short files

Files under about 30 ms (`UI_Swkbd_Enter` 7 ms, `UI_Select_Short` 12 ms, `UI_Tab_R` 25 ms, `UI_Count_Coin_Reapeat_1` 28 ms...) are clicks, not sounds. The app already ships one (`ui/unequip.wav`, 15 ms), but whether a native player starts a 7 ms file reliably on a low-end Android phone is unverified. They are used only where the moment is a tick (tabs, swatches, counts, Geiger clicks). Test in the device pass (§11, phase 5).

## 4. The SFX lab (the test page)

A development-only page for hearing every pick. It is not in a release build.

**Open it:** on Home, the new speaker button sits beside the Dev admin gear (bottom left, above the tab bar: beta button, Dev admin, SFX lab). It opens the route `/dev-sfx`.

**What it shows:** one card per moment (65), grouped by area chips along the top (App-wide, Phone, Chats, Field Notes, Camera, Scanner, Nuclear Map, Shop, Numbers and ranks, Lessons, Quests, Feed, Atom Maze, Games and Lab, Onboarding). A card says what the moment is, where it would play, the proposed cue id, gate and volume, and what plays today. Under it, each candidate is a button:

- **A, B, C...** are the candidates. **A (with a star) is the recommended pick** while a moment is undecided; once it is decided, the chosen candidate has a green tick instead (at the pitch you liked, so it plays as chosen), and the card says "Chosen: B", "keep today" or "silent". A sequence (an install, a run of ticks) plays whole and is labelled with what it contains. Tap again, or tap another, to stop.
- **Today** (grey, only where something plays now) plays the app's current sound at its real catalog volume, so the pick is heard against what it would replace. Where the recommendation is to keep it (`ui.press`, `chest.open-alt`) the star is on Today.
- A button shows its length, and "existing ..." labels mark a candidate that is already in the catalog.

**Controls (top):** Volume 50 / 75 / 100% and Pitch 0.8x / 1x / 1.2x / 1.5x apply to everything you play; Stop cuts the sound.

**What it bypasses:** the Sound Effects switch, the route policy, throttling and stinger priority. The lab plays what you tap, always. Its own taps are silent (`/dev-sfx` has `uiClicks: false` in `media-core.ts`), so the click does not sound over the candidate. It plays through the speaker like the app does, so listen on the phone, not only with headphones.

**How the audio gets there:** `node scripts/prepare-audition-sfx.mjs` (or `npm run prepare:audition-sfx`) reads the candidate list, converts each file from `assets/sfx/kent-sfx/` (mono, 44.1 kHz, 16-bit, tags removed, leading silence cut, levelled) into `assets/sfx/audition/` (127 files, 5.8 MB) and writes `components/dev/sfx-lab-sources.ts`. Both are committed, so the lab works without the upload folder. Run it again after editing the data; `--check` verifies the output is current.

**How to change a pick:** edit `components/dev/sfx-lab-data.ts`: move the variant you prefer to the front (it becomes the star), add a candidate (`file("UI_...")`), or add a moment, then run the prepare script and `npm run test:sfx-lab`. That file is the source of truth for the tables in §5; the tables here were generated from it.

**Removing it:** delete `components/dev/sfx-lab*`, `SfxLab.tsx`, `SfxLabFab.tsx`, `assets/sfx/audition/`, `app/dev-sfx.tsx`, the `/dev-sfx` branch in `getRouteMediaPolicy`, and the lines marked `dev-sfx` in `app/(tabs)/index.tsx` and `app/_layout.tsx`. The generated sources file and the lab are loaded only inside `__DEV__`, so Metro leaves them (and 5.8 MB of audio) out of a release build.

## 5. Moments and decisions

**Summary (65 moments, as implemented).** 52 have a chosen sound (50 new files; three of them reuse a cue that exists: `chat.incoming` is `social.message-receive` pitched to 1.5x, `game.sign` is `lesson.bubble`, and `chest.open-alt` swaps `reward.chest-open` for `UI_Wrapping_Open_Appear`). 10 keep today's sound (`ui.press`, `phone.install` = `reward.pop`, `scanner.success` = `ui.select`, `feed.land` = `social.notification`, `game.key` and `game.gem` = `reward.sparkle`, `game.lock` = `lesson.unlock`, `game.boss-victory` = `game.explosion`, `game.impact` = `game.hit`, `onboard.build` = `reward.fill`). 3 are silent (`lesson.scroll-cue`, `game.boss-intro`, `quest.lamp`). One pick carries a pitch: `chat.incoming`, 1.5x. Decisions changed after the first wiring: `scanner.scan` is `UI_CountUp`, `scanner.success` keeps `ui.select`, `shop.equip-confirm` is `UI_Closet_In`, and `phone.install` keeps `reward.pop` (four changes in all).

`Decision` is what was chosen after listening in the lab (A, B, C... are the lab's candidate letters; "keep today" and "silent" are decisions too). `Heard against` are the other candidates. `Gate, vol` are the proposed category (`SFX_SPEC.md` §7.2) and runtime volume. Gap and pool follow `SFX_SPEC.md` §5 by category unless a row needs otherwise: tap 60 ms and 2, panel 120 and 1, feedback 100 and 1 (2 if the pick is under 100 ms), reward 200 and 1 (3 for ticks), stinger 800 and 1, voice 100 and 1. A run of the same tick (counts, ladders) needs `pool: 3` and a `gap` under the step spacing.

#### App-wide

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `nav.page-next` | Next page. explorer/journey-node.tsx (Next, silent today), onboarding steps, Camera gallery, Safety cards. | **D** `UI_Redo` | `UI_Page_Next`; `UI_Paper_In`; `existing lesson.whoosh` | feedback, 0.6 | silent |
| `nav.page-back` | Previous page. Journey Previous, lesson Back, Camera gallery back, Safety card back. | **C** `UI_Undo` | `UI_Page_Back`; `UI_Paper_Slide` | feedback, 0.55 | silent |
| `ui.press` | Global button press (A/B only). components/ui/button.tsx, icon-button.tsx, pressable-icon-button.tsx, TextButton.tsx. | **keep today** (`ui.press`) | `UI_Decide_Small`; `UI_Decide_Sub`; `UI_Cmn_Open_Short` | tap, 0.65 | `ui.press` |
| `ui.panel-open` | A panel opens, then closes. A non-modal panel: the unit card's info panel, bottom sheets (MeetSheet), the reaction picker. | **B** `RingMenu open, close` | `PocketMenu open, close`; `Cmn open, close` | panel, 0.55 | silent |
| `ui.invalid` | A refused tap. Shop buy that fails (ui.lock now), a full list (Build an Atom limit, ui.disable now), a locked option. | **A** `UI_Invalid` | `UI_Swkbd_Invalid`; `UI_Tab_Limit` | feedback, 0.6 | `ui.disable` |
| `ui.announce` | A banner arrives. platformer MissionBanner, a blog piece unlocking, a new story thread, a new app badge. | **A** `UI_Announce_New` | `UI_MenuPointTopBar_In`; `UI_Board_Update` | feedback, 0.7 | silent |
| `ui.delete` | Something is deleted. app/phone-apps/field-note.tsx (after a delete, ui.cancel now), Camera gallery delete. | **A** `UI_Post_Delete` | `UI_MyDesign_Delete`; `UI_Delete_Small` | feedback, 0.7 | `ui.cancel` |

#### Phone

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `phone.start` | The phone is handed over (first open). app/(tabs)/phone.tsx, the first-open hand-over (the intro line was removed, so nothing plays it now). | **C** `Start 2, 3, 5` | `UI_Phone_Start_1`; `UI_Phone_Start_4` | stinger, 0.7 | `reward.pop` |
| `phone.install` | A new app arrives (install moment). components/phone/phone-fx-core.ts timeline: ring fills, then the pop with a burst. | **keep today** (`reward.pop`). Changed after wiring (was `UI_Phone_Install` then `UI_Phone_InstallFinish_2`). | `UI_Phone_Install, UI_Phone_InstallFinish_2`; `UI_Phone_Install, UI_Phone_InstallFinish_1`; `UI_Phone_Install` | reward, 0.75 | `reward.pop` |
| `phone.app-open` | An app opens. components/phone/AppIcon.tsx launch, app/(tabs)/phone.tsx (open). | **A** `UI_Phone_Open` | `UI_PocketMenu_Open`; `UI_Cmn_Open` | feedback, 0.6 | `ui.select` |
| `phone.app-close` | Back to the home screen. The home button inside every phone app (app/phone-apps/*). | **A** `UI_Phone_Close` | `UI_PocketMenu_Close`; `UI_Cmn_Close_Short` | feedback, 0.55 | silent |
| `phone.wallpaper` | A wallpaper is put on. app/phone-apps/wallpapers.tsx. | **B** `UI_AppWipe_In` | `UI_WipeRemake_In`; `UI_ThemeStart_In` | feedback, 0.6 | `ui.select` |

#### Chats

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `chat.typing` | Typing dots appear. app/phone-apps/chat.tsx (queue: the dots before each bubble). | **A** `UI_Swkbd_BalloonAppear` | `UI_Keyboard_In`; `UI_MessageCard_PresentOn` | voice, 0.4 | silent |
| `chat.incoming` | A teacher's bubble lands. app/phone-apps/chat.tsx (each bubble of a node, where ui.select plays now). | **C** `existing social.message-receive` at 1.5x | `UI_MessageWindow_Open`; `System_Message_PlaneAnnounceOn` | feedback, 0.6 | `ui.select` |
| `chat.send` | The learner taps a reply. app/phone-apps/chat.tsx (sendIn). | **A** `UI_Decide_Small` | `existing social.message-send`; `UI_Decide_Sub` | feedback, 0.6 | `ui.select` |
| `chat.sticker` | A sticker or reaction lands. app/phone-apps/chat.tsx (popIn), components/phone/ChatArt.tsx. | **B** `UI_Count_Mile_Finish` | `UI_Point_Stamp`; `UI_MyDesignEdit_Stamp` | feedback, 0.65 | `ui.select` |
| `chat.end` | The story ends ('No more replies'). app/phone-apps/chat.tsx, the divider above Replay. | **A** `UI_Code_Finish` | `UI_Pair_Finish`; `UI_AlbumSubmit_Finish` | feedback, 0.55 | silent |
| `chat.archive` | A thread is archived. app/phone-apps/chats.tsx (the swipe action). | **A** `UI_Storage_In` | `UI_Paper_Slide`; `UI_Post_Delete` | feedback, 0.6 | silent |

#### Field Notes

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `notes.new` | A new note. app/phone-apps/field-notes.tsx (the add button). | **A** `UI_Paper_In` | `UI_Paper_Slide`; `UI_Page_Next` | feedback, 0.55 | `ui.select` |
| `notes.clip` | A line is clipped to Field Notes. components/phone/AddToNotesButton.tsx (AtomDex entry, daily fact). | **A** `UI_Copy` | `UI_Check`; `UI_Check_Small` | feedback, 0.7 | `ui.select` |

#### Camera

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `camera.shutter` | The shutter. app/phone-apps/camera.tsx (take the photo). | **A** `UI_Shutter` | `Shutter, then Interior_Camera`; `UI_Interior_Camera` | feedback, 0.8 | `ui.select` |
| `camera.saved` | The photo is saved. app/phone-apps/camera.tsx, after the shutter. | **A** `UI_AlbumSubmit_Out` | `UI_ConstructionPortfolio_Upload`; `UI_Storage_In` | feedback, 0.6 | silent |
| `camera.option` | A scene, pose or frame is chosen. app/phone-apps/camera.tsx (the pickers). | **C** `UI_Interior_ChangeMode` | `UI_Interior_Focus`; `UI_Tab_R` | feedback, 0.6 | `ui.select` |

#### Scanner

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `scanner.lock` | The reticle locks on, then loses it. app/phone-apps/scanner.tsx, components/scanner/Reticle.tsx. | **C** `Interior_Focus (lock only)` | `Attention On, Off`; `UI_Attention, Off` | feedback, 0.65 | silent |
| `scanner.scan` | Scanning (the 1.2 s ring fill). components/scanner/Shutter.tsx. | **A** `UI_CountUp`. Changed after wiring (was the Poki ticks): one sweep as the ring starts to fill. | `Poki ticks rising, finish`; `System_Timer_Start` | feedback, 0.6 | silent |
| `scanner.success` | A scan succeeds (result sheet). app/phone-apps/scanner.tsx (the result sheet opens). | **keep today** (`ui.select`). Changed after wiring (was `UI_Point_Get` at 1.5x). | `UI_Point_Get`; `UI_Amiibo_Success`; `UI_Count_Poki_Finish` | reward, 0.75 | `ui.select` |
| `scanner.miss` | Nothing under the reticle. app/phone-apps/scanner.tsx (shutter with no lock). | **B** `UI_Swkbd_Invalid` | `UI_Invalid`; `existing ui.lock` | feedback, 0.6 | silent |

#### Nuclear Map

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `map.open` | The map opens. app/phone-apps/map.tsx (on mount). | **A** `UI_WhereanMap_In` | `UI_PocketMenu_Open`; `UI_Phone_Open` | feedback, 0.6 | silent |
| `map.close` | The map closes. app/phone-apps/map.tsx (on leave). | **A** `UI_WhereanMap_Out` | `UI_PocketMenu_Close` | feedback, 0.5 | silent |
| `map.pin` | A pin is tapped, the site card opens. app/phone-apps/map.tsx (pin tap). | **A** `UI_Point_Flag` | `UI_Point_Stamp`; `UI_MenuPointTopBar_In` | feedback, 0.65 | `ui.select` |
| `map.zoom` | Zoom in, then out. app/phone-apps/map.tsx (plus and minus, double tap). | **A** `existing lesson zoom pair` | `Interior_Rotate_45 up, down`; `Zoom_Out_Tripot up, down` | feedback, 0.5 | `ui.select` |
| `map.limit` | Zoom limit reached. app/phone-apps/map.tsx. | **A** `UI_Tab_Limit` | `UI_Swkbd_Limit` | feedback, 0.5 | silent |
| `map.filter` | A kind chip is switched. app/phone-apps/map.tsx (kind chips). | **A** `Tab_R, Tab_L` | `UI_Select_Short` | feedback, 0.55 | `ui.select` |
| `library.book` | A book or safety card is opened. app/phone-apps/library.tsx, safety.tsx (a source or a card). | **A** `UI_HighAndLow_Card_1` | `UI_HighAndLow_Card_2`; `UI_Paper_In` | feedback, 0.55 | silent |

#### Shop

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `shop.tab` | A shop tab or shelf is switched. components/shop/CategoryTabs.tsx, SubTabs.tsx. | **A** `Tab_R, Tab_L` | `UI_Interior_ChangeMode`; `UI_Select_Short` | feedback, 0.6 | silent |
| `shop.swatch` | A colour swatch is picked. components/shop/ColorSwatches.tsx. | **A** `UI_MyDesignEdit_Paint` | `UI_MyDesignEdit_Spoit_On`; `UI_MyDesignEdit_ColorBar_Slide` | feedback, 0.6 | silent |
| `shop.equip-confirm` | Equip is pressed on something owned. app/shop.tsx (the Equip button). | **A** `UI_Closet_In`. Changed after wiring (was keep today). | `UI_LifeSupport_Swap`; `existing ui.equip` | feedback, 0.7 | `ui.equip` |
| `shop.buy-fly` | Diamonds fly to the avatar, then it lands. components/shop/PurchaseFx.tsx (purchase-fx-core.ts timeline). | **A** `Coin ticks, Coin finish` | `Mile ticks, Mile finish`; `Poki ticks, Poki finish` | reward, 0.7 | `reward.coin` |

#### Numbers and ranks

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `count.run` | A number counts up (about one second). components/lesson/StatTile.tsx count-up, level-up bar, Ranks, platformer result panel (silent today). | **A** `UI_CountUp`. Wanted: the count-up is no longer silent (SFX_SPEC.md §6.4 is overturned). | `Mile ticks x8, finish`; `Coin ticks x8, finish`; `MealEffect ticks x8` | reward, 0.55 | silent |
| `rank.up` | The learner's place moved up. app/ranks.tsx (the arrow, RANKS_LAST_SEEN). | **A** `UI_MealEffect_Up` | `existing reward.rank-up` | reward, 0.7 | silent |
| `rank.down` | The learner's place moved down. app/ranks.tsx. | **A** `UI_MealEffect_Down` | - | feedback, 0.55 | silent |
| `rank.podium` | The podium rises: third, second, first. app/ranks.tsx (the Ranks podium). | **A** `Mile finish, pitched up` | `Point stamp x3` | reward, 0.65 | silent |
| `levelup.items` | Unlocked shop items arrive one by one. components/shop/UnlockedItems.tsx (inside the level-up dialog). | **A** `OrderList ticks rising` | `Mile ticks rising` | reward, 0.55 | silent |

#### Lessons

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `lesson.piece` | A piece is picked up and put down. components/lesson/cards/ArrangeItems.tsx (order, match, sort). | **A** `DragStart, DragEnd` | `OrderList_ItemIn x2`; `DragStart, DragEnd_Money` | feedback, 0.6 | `ui.select` |
| `lesson.pair-ok` | A right pair locks green. components/lesson/cards/ArrangeItems.tsx (match). | **A** `UI_Check` | `UI_Check_Small`; `UI_Interior_MultiSelect_On` | feedback, 0.65 | `ui.select` |
| `lesson.scroll-cue` | The 'more below' arrow is tapped. components/lesson/ScrollCue.tsx. | **silent** | `UI_Paper_Slide`; `UI_Page_Next` | feedback, 0.5 | silent |
| `lesson.lock-in` | 'Lock in my guess'. components/lesson/cards/ (prediction items). | **A** `UI_Decide` | `UI_Decide_Title` | feedback, 0.7 | `ui.press` |

#### Quests

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `quest.lamp` | Each claimed quest lights a lamp (1 to 5). components/quests/QuestRow.tsx / ChestCard.tsx (progress toward the chest). | **open**. Not clear what it is: see the note on the card. | `Lamp 1 to 5`; `Board_Update rising` | reward, 0.7 | silent |
| `chest.open-alt` | A chest opens (alternatives). components/quests/ChestCard.tsx. | **A** `UI_Wrapping_Open_Appear`. Replaces reward.chest-open. | `Wrap open, then appear` | stinger, 0.8 | `reward.chest-open` |

#### Feed

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `feed.land` | A post drops into the feed. components/feed/use-drip.ts (posts landing one by one while the page is open). | **keep today** (`social.notification`) | `UI_Post_MovePresent`; `UI_OrderList_In` | voice, 0.45 | `social.notification` |
| `feed.picker` | The reaction picker opens, then closes. components/feed/ReactionRow.tsx. | **A** `RingMenu open, close` | `UI_RingMenu_Registration` | panel, 0.55 | silent |

#### Atom Maze

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `game.sign` | A sign's speech bubble pops open. components/platformer/SignBubble.tsx. | **C** `existing lesson.bubble` | `UI_Swkbd_BalloonAppear`; `UI_MessageWindow_Open` | voice, 0.5 | silent |
| `game.key` | A key is picked up. app/explorer/platformer.tsx. | **keep today** (`reward.sparkle`) | `UI_Count_Poki_Finish`; `UI_AirportPanel_Lamp_1`; `UI_Count_Mile_Finish` | reward, 0.7 | `reward.sparkle` |
| `game.lock` | A lock opens. app/explorer/platformer.tsx. | **keep today** (`lesson.unlock`) | `UI_Wrapping_Open_Basic`; `UI_PocketMenu_Open`; `existing lesson.unlock` | feedback, 0.7 | `lesson.unlock` |
| `game.gem` | A gem is collected. app/explorer/platformer.tsx (world-fx pickups). | **keep today** (`reward.sparkle`) | `Event_Harvest_Bell00`; `UI_Count_Coin_Finish` | reward, 0.7 | `reward.sparkle` |
| `game.heart` | A heart is restored. app/explorer/platformer.tsx. | **A** `UI_MealEffect_Up` | `existing reward.sparkle` | reward, 0.7 | `reward.sparkle` |
| `game.get-ready` | Get ready: Shrodi walks in, the mission shows. components/platformer/entrance-core.ts timeline, MissionBanner.tsx. | **A** `System_Timer_Start` | `UI_Announce_New`; `System_Timer_Start_Event` | feedback, 0.7 | `lesson.start` |
| `game.boss-intro` | The boss cinematic (bars, roar, name stamped). components/platformer/BossIntro.tsx. | **silent** | `System_Timer_Start_Event`; `Event_TsunekichiChance00`; `UI_MinigameCounter_Attack` | stinger, 0.8 | silent |
| `game.boss-victory` | The boss is defeated. components/platformer/BossVictory.tsx. | **keep today** (`game.explosion`) | `System_Timer_Finish_Event`; `existing fireworks-burst` | stinger, 0.85 | `game.explosion` |
| `game.impact` | A hit lands (bricks, enemy hits). app/explorer/platformer.tsx, Radiation Shield lab (replaces the 'game.hit' alias of ui.lock). | **keep today** (`game.hit`) | `UI_MinigameCounter_Attack`; `UI_Decide_Erase`; `System_Message_Katsu` | feedback, 0.8 | `game.hit` |

#### Games and Lab

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `game.timer-tick` | The last seconds of an Endless round. app/mythbuster/index.tsx (once a second under 5 s). | **A** `System_Timer_CountDown` | `UI_CountDown`; `UI_MinigameCounter_Count` | feedback, 0.6 | silent |
| `lab.geiger` | A Geiger click (a run of eight). components/lab/DecayLab.tsx, RadiationShieldLab.tsx. | **A** `Check_Small x8` | `MyDesignEdit_Pen x8`; `Swkbd_Enter x8` | feedback, 0.5 | `ui.tick` |

#### Onboarding

| Cue | Moment | Decision | Heard against | Gate, vol | Today |
|---|---|---|---|---|---|
| `onboard.build` | 'Building your path' (3 s). components/onboarding/PlanStep.tsx. | **keep today** (`reward.fill`) | `UI_Wait (cut at 3 s)`; `existing reward.fill` | feedback, 0.5 | `reward.fill` |
| `onboard.go` | The last button ('Start learning'). components/onboarding/WelcomeStep.tsx. | **A** `UI_Decide_Title` | `UI_Decide_Small_Echo` | feedback, 0.75 | silent |
| `transition.wipe` | A big screen change. Onboarding to Home, Delete Account ('Account deleted' to onboarding). | **A** `UI_HeartWipeIn00` | `UI_AppWipe_In`; `UI_Interior_Wipe_On`; `UI_Return_Title` | stinger, 0.6 | silent |

## 6. Where each one plays

Same rule as `SFX_SPEC.md` §6: the component that owns the moment calls `playSfx`, from the animation's timeline constant where there is one, in the same function as the haptic. Rows replace `ui.select` (or whatever "Today" says); they do not add a second sound.

### 6.1 Phone

| Where | Moment | Cue | Notes |
|---|---|---|---|
| `app/(tabs)/phone.tsx` `open` | An app icon is tapped | `phone.app-open`, replaces `ui.select` | Fire on press, before the route push. |
| each app's home button (`app/phone-apps/*`, `components/phone/band-header.tsx`) | Back to the home screen | `phone.app-close` | Where the button is a plain back, keep the standard press only. |
| `app/(tabs)/phone.tsx` | The install moment | `reward.pop` on each app's pop (unchanged sound; `INSTALL.popAt` of `phone-fx-core.ts`) | First open (`isIntro`) plays `phone.start-1/2/3` instead: five apps arrive at once and must not pop five times. |
| `app/phone-apps/wallpapers.tsx` `choose` | A wallpaper is put on | `phone.wallpaper`, replaces `ui.select` | |
| `app/phone-apps/chat.tsx` (the queue) | Typing dots appear before a bubble | `chat.typing` | Once per bubble at most; muted when Read Aloud speaks (it is a `voice` cue). |
| same, line 82 | A bubble lands | `chat.incoming` = the existing `social.message-receive` at 1.5x (a catalog `rate`), replaces `ui.select` | A letter is up to six bubbles; the 1.5x makes it shorter (about 0.7 s) to suit that. |
| same, `onReply` | A reply chip is tapped | `chat.send` (text), `chat.sticker` (sticker or reaction), replacing `ui.select` | Pick by `reply.type`. |
| same | The story ends | `chat.end` | Plays as the "No more replies." divider shows. |
| `app/phone-apps/chats.tsx` | Archive action tapped | `chat.archive` | Not the swipe itself: the swipe alone archives nothing. |
| `app/phone-apps/field-notes.tsx` | New note | `notes.new`, replaces `ui.select` | |
| `components/phone/AddToNotesButton.tsx` | A line is clipped | `notes.clip`, replaces `ui.select` | |
| `app/phone-apps/field-note.tsx` | A note is deleted | `ui.delete`, replaces `ui.cancel` | Autosave and typing stay silent. |
| `app/phone-apps/camera.tsx` `shoot` | Shutter | `camera.shutter`, replacing `ui.select`; then `camera.saved` as the flash ends | A failed shot keeps `ui.cancel`. Reduced motion has no flash but keeps the sound. |
| same, `set`, `setPose` | Scene, pose, frame | `camera.option`, replaces `ui.select` | |
| `app/phone-apps/scanner.tsx` / `components/scanner/` | Lock, scan, result, miss | `scanner.lock` (no sound on loss); `scanner.scan`, one `UI_CountUp` sweep as the 1.2 s ring starts to fill; the result sheet keeps `ui.select`; `scanner.miss` for a shutter with nothing locked | |
| `app/phone-apps/map.tsx` | Open, close, pin, zoom, limit, chips | `map.open`, `map.close`, `map.pin` (line 145), `map.zoom` (line 102, in or out by the factor), `map.limit` when the zoom hits its bound, `map.filter` (line 151) | The pan itself is silent. |
| `app/phone-apps/library.tsx`, `safety.tsx` | A source or a card is opened | `library.book` | Pages inside a card use `nav.page-next` / `nav.page-back`. |

### 6.2 Shop, numbers, quests

| Where | Moment | Cue | Notes |
|---|---|---|---|
| `components/shop/CategoryTabs.tsx`, `SubTabs.tsx` | Tab or shelf switched | `shop.tab` | Right for a tab to the right of the current one, left otherwise (the lab plays both). |
| `components/shop/ColorSwatches.tsx` | Swatch picked | `shop.swatch` | |
| `components/shop/PurchaseFx.tsx` | Diamonds fly, then land | `shop.buy-fly` ticks per diamond, finish as the last lands | Replaces the single `reward.coin` at `app/shop.tsx:167`; timeline from `purchase-fx-core.ts` (`landMs`, `coinCount`). Reduced motion: the finish only. |
| `app/shop.tsx` `onEquip` | Equip pressed on an owned item | `shop.equip-confirm` (`UI_Closet_In`), replaces `ui.equip` there | Try-on and the equip that follows a purchase keep `ui.equip`. |
| `app/shop.tsx` failed buy | Not enough diamonds | `ui.invalid`, replaces `ui.lock` | Also Build an Atom's limit (now `ui.disable`). |
| `components/lesson/StatTile.tsx`, level-up bar, platformer `ResultPanel.tsx` | A number counts up | `count.run` (`UI_CountUp`, one sweep per count) | Chosen: the count-up is no longer silent, overturning `SFX_SPEC.md` §6.4. Start with the finish stat tiles (they count while the stamps and stars land, so listen for the pile-up with `lesson.star`). One sweep per count, never per digit. Reduced motion shows the final numbers, so no sound. |
| `app/ranks.tsx` | Podium rises; place moved | `rank.podium` on the three rises, `rank.up` / `rank.down` with the arrow | The arrow already plays only when the place moved (`RANKS_LAST_SEEN`). |
| `components/shop/UnlockedItems.tsx` | Unlocked items arrive | `levelup.items`, pitch rising by `index` | Inside the level-up dialog, after `reward.level-up`, which is a stinger: the ticks are `reward`, not `voice`, so they are not ducked. |
| `components/quests/QuestRow.tsx` / `ChestCard.tsx` | A quest is claimed | `quest.lamp`: **open** | Not decided. See §10. |

### 6.3 Lessons, feed, games, onboarding

| Where | Moment | Cue | Notes |
|---|---|---|---|
| `components/lesson/cards/ArrangeItems.tsx` | A piece is picked up, put down | `lesson.piece` (the pick-up) and its second half on the drop, replacing `ui.select`; a piece taken back out keeps `ui.unequip` | A right pair locking: `lesson.pair-ok`. |
| prediction items | Lock in my guess | `lesson.lock-in`, replaces `ui.press` | Only that button. |
| `explorer/journey-node.tsx`, `components/onboarding/QuestionFlow.tsx`, Camera gallery, Safety cards | Next, Previous | `nav.page-next`, `nav.page-back` | Journey nodes get their first sound here. |
| any panel that is not a `ModalDialog` | Opens and closes | `ui.panel-open` pair | Unit info panel, `MeetSheet`, the reaction picker. |
| `components/platformer/MissionBanner.tsx`, blog unlock, a new story thread | A banner arrives | `ui.announce` | Covers the blog-unlock row `SFX_SPEC.md` §12 lists as not wired. |
| `components/feed/ReactionRow.tsx` | The picker opens, closes | `feed.picker` (or the generic pair) | The reaction itself keeps `reward.pop` by reaction pitch. |
| `components/platformer/SignBubble.tsx` | A sign's bubble opens | `lesson.bubble` (existing) | Silent today; no new file. |
| `app/explorer/platformer.tsx` | A heart is restored | `game.heart` (`UI_MealEffect_Up`), replaces `reward.sparkle` for a heart | Key, lock and gem keep `reward.sparkle` / `lesson.unlock`. |
| `components/platformer/entrance-core.ts` | Get ready | `game.get-ready` (`System_Timer_Start`), replaces `lesson.start` there | The boss cinematic stays silent and the boss victory keeps `game.explosion`. |
| `app/mythbuster/index.tsx` | Last seconds of Endless | `game.timer-tick` once a second under 5 s | |
| `DecayLab.tsx`, `RadiationShieldLab.tsx` | A Geiger click | `lab.geiger`, replacing `ui.tick` at rate 2 | |
| `components/onboarding/WelcomeStep.tsx` | Last button | `onboard.go` | |
| onboarding to Home, Delete Account's last stage | A big screen change | `transition.wipe` | Rare and long: only these two. |

### 6.4 Deliberately silent (unchanged)

Everything in `SFX_SPEC.md` §6.8, plus: typing in Field Notes (the keyboard has its own sound), autosave, the map's pan, the Atom Scanner's idle scene, and the repeating shine on anything. The count-up is no longer on this list (`count.run`, chosen); the lesson's "more below" arrow and the boss cinematic are silent by choice.

## 7. What this changes in the catalog

- **New cues**: the 52 chosen moments of §5 (53 cue rows; multi-part moments are several). `ui.press`, the nine other "keep today" moments and the three silent ones add nothing.
- **Replaced stand-ins**: `ui.select` at about 17 call sites on the Phone (list in §6.1), `reward.pop` at the install moment, `reward.coin` at the purchase, `reward.sparkle` / `lesson.unlock` in the platformer pickups, `game.hit` for impacts, `social.notification` for dropping posts.
- **Unchanged**: every cue in `SFX_SPEC.md` §5 stays; this spec only stops using some of them in these places.
- **Size**: the 127 files are 5.8 MB in the lab. Wired, 50 files are bundled (the rest of the folder is dev-only): about 0.5 MB.

## 8. Moving a pick into the app

For each pick the owner confirms in the lab:

1. Copy its converted file from `assets/sfx/audition/<Name>.wav` to `assets/sfx/<group>/<role-name>.wav` (kebab-case, by role, as in `SFX_SPEC.md` §3: `phone/app-open.wav`; add a `phone` group to `SfxGroup`, or use `ui` for the generic ones). The converted file is already mono, 44.1 kHz and levelled, so `normalize-sfx.mjs` leaves it.
2. Add its length to `SFX_FILES`, a row to `CUES` (category, volume, gap, pool from §5) and a `require` to `SOURCES` in `services/sfx.ts`.
3. Call it from the component in §6.
4. `npm run check:sfx` and `npm run test:sfx`.
5. Delete the moment from `sfx-lab-data.ts` when its cue is live and heard (or keep it: the lab's "Today" button then plays the live cue).

A phone-specific group warms with the Phone tab (`warmSfxGroup("phone")`), as `SFX_SPEC.md` §7.6 does for the others.

## 9. Tests and checks

| Script | What it proves |
|---|---|
| `npm run test:sfx-lab` | Every moment has a unique id, a known area, at least one variant and a spec entry in this document; ids that already exist as cues are only A/B of themselves; every `today` and `cue` step names a real cue; every candidate file exists in `assets/sfx/audition/`, nothing else is in it, its length in the generated sources file is true, and a `stopAfter` is within the file. |
| `npm run check:sfx` | As before, plus: every file in `assets/sfx/audition/` is 16-bit mono 44.1 kHz with no big extra chunk; it is required only from `components/dev/sfx-lab-sources.ts`; `expo-audio` is imported in `components/dev/sfx-lab-player.ts` and nowhere new. |
| `npm run test:media` | `/dev-sfx` has no UI clicks. |
| `node scripts/prepare-audition-sfx.mjs --check` | The audition folder and sources file are current. |

## 10. Risks and open decisions

1. **Where these files come from.** The upload has no licence information and the names (`Amiibo`, `Swkbd`, `Pl_Mario...` in the earlier batch) look like game-console assets, which I cannot verify from here. If they are, they are not cleared for a Play Store release or a public repo, and `SFX_SPEC.md` §3 already flags the other pack's licence. Decide before release: confirm the source, or treat this whole library as a placeholder to replace. `kent-sfx/` and `assets/sfx/audition/` should not go public until then (the first is gitignored; the second is committed and dev-only).
2. **Picks are unheard.** As in `SFX_SPEC.md` §10.4. Guessed ones worth a first listen: `Event_TsunekichiChance00` (name says "chance", used as the boss intro), `System_Message_Katsu` and `UI_MinigameCounter_Attack` (impact stand-ins), `UI_Amiibo_Success` (a scan sound, probably right), the five `UI_AirportPanel_Lamp_*` (assumed rising), the `UI_Phone_Start_*` set (assumed parts of one boot sound).
3. **Counting numbers. Decided: yes** (`count.run`, `UI_CountUp`). Watch the finish screen, where counts play with the stamps and stars (`SFX_SPEC.md` §6.4).
4. **The global press (`ui.press`). Decided: keep.**
5. **`quest.lamp` is dropped** (2026-11-20: "no change"). It was: What it is: the daily and weekly chests fill up as quests are claimed. The idea was one rising note per claimed quest (five lamps, five notes) so a learner hears progress toward the chest. It would sound on top of the existing claim sounds (`reward.fill`, `reward.coin`), so it may be too much. Wire it, or drop it (the default if you do not mind). Listen to A in the lab, then say which.
6. **Hiss.** Files raised by 20 dB or more (§3.2) may bring up noise; the quietest are the `Paper`, `HighAndLow_Card` and wipe files. Judge on a phone speaker and replace any that hiss.
7. **Very short files** (§3.4) on a low-end Android phone.
8. **Sequences are timed by guess in the lab** (the install's 700 ms, the lamps' 450 ms). The wiring takes the real times from the timelines (§6.1).
9. **A `phone` group** (§8) makes `SfxGroup` five-to-six groups; alternatively use `ui` and `social`. Either is fine; decide at wiring.

## 11. Phases

| Phase | Work | Done when |
|---|---|---|
| 0 | Inventory, picks, the lab (§4) and this spec. | **Done.** |
| 1 | Listen in the lab on the phone and choose. | **Done** 2026-11-20 (`LAB_DECISIONS` in `components/dev/sfx-lab-data.ts`); `quest.lamp` dropped. |
| 2 | Phone, Chats, Field Notes, Camera, Scanner, Nuclear Map, Library (§6.1): `phone` group, catalog rows, call sites, `check:sfx`, `test:sfx`. | **Done in code** (§13). |
| 3 | Shop, numbers and ranks (§6.2). **Done in code** (§13). | The purchase flight has its ticks and Ranks has its podium, up and down. |
| 4 | Lessons, feed, Atom Maze, games and lab, onboarding (§6.3). | **Done in code** (§13). |
| 5 | Device pass on a release-like Android build: levels against the existing cues, hiss, very short files, the pitch ladders, the 1.5x pitched picks, live-player count with the new group warmed. | The `MEDIA_POLICY.md` §6 checklist has the line, and §10 decisions 1, 2, 6 and 7 are resolved. |

## 12. Wired so far

- **`lesson.node-zoom`** (2026-11-20): a map node's speech bubble zooms into the lesson preview with `UI_Phone_Start_1` (1.08 s, a swoosh: it fits the zoom and the arriving preview better than the 0.5 s zoom-in). It replaces `lesson.zoom-in` at the two node-bubble launches: Home (`launchNode` in `app/(tabs)/index.tsx`) and the Atom Maze level map (`onLaunch` in `app/explorer/story.tsx`). `lesson.zoom-in` is unchanged where it belongs to another motion: the Scale Zoom simulation, the platformer's battle zoom, and the preview's `lesson.zoom-out` on the way back. Bundled as `assets/sfx/lesson/node-zoom.wav` (the lab's converted file), cue `lesson.node-zoom` (feedback, volume 0.75, gap 300). If it runs too long under a quick tap, shorten the file or lower the volume in that one row.

## 13. What was implemented (2026-11-20)

The catalog (`services/sfx-core.ts`) gained a `phone` group and 54 cue rows over 51 new files (`assets/sfx/phone|ui|reward|lesson|game/`), the chest's file was swapped, and `playSfxSequence` (in `services/sfx.ts`) plays a short timed run. Cue ids follow the moment ids of §5 except where several moments share a sound:

| Moment | Cue(s) |
|---|---|
| `nav.page-next` / `nav.page-back` | `nav.page-next`, `nav.page-back` |
| `ui.panel-open`, `feed.picker` | `ui.panel-open`, `ui.panel-close` |
| `map.filter`, `shop.tab` | `ui.tab-right`, `ui.tab-left` |
| `phone.start` | `phone.start-1`, `-2`, `-3` (files Start_2, 3, 5), by `playSfxSequence` |
| `phone.install` | none: keeps `reward.pop`, played on each app's pop |
| `lesson.piece` | `lesson.pick`, `lesson.drop` |
| `scanner.scan` | `scanner.scan`: the `UI_CountUp` file (shared with `count.run`) |
| `shop.buy-fly` | `shop.coin-tick` per diamond, `shop.coin-land` |
| `levelup.items` | `levelup.item` (ladder) |
| `rank.up`, `game.heart` | `rank.up`, `game.heart` (one file, `reward/stat-up`) |
| `chat.incoming` | `chat.incoming`: the existing message-receive file at rate 1.5 |
| `game.sign` | the existing `lesson.bubble` |
| `chest.open-alt` | the existing cue `reward.chest-open`, file replaced |
| `map.zoom` | the existing `lesson.zoom-in` / `lesson.zoom-out` |
| the rest | the same id (`chat.typing`, `camera.shutter`, `count.run`, `lab.geiger`, ...) |

**Where the wiring deviates from §6:**
- `ui.announce` is defined but has no call site: the mission banner shares its moment with `game.get-ready` (one sound, not two), and there is no clean hook for a blog unlock or a new story thread.
- Onboarding "Let's go" plays `onboard.go`; the wipe (`transition.wipe`) follows 250 ms later as the Home screen replaces it, and plays when Delete Account finishes. The two together are the loudest moment in the app, so listen to them first.
- `game.get-ready` plays where `lesson.start` played at the level's opening (both branches).
- Phone: `phone.app-close` is on every phone app's home button except the map, which plays `map.close` on leave. `chat.end` plays only when a thread ends during the session. `scanner.lock` plays once per new lock and never on loss. `Shutter.tsx` is now disabled only while a scan runs, so `scanner.miss` can be heard. Pinching the map also plays a zoom cue (an addition). Unarchive stays silent.
- Added after the first wiring: trying an item on in the Shop plays `shop.try` (`UI_MyDesignEdit_Spoit_On`, 24 ms, a very short click: check it on a phone) instead of `ui.equip`; taking it off keeps `ui.unequip`.
- Changed after the first wiring: a new app arriving keeps `reward.pop` (the install pair was removed), the scanner's ring plays one `UI_CountUp` sweep (`scanner.scan`) instead of five ticks and a finish, the scan result keeps `ui.select`, and the Equip button on an owned item plays `shop.equip-confirm` (`UI_Closet_In`).
- `components/ui/button.tsx` has a `pressSfx` prop, used by "Lock in my guess" to play `lesson.lock-in` instead of `ui.press`.
- The finish screen's stat tiles play `count.run` in place of the old `ui.select` ticks, while the stamps and stars land.
- Journey nodes' Next and Previous also play the global `ui.press` (they are plain touchables), so they sound twice.
- The lab's "Today" is what played before this wiring.

**Runtime fixes for sounds that did not play (`services/sfx.ts`, `pickSlot` in `sfx-core.ts`, `test:sfx`):**
- A player is reserved the moment a play takes it (for the file's length at the play's rate, plus 40 ms). Before, two plays of one file in the same tick both took the same player while it waited to load or seek, so one was lost.
- A reserved player is never evicted, and the check is a time comparison, not a native `playing` call per player.
- After a sound ends, its player is rewound in the background, so the next play starts at once instead of awaiting a `seekTo(0)`.
- The live-player cap went from 40 to 64: the `ui` and `lesson` groups alone (44 files) were over 40, so warming evicted its own players and the first play of those files waited for a load. Warming is now a few players per turn, so opening a group does not stall the screen.
- Not verified on a device. If sounds still drop on Android, look at the cap (each player is a native ExoPlayer) and at files with pool 1 that are played in quick bursts (a second play restarts the first).

**The upload folder is gone:** `assets/sfx/kent-sfx/` (gitignored, so in no commit) was deleted on 2026-11-20 once the sounds were wired. The wired files live in `assets/sfx/<group>/`, and the lab's converted candidates stay in `assets/sfx/audition/`. `scripts/prepare-audition-sfx.mjs` needs the original upload again, so it cannot be re-run unless the folder is restored; to add or change a lab candidate, put the new file in `assets/sfx/audition/` by hand.

**Not verified:** nothing here has been heard on a device (phase 5). Gates run: `typecheck`, `check:sfx`, `check:phone`, `check:theme-colors`, `check:icons`, `check:tab-bar`, and the sfx, sfx-lab, media, shop, celebration, feed-ui, phone, scanner, map, field-notes, library, platformer and onboarding tests. `test:chats` has one failure unrelated to sound (its test still treats the Camera app as not built). `eslint` reports an error on `Date.now()` in `app/phone-apps/scanner.tsx` (a line this work did not change).

## Appendix A: files already in use

| File | Bundled as |
|---|---|
| `Event_Count_1/2/3`, `Event_Count_Finish` | `game/count-1`, `count-2`, `count-3`, `count-finish` |
| `Event_Quest_Start`, `Event_Quest_Finish` | `lesson/start`, `lesson/finish` |
| `Event_Ranger` | `game/explosion` |
| `System_Camera_Move_Zoom_In`, `System_Camera_Move_Zoom_Out` | `lesson/zoom-in`, `lesson/zoom-out` |
| `System_Timer_Finish` | `game/time-up` |
| `UI_Cancel`, `UI_Disable` | `ui/cancel`, `ui/disable` |
| `UI_EquipIn`, `UI_EquipOut` | `ui/equip`, `ui/unequip` |
| `UI_Announce_New_Friend` | `social/new-friend` |
| `UI_Phone_Start_1` (chosen for the node zoom, §12) | `lesson/node-zoom` |

## Appendix B: not proposed (69)

| Why | Files |
|---|---|
| Loops and beds (10 to 18 s), too long for a one-shot | `UI_Amiibo_Wait`, `UI_Eraser`, `UI_Pen_L`, `UI_Pen_M`, `UI_Pen_S`, `UI_Scroll`, `UI_Scroll_Fast`, `UI_SurveyCamera_Move` |
| Near-silent ambience (about -65 dBFS) | `System_Lumi_01`, `System_Lumi_02`, `System_Lumi_03`, `System_Lumi_04` |
| Drawing, painting and pen tools: no such feature | `UI_Pen_L_TouchOn`, `UI_Pen_M_TouchOn`, `UI_Pen_S_TouchOn`, `UI_Erase_TouchOn`, `UI_MyDesignEdit_Move`, `UI_MyDesignEdit_MovePen`, `UI_MyDesignEdit_Paint_All`, `UI_MyDesignEdit_Pen_Soft`, `UI_MyDesignEdit_Spoit`, `UI_MyDesignEdit_Spoit_Off`, `UI_MyDesignEdit_Finish` (3 s; an avatar-edit finish if avatar editing ever returns) |
| On-screen keyboard and cursor ticks (under 30 ms): Field Notes uses the real keyboard | `UI_Swkbd_BackSpace`, `UI_Swkbd_Cursor_L`, `UI_Swkbd_Cursor_R`, `UI_Swkbd_Normal`, `UI_Swkbd_Select`, `UI_Swkbd_Space`, `UI_Swkbd_Sub`, `UI_Swkbd_Toggle_Off`, `UI_Swkbd_Toggle_On`, `UI_Swkbd_Unselect`, `UI_Keyboard_Out`, `UI_Interior_Cursor`, `UI_Interior_Cursor_Area`, `UI_Interior_Move`, `UI_Select` |
| Room and furniture editing: no such feature | `UI_Interior_Rotate_90`, `UI_Interior_Rotate_180`, `UI_Interior_MultiSelect_Off`, `UI_WorkBench_Open`, `UI_Wrapping_Wrap_Basic`, `UI_Point_Footstep` |
| Alternatives to something chosen, kept for A/B | `UI_Cmn_Open_Small_Short`, `UI_Count_Coin_Reapeat_2` (the second tick of the coin pair), `UI_Count_Poki_Repeat_02`, `System_Message_PlaneAnnounceOff`, `System_Camera_Move_Zoom_In_FirstPerson`, `UI_Camera_Zoom` |
| Long stereo wipes and transitions (2 to 7.5 s) beyond the one or two the lab proposes | `UI_HeartWipeOut00`, `UI_InteriorStudio_Wipe_On`, `UI_InteriorStudio_Wipe_Off`, `UI_Interior_Wipe_Off`, `UI_WipeStudy_OutputOut`, `UI_WipeToIdrDream`, `UI_Facility_ThemeStart_In`, `UI_Return_SinglePlay` |
| Camera-mode and panel stingers with no screen | `System_SurveyCamera_On`, `System_SurveyCamera_Off`, `WhereanAmiibo_On`, `WhereanAmiibo_Off`, `UI_AirportPanel_Small`, `UI_AirportPanel_Large_1`, `UI_AirportPanel_Large_2`, `UI_Telop_Network` (6 s ticker), `UI_RingMenu_Code_Open`, `UI_Guide_In`, `UI_Cast_NpcChange` |
