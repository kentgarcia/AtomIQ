/**
 * The SFX lab's content (docs/SFX_EXPANSION_SPEC.md): every moment the spec proposes a new sound for,
 * with the candidate files from `assets/sfx/kent-sfx/` to audition for it.
 *
 * Pure data, framework-free (erasable syntax, `.ts` import extensions) so the prepare script and the
 * test read it as well as the screen. The WAVs the screen plays are made from this list by
 * `node scripts/prepare-audition-sfx.mjs` (mono, 44.1 kHz, levelled), and `sfx-lab-sources.ts` is
 * written by the same script.
 *
 * Reading a moment:
 *  - `id` is the cue id the spec proposes. Nothing here is in the catalog (`services/sfx-core.ts`) yet.
 *  - `variants[0]` is the recommended pick. The others are alternatives to listen against it.
 *  - `today` is what plays at that moment now (a catalog cue), so the lab can play it for comparison.
 *    Left out, the moment is silent today.
 *  - A variant is a list of steps played on one clock (`at` in ms), so a moment that is really a
 *    little sequence (an install, a count) can be heard whole. A step is a candidate `file` (its name
 *    in kent-sfx, without `.wav`) or an existing `cue`.
 */
import type { SfxCategory } from "../../services/media-core.ts";
import type { SfxCue } from "../../services/sfx-core.ts";

export interface LabStep {
  /** A candidate: its name in `assets/sfx/kent-sfx/`, without `.wav`. */
  file?: string;
  /** Or a cue that already exists in the catalog (played at its catalog volume and rate). */
  cue?: SfxCue;
  /** When the step starts, ms from the tap. Default 0. */
  at?: number;
  /** Multiplies the moment's volume (a file) or the catalog volume (a cue). Default 1. */
  volume?: number;
  /** Playback rate (pitch). Default 1. */
  rate?: number;
  /** Cut the sound off after this many ms (for a long file used as a short bed). */
  stopAfter?: number;
}

export interface LabVariant {
  /** Short text on the button. Left out, the file names are shown. */
  label?: string;
  steps: LabStep[];
}

export interface LabMoment {
  /** The proposed cue id. */
  id: string;
  area: LabArea;
  title: string;
  /** Where it would play: the component or screen that owns the moment. */
  where: string;
  /** The gate it would sit behind (docs/SFX_SPEC.md §7.2). */
  category: SfxCategory;
  /** Proposed runtime volume, 0 to 1, on top of the levelled file. */
  volume: number;
  /** What plays today, if anything. */
  today?: SfxCue;
  /** `today`: the recommendation is to keep the current sound; the variants are only there to listen against it. */
  keepToday?: boolean;
  /** One line on why, or what to listen for. */
  note?: string;
  variants: LabVariant[];
}

export const LAB_AREAS = [
  "App-wide",
  "Phone",
  "Chats",
  "Field Notes",
  "Camera",
  "Scanner",
  "Nuclear Map",
  "Shop",
  "Numbers and ranks",
  "Lessons",
  "Quests",
  "Feed",
  "Atom Maze",
  "Games and Lab",
  "Onboarding",
] as const;

export type LabArea = (typeof LAB_AREAS)[number];

const file = (name: string, extra: Omit<LabStep, "file" | "cue"> = {}): LabStep => ({ file: name, ...extra });
const cue = (id: SfxCue, extra: Omit<LabStep, "file" | "cue"> = {}): LabStep => ({ cue: id, ...extra });
const one = (name: string, label?: string): LabVariant => ({ ...(label ? { label } : {}), steps: [file(name)] });
const seq = (label: string, ...steps: LabStep[]): LabVariant => ({ label, steps });

/** A rising run of the same tick: `n` steps `gap` ms apart whose pitch climbs from `from` to `to`. */
const ladder = (name: string, n: number, gap: number, from = 1, to = 1.4): LabStep[] =>
  Array.from({ length: n }, (_, i) => file(name, { at: i * gap, rate: n === 1 ? from : from + ((to - from) * i) / (n - 1) }));

/** A run of ticks at uneven times, like a Geiger counter. */
const clicks = (name: string, times: readonly number[], rate = 1): LabStep[] => times.map((at) => file(name, { at, rate }));

const GEIGER = [0, 90, 150, 300, 330, 520, 700, 760] as const;

export const LAB_MOMENTS: readonly LabMoment[] = [
  /* ------------------------------------------------------------------ */
  /* App-wide                                                            */
  /* ------------------------------------------------------------------ */
  {
    id: "nav.page-next",
    area: "App-wide",
    title: "Next page",
    where: "explorer/journey-node.tsx (Next, silent today), onboarding steps, Camera gallery, Safety cards",
    category: "feedback",
    volume: 0.6,
    note: "One cue for 'forward one page'. Journey nodes have no sound at all today.",
    variants: [one("UI_Page_Next"), one("UI_Paper_In"), { label: "existing lesson.whoosh", steps: [cue("lesson.whoosh")] }, one("UI_Redo")],
  },
  {
    id: "nav.page-back",
    area: "App-wide",
    title: "Previous page",
    where: "Journey Previous, lesson Back, Camera gallery back, Safety card back",
    category: "feedback",
    volume: 0.55,
    variants: [one("UI_Page_Back"), one("UI_Paper_Slide"), one("UI_Undo")],
  },
  {
    id: "ui.press",
    area: "App-wide",
    title: "Global button press (A/B only)",
    where: "components/ui/button.tsx, icon-button.tsx, pressable-icon-button.tsx, TextButton.tsx",
    category: "tap",
    volume: 0.65,
    today: "ui.press",
    keepToday: true,
    note: "Heard hundreds of times a day, so the recommendation is to keep today's. Listen for whether any of these is softer.",
    variants: [one("UI_Decide_Small"), one("UI_Decide_Sub"), one("UI_Cmn_Open_Short")],
  },
  {
    id: "ui.panel-open",
    area: "App-wide",
    title: "A panel opens, then closes",
    where: "A non-modal panel: the unit card's info panel, bottom sheets (MeetSheet), the reaction picker",
    category: "panel",
    volume: 0.55,
    note: "ModalDialog already has modal-open / modal-close. This pair is for panels that are not a ModalDialog.",
    variants: [
      seq("PocketMenu open, close", file("UI_PocketMenu_Open"), file("UI_PocketMenu_Close", { at: 800 })),
      seq("RingMenu open, close", file("UI_RingMenu_Open"), file("UI_RingMenu_Close", { at: 800 })),
      seq("Cmn open, close", file("UI_Cmn_Open_Small"), file("UI_Cmn_Close", { at: 800 })),
    ],
  },
  {
    id: "ui.invalid",
    area: "App-wide",
    title: "A refused tap",
    where: "Shop buy that fails (ui.lock now), a full list (Build an Atom limit, ui.disable now), a locked option",
    category: "feedback",
    volume: 0.6,
    today: "ui.disable",
    note: "ui.disable (0.4 s) is a little long for a refusal you can hit twice in a row.",
    variants: [one("UI_Invalid"), one("UI_Swkbd_Invalid"), one("UI_Tab_Limit")],
  },
  {
    id: "ui.announce",
    area: "App-wide",
    title: "A banner arrives",
    where: "platformer MissionBanner, a blog piece unlocking, a new story thread, a new app badge",
    category: "feedback",
    volume: 0.7,
    note: "Covers 'a blog piece unlocking', which SFX_SPEC §12 lists as not wired.",
    variants: [one("UI_Announce_New"), one("UI_MenuPointTopBar_In"), one("UI_Board_Update")],
  },
  {
    id: "ui.delete",
    area: "App-wide",
    title: "Something is deleted",
    where: "app/phone-apps/field-note.tsx (after a delete, ui.cancel now), Camera gallery delete",
    category: "feedback",
    volume: 0.7,
    today: "ui.cancel",
    variants: [one("UI_Post_Delete"), one("UI_MyDesign_Delete"), one("UI_Delete_Small")],
  },

  /* ------------------------------------------------------------------ */
  /* Phone                                                               */
  /* ------------------------------------------------------------------ */
  {
    id: "phone.start",
    area: "Phone",
    title: "The phone is handed over (first open)",
    where: "app/(tabs)/phone.tsx, the intro line from Shrodi (PHONE_INTRO_SEEN)",
    category: "stinger",
    volume: 0.7,
    today: "reward.pop",
    note: "Five 'Phone_Start' files look like parts of a boot sound. C plays the three short ones as a sequence.",
    variants: [
      one("UI_Phone_Start_1"),
      one("UI_Phone_Start_4"),
      seq("Start 2, 3, 5", file("UI_Phone_Start_2"), file("UI_Phone_Start_3", { at: 230 }), file("UI_Phone_Start_5", { at: 460 })),
    ],
  },
  {
    id: "phone.install",
    area: "Phone",
    title: "A new app arrives (install moment)",
    where: "components/phone/phone-fx-core.ts timeline: ring fills, then the pop with a burst",
    category: "reward",
    volume: 0.75,
    today: "reward.pop",
    note: "Install at the ring fill, InstallFinish on the pop. Timings are a guess: check them against PHONE_FX.",
    variants: [
      seq("Install, then Finish 2", file("UI_Phone_Install"), file("UI_Phone_InstallFinish_2", { at: 700 })),
      seq("Install, then Finish 1", file("UI_Phone_Install"), file("UI_Phone_InstallFinish_1", { at: 700 })),
      one("UI_Phone_Install", "Install only"),
    ],
  },
  {
    id: "phone.app-open",
    area: "Phone",
    title: "An app opens",
    where: "components/phone/AppIcon.tsx launch, app/(tabs)/phone.tsx (open)",
    category: "feedback",
    volume: 0.6,
    today: "ui.select",
    variants: [one("UI_Phone_Open"), one("UI_PocketMenu_Open"), one("UI_Cmn_Open")],
  },
  {
    id: "phone.app-close",
    area: "Phone",
    title: "Back to the home screen",
    where: "The home button inside every phone app (app/phone-apps/*)",
    category: "feedback",
    volume: 0.55,
    variants: [one("UI_Phone_Close"), one("UI_PocketMenu_Close"), one("UI_Cmn_Close_Short")],
  },
  {
    id: "phone.wallpaper",
    area: "Phone",
    title: "A wallpaper is put on",
    where: "app/phone-apps/wallpapers.tsx",
    category: "feedback",
    volume: 0.6,
    today: "ui.select",
    variants: [one("UI_WipeRemake_In"), one("UI_AppWipe_In"), one("UI_ThemeStart_In")],
  },

  /* ------------------------------------------------------------------ */
  /* Chats                                                               */
  /* ------------------------------------------------------------------ */
  {
    id: "chat.typing",
    area: "Chats",
    title: "Typing dots appear",
    where: "app/phone-apps/chat.tsx (queue: the dots before each bubble)",
    category: "voice",
    volume: 0.4,
    note: "Quiet and tiny: the dots can appear up to six times in a row for one letter.",
    variants: [one("UI_Swkbd_BalloonAppear"), one("UI_Keyboard_In"), one("UI_MessageCard_PresentOn")],
  },
  {
    id: "chat.incoming",
    area: "Chats",
    title: "A teacher's bubble lands",
    where: "app/phone-apps/chat.tsx (each bubble of a node, where ui.select plays now)",
    category: "feedback",
    volume: 0.6,
    today: "ui.select",
    note: "social.message-receive (1 s) is too long when a letter is up to six bubbles.",
    variants: [one("UI_MessageWindow_Open"), one("System_Message_PlaneAnnounceOn"), { label: "existing social.message-receive", steps: [cue("social.message-receive")] }],
  },
  {
    id: "chat.send",
    area: "Chats",
    title: "The learner taps a reply",
    where: "app/phone-apps/chat.tsx (sendIn)",
    category: "feedback",
    volume: 0.6,
    today: "ui.select",
    variants: [one("UI_Decide_Small"), { label: "existing social.message-send", steps: [cue("social.message-send")] }, one("UI_Decide_Sub")],
  },
  {
    id: "chat.sticker",
    area: "Chats",
    title: "A sticker or reaction lands",
    where: "app/phone-apps/chat.tsx (popIn), components/phone/ChatArt.tsx",
    category: "feedback",
    volume: 0.65,
    today: "ui.select",
    variants: [one("UI_Point_Stamp"), one("UI_Count_Mile_Finish"), one("UI_MyDesignEdit_Stamp")],
  },
  {
    id: "chat.end",
    area: "Chats",
    title: "The story ends ('No more replies')",
    where: "app/phone-apps/chat.tsx, the divider above Replay",
    category: "feedback",
    volume: 0.55,
    variants: [one("UI_Code_Finish"), one("UI_Pair_Finish"), one("UI_AlbumSubmit_Finish")],
  },
  {
    id: "chat.archive",
    area: "Chats",
    title: "A thread is archived",
    where: "app/phone-apps/chats.tsx (the swipe action)",
    category: "feedback",
    volume: 0.6,
    variants: [one("UI_Storage_In"), one("UI_Paper_Slide"), one("UI_Post_Delete")],
  },

  /* ------------------------------------------------------------------ */
  /* Field Notes                                                         */
  /* ------------------------------------------------------------------ */
  {
    id: "notes.new",
    area: "Field Notes",
    title: "A new note",
    where: "app/phone-apps/field-notes.tsx (the add button)",
    category: "feedback",
    volume: 0.55,
    today: "ui.select",
    variants: [one("UI_Paper_In"), one("UI_Paper_Slide"), one("UI_Page_Next")],
  },
  {
    id: "notes.clip",
    area: "Field Notes",
    title: "A line is clipped to Field Notes",
    where: "components/phone/AddToNotesButton.tsx (AtomDex entry, daily fact)",
    category: "feedback",
    volume: 0.7,
    today: "ui.select",
    variants: [one("UI_Copy"), one("UI_Check"), one("UI_Check_Small")],
  },

  /* ------------------------------------------------------------------ */
  /* Camera                                                              */
  /* ------------------------------------------------------------------ */
  {
    id: "camera.shutter",
    area: "Camera",
    title: "The shutter",
    where: "app/phone-apps/camera.tsx (take the photo)",
    category: "feedback",
    volume: 0.8,
    today: "ui.select",
    variants: [
      one("UI_Shutter"),
      seq("Shutter, then Interior_Camera", file("UI_Shutter"), file("UI_Interior_Camera", { at: 140, volume: 0.6 })),
      one("UI_Interior_Camera"),
    ],
  },
  {
    id: "camera.saved",
    area: "Camera",
    title: "The photo is saved",
    where: "app/phone-apps/camera.tsx, after the shutter",
    category: "feedback",
    volume: 0.6,
    note: "A failed shot (gallery full) already plays ui.cancel there.",
    variants: [one("UI_AlbumSubmit_Out"), one("UI_ConstructionPortfolio_Upload"), one("UI_Storage_In")],
  },
  {
    id: "camera.option",
    area: "Camera",
    title: "A scene, pose or frame is chosen",
    where: "app/phone-apps/camera.tsx (the pickers)",
    category: "feedback",
    volume: 0.6,
    today: "ui.select",
    variants: [one("UI_Interior_Focus"), one("UI_Tab_R"), one("UI_Interior_ChangeMode")],
  },

  /* ------------------------------------------------------------------ */
  /* Scanner                                                             */
  /* ------------------------------------------------------------------ */
  {
    id: "scanner.lock",
    area: "Scanner",
    title: "The reticle locks on, then loses it",
    where: "app/phone-apps/scanner.tsx, components/scanner/Reticle.tsx",
    category: "feedback",
    volume: 0.65,
    variants: [
      seq("Attention On, Off", file("System_Chara_Attention_On"), file("System_Chara_Attention_Off", { at: 900 })),
      seq("UI_Attention, Off", file("UI_Attention"), file("System_Chara_Attention_Off", { at: 900 })),
      one("UI_Interior_Focus", "Interior_Focus (lock only)"),
    ],
  },
  {
    id: "scanner.scan",
    area: "Scanner",
    title: "Scanning (the 1.2 s ring fill)",
    where: "components/scanner/Shutter.tsx",
    category: "feedback",
    volume: 0.6,
    note: "B is a rising run of ticks under the fill, then a finish; A is one rising sweep.",
    variants: [
      one("UI_CountUp"),
      seq("Poki ticks rising, finish", ...ladder("UI_Count_Poki_Repeat_01", 5, 220, 1, 1.4), file("UI_Count_Poki_Finish", { at: 1200 })),
      one("System_Timer_Start"),
    ],
  },
  {
    id: "scanner.success",
    area: "Scanner",
    title: "A scan succeeds (result sheet)",
    where: "app/phone-apps/scanner.tsx (the result sheet opens)",
    category: "reward",
    volume: 0.75,
    today: "ui.select",
    note: "UI_Amiibo_Success is an NFC scan sound: the closest match in the library.",
    variants: [one("UI_Amiibo_Success"), one("UI_Point_Get"), one("UI_Count_Poki_Finish")],
  },
  {
    id: "scanner.miss",
    area: "Scanner",
    title: "Nothing under the reticle",
    where: "app/phone-apps/scanner.tsx (shutter with no lock)",
    category: "feedback",
    volume: 0.6,
    variants: [one("UI_Invalid"), one("UI_Swkbd_Invalid"), { label: "existing ui.lock", steps: [cue("ui.lock")] }],
  },

  /* ------------------------------------------------------------------ */
  /* Nuclear Map                                                         */
  /* ------------------------------------------------------------------ */
  {
    id: "map.open",
    area: "Nuclear Map",
    title: "The map opens",
    where: "app/phone-apps/map.tsx (on mount)",
    category: "feedback",
    volume: 0.6,
    variants: [one("UI_WhereanMap_In"), one("UI_PocketMenu_Open"), one("UI_Phone_Open")],
  },
  {
    id: "map.close",
    area: "Nuclear Map",
    title: "The map closes",
    where: "app/phone-apps/map.tsx (on leave)",
    category: "feedback",
    volume: 0.5,
    variants: [one("UI_WhereanMap_Out"), one("UI_PocketMenu_Close")],
  },
  {
    id: "map.pin",
    area: "Nuclear Map",
    title: "A pin is tapped, the site card opens",
    where: "app/phone-apps/map.tsx (pin tap)",
    category: "feedback",
    volume: 0.65,
    today: "ui.select",
    variants: [one("UI_Point_Flag"), one("UI_Point_Stamp"), one("UI_MenuPointTopBar_In")],
  },
  {
    id: "map.zoom",
    area: "Nuclear Map",
    title: "Zoom in, then out",
    where: "app/phone-apps/map.tsx (plus and minus, double tap)",
    category: "feedback",
    volume: 0.5,
    today: "ui.select",
    note: "A is the zoom pair the lessons already use. B and C are shorter and pitched up and down.",
    variants: [
      seq("existing lesson zoom pair", cue("lesson.zoom-in"), cue("lesson.zoom-out", { at: 650 })),
      seq("Interior_Rotate_45 up, down", file("UI_Interior_Rotate_45", { rate: 1.2 }), file("UI_Interior_Rotate_45", { at: 450, rate: 0.85 })),
      seq("Zoom_Out_Tripot up, down", file("System_Camera_Move_Zoom_Out_Tripot", { rate: 1.2 }), file("System_Camera_Move_Zoom_Out_Tripot", { at: 450, rate: 0.85 })),
    ],
  },
  {
    id: "map.limit",
    area: "Nuclear Map",
    title: "Zoom limit reached",
    where: "app/phone-apps/map.tsx",
    category: "feedback",
    volume: 0.5,
    variants: [one("UI_Tab_Limit"), one("UI_Swkbd_Limit")],
  },
  {
    id: "map.filter",
    area: "Nuclear Map",
    title: "A kind chip is switched",
    where: "app/phone-apps/map.tsx (kind chips)",
    category: "feedback",
    volume: 0.55,
    today: "ui.select",
    variants: [
      seq("Tab_R, Tab_L", file("UI_Tab_R"), file("UI_Tab_L", { at: 350 })),
      one("UI_Select_Short"),
    ],
  },
  {
    id: "library.book",
    area: "Nuclear Map",
    title: "A book or safety card is opened",
    where: "app/phone-apps/library.tsx, safety.tsx (a source or a card)",
    category: "feedback",
    volume: 0.55,
    note: "Filed here with the other reference apps; it is the Library and Safety Guide moment.",
    variants: [one("UI_HighAndLow_Card_1"), one("UI_HighAndLow_Card_2"), one("UI_Paper_In")],
  },

  /* ------------------------------------------------------------------ */
  /* Shop                                                                */
  /* ------------------------------------------------------------------ */
  {
    id: "shop.tab",
    area: "Shop",
    title: "A shop tab or shelf is switched",
    where: "components/shop/CategoryTabs.tsx, SubTabs.tsx",
    category: "feedback",
    volume: 0.6,
    note: "Right then left, so the direction can be heard. Very short files: check they are not just clicks.",
    variants: [
      seq("Tab_R, Tab_L", file("UI_Tab_R"), file("UI_Tab_L", { at: 350 })),
      one("UI_Interior_ChangeMode"),
      one("UI_Select_Short"),
    ],
  },
  {
    id: "shop.swatch",
    area: "Shop",
    title: "A colour swatch is picked",
    where: "components/shop/ColorSwatches.tsx",
    category: "feedback",
    volume: 0.6,
    variants: [one("UI_MyDesignEdit_Paint"), one("UI_MyDesignEdit_Spoit_On"), one("UI_MyDesignEdit_ColorBar_Slide")],
  },
  {
    id: "shop.equip-confirm",
    area: "Shop",
    title: "Equip is pressed on something owned",
    where: "app/shop.tsx (the Equip button)",
    category: "feedback",
    volume: 0.7,
    today: "ui.equip",
    note: "Try-on keeps ui.equip. This is the step after: it is now on.",
    variants: [one("UI_Closet_In"), one("UI_LifeSupport_Swap"), { label: "existing ui.equip", steps: [cue("ui.equip")] }],
  },
  {
    id: "shop.buy-fly",
    area: "Shop",
    title: "Diamonds fly to the avatar, then it lands",
    where: "components/shop/PurchaseFx.tsx (purchase-fx-core.ts timeline)",
    category: "reward",
    volume: 0.7,
    today: "reward.coin",
    note: "Four ticks, one per diamond, then a finish. Three families of counter sounds to compare.",
    variants: [
      seq("Coin ticks, Coin finish", ...ladder("UI_Count_Coin_Reapeat_1", 4, 110, 1, 1.25), file("UI_Count_Coin_Finish", { at: 520 })),
      seq("Mile ticks, Mile finish", file("UI_Count_Mile_Repeat_01"), file("UI_Count_Mile_Repeat_02", { at: 110 }), file("UI_Count_Mile_Repeat_01", { at: 220 }), file("UI_Count_Mile_Repeat_02", { at: 330 }), file("UI_Count_Mile_Finish", { at: 520 })),
      seq("Poki ticks, Poki finish", file("UI_Count_Poki_Repeat_01"), file("UI_Count_Poki_Repeat_01", { at: 110, rate: 1.1 }), file("UI_Count_Poki_Repeat_01", { at: 220, rate: 1.2 }), file("UI_Count_Poki_Repeat_01", { at: 330, rate: 1.3 }), file("UI_Count_Poki_Finish", { at: 520 })),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Numbers and ranks                                                   */
  /* ------------------------------------------------------------------ */
  {
    id: "count.run",
    area: "Numbers and ranks",
    title: "A number counts up (about one second)",
    where: "components/lesson/StatTile.tsx count-up, level-up bar, Ranks, platformer result panel (silent today)",
    category: "reward",
    volume: 0.55,
    note: "SFX_SPEC §6.4 keeps the count-up silent on purpose. This is the option if it is wanted: one sweep, or ticks under it.",
    variants: [
      one("UI_CountUp"),
      seq("Mile ticks x8, finish", ...ladder("UI_Count_Mile_Repeat_01", 8, 110, 1, 1.3), file("UI_Count_Mile_Finish", { at: 950 })),
      seq("Coin ticks x8, finish", ...ladder("UI_Count_Coin_Reapeat_1", 8, 110, 1, 1.3), file("UI_Count_Coin_Finish", { at: 950 })),
      seq("MealEffect ticks x8", ...Array.from({ length: 8 }, (_, i) => file(i % 2 ? "UI_Count_MealEffect_02" : "UI_Count_MealEffect_01", { at: i * 110 }))),
    ],
  },
  {
    id: "rank.up",
    area: "Numbers and ranks",
    title: "The learner's place moved up",
    where: "app/ranks.tsx (the arrow, RANKS_LAST_SEEN)",
    category: "reward",
    volume: 0.7,
    variants: [one("UI_MealEffect_Up"), { label: "existing reward.rank-up", steps: [cue("reward.rank-up")] }],
  },
  {
    id: "rank.down",
    area: "Numbers and ranks",
    title: "The learner's place moved down",
    where: "app/ranks.tsx",
    category: "feedback",
    volume: 0.55,
    note: "Soft on purpose: a place lost is not a punishment.",
    variants: [one("UI_MealEffect_Down")],
  },
  {
    id: "rank.podium",
    area: "Numbers and ranks",
    title: "The podium rises: third, second, first",
    where: "app/ranks.tsx (the Ranks podium)",
    category: "reward",
    volume: 0.65,
    variants: [
      seq("Mile finish, pitched up", file("UI_Count_Mile_Finish", { rate: 0.9 }), file("UI_Count_Mile_Finish", { at: 600 }), file("UI_Count_Mile_Finish", { at: 1200, rate: 1.15 })),
      seq("Point stamp x3", file("UI_Point_Stamp", { rate: 0.9 }), file("UI_Point_Stamp", { at: 600 }), file("UI_Point_Stamp", { at: 1200, rate: 1.15 })),
    ],
  },
  {
    id: "levelup.items",
    area: "Numbers and ranks",
    title: "Unlocked shop items arrive one by one",
    where: "components/shop/UnlockedItems.tsx (inside the level-up dialog)",
    category: "reward",
    volume: 0.55,
    variants: [
      seq("OrderList ticks rising", ...ladder("UI_OrderList_ItemIn", 5, 130, 1, 1.4)),
      seq("Mile ticks rising", ...ladder("UI_Count_Mile_Repeat_01", 5, 130, 1, 1.4)),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Lessons                                                             */
  /* ------------------------------------------------------------------ */
  {
    id: "lesson.piece",
    area: "Lessons",
    title: "A piece is picked up and put down",
    where: "components/lesson/cards/ArrangeItems.tsx (order, match, sort)",
    category: "feedback",
    volume: 0.6,
    today: "ui.select",
    note: "A plays pick-up then drop so the pair can be heard; the app would play them on the two events.",
    variants: [
      seq("DragStart, DragEnd", file("UI_DragStart"), file("UI_DragEnd", { at: 500 })),
      seq("OrderList_ItemIn x2", file("UI_OrderList_ItemIn"), file("UI_OrderList_ItemIn", { at: 400, rate: 1.15 })),
      seq("DragStart, DragEnd_Money", file("UI_DragStart"), file("UI_DragEnd_Money", { at: 500 })),
    ],
  },
  {
    id: "lesson.pair-ok",
    area: "Lessons",
    title: "A right pair locks green",
    where: "components/lesson/cards/ArrangeItems.tsx (match)",
    category: "feedback",
    volume: 0.65,
    today: "ui.select",
    variants: [one("UI_Check"), one("UI_Check_Small"), one("UI_Interior_MultiSelect_On")],
  },
  {
    id: "lesson.scroll-cue",
    area: "Lessons",
    title: "The 'more below' arrow is tapped",
    where: "components/lesson/ScrollCue.tsx",
    category: "feedback",
    volume: 0.5,
    variants: [one("UI_Paper_Slide"), one("UI_Page_Next")],
  },
  {
    id: "lesson.lock-in",
    area: "Lessons",
    title: "'Lock in my guess'",
    where: "components/lesson/cards/ (prediction items)",
    category: "feedback",
    volume: 0.7,
    today: "ui.press",
    variants: [one("UI_Decide"), one("UI_Decide_Title")],
  },

  /* ------------------------------------------------------------------ */
  /* Quests                                                              */
  /* ------------------------------------------------------------------ */
  {
    id: "quest.lamp",
    area: "Quests",
    title: "Each claimed quest lights a lamp (1 to 5)",
    where: "components/quests/QuestRow.tsx / ChestCard.tsx (progress toward the chest)",
    category: "reward",
    volume: 0.7,
    note: "What it is: the daily and weekly chest fill up as quests are claimed. This would play one rising note per claimed quest (five lamps = five notes), so you hear progress toward the chest. A plays all five in a row.",
    variants: [
      seq("Lamp 1 to 5", file("UI_AirportPanel_Lamp_1"), file("UI_AirportPanel_Lamp_2", { at: 450 }), file("UI_AirportPanel_Lamp_3", { at: 900 }), file("UI_AirportPanel_Lamp_4", { at: 1350 }), file("UI_AirportPanel_Lamp_5", { at: 1800 })),
      seq("Board_Update rising", ...ladder("UI_Board_Update", 5, 450, 1, 1.5)),
    ],
  },
  {
    id: "chest.open-alt",
    area: "Quests",
    title: "A chest opens (alternatives)",
    where: "components/quests/ChestCard.tsx",
    category: "stinger",
    volume: 0.8,
    today: "reward.chest-open",
    keepToday: true,
    note: "Only if the current one is not liked.",
    variants: [one("UI_Wrapping_Open_Appear"), seq("Wrap open, then appear", file("UI_Wrapping_Open_Basic"), file("UI_Wrapping_Open_Appear", { at: 300 }))],
  },

  /* ------------------------------------------------------------------ */
  /* Feed                                                                */
  /* ------------------------------------------------------------------ */
  {
    id: "feed.land",
    area: "Feed",
    title: "A post drops into the feed",
    where: "components/feed/use-drip.ts (posts landing one by one while the page is open)",
    category: "voice",
    volume: 0.45,
    today: "social.notification",
    note: "social.notification (0.5 s) is a heads-up. A post that lands in front of you needs something lighter.",
    variants: [one("UI_Post_MovePresent"), one("UI_OrderList_In")],
  },
  {
    id: "feed.picker",
    area: "Feed",
    title: "The reaction picker opens, then closes",
    where: "components/feed/ReactionRow.tsx",
    category: "panel",
    volume: 0.55,
    variants: [
      seq("RingMenu open, close", file("UI_RingMenu_Open"), file("UI_RingMenu_Close", { at: 800 })),
      one("UI_RingMenu_Registration"),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Atom Maze                                                           */
  /* ------------------------------------------------------------------ */
  {
    id: "game.sign",
    area: "Atom Maze",
    title: "A sign's speech bubble pops open",
    where: "components/platformer/SignBubble.tsx",
    category: "voice",
    volume: 0.5,
    variants: [one("UI_Swkbd_BalloonAppear"), one("UI_MessageWindow_Open"), { label: "existing lesson.bubble", steps: [cue("lesson.bubble")] }],
  },
  {
    id: "game.key",
    area: "Atom Maze",
    title: "A key is picked up",
    where: "app/explorer/platformer.tsx",
    category: "reward",
    volume: 0.7,
    today: "reward.sparkle",
    variants: [one("UI_Count_Poki_Finish"), one("UI_AirportPanel_Lamp_1"), one("UI_Count_Mile_Finish")],
  },
  {
    id: "game.lock",
    area: "Atom Maze",
    title: "A lock opens",
    where: "app/explorer/platformer.tsx",
    category: "feedback",
    volume: 0.7,
    today: "lesson.unlock",
    variants: [one("UI_Wrapping_Open_Basic"), one("UI_PocketMenu_Open"), { label: "existing lesson.unlock", steps: [cue("lesson.unlock")] }],
  },
  {
    id: "game.gem",
    area: "Atom Maze",
    title: "A gem is collected",
    where: "app/explorer/platformer.tsx (world-fx pickups)",
    category: "reward",
    volume: 0.7,
    today: "reward.sparkle",
    note: "Event_Harvest_Bell00 is a bell: a different colour from the coin.",
    variants: [one("Event_Harvest_Bell00"), one("UI_Count_Coin_Finish")],
  },
  {
    id: "game.heart",
    area: "Atom Maze",
    title: "A heart is restored",
    where: "app/explorer/platformer.tsx",
    category: "reward",
    volume: 0.7,
    today: "reward.sparkle",
    variants: [one("UI_MealEffect_Up"), { label: "existing reward.sparkle", steps: [cue("reward.sparkle")] }],
  },
  {
    id: "game.get-ready",
    area: "Atom Maze",
    title: "Get ready: Shrodi walks in, the mission shows",
    where: "components/platformer/entrance-core.ts timeline, MissionBanner.tsx",
    category: "feedback",
    volume: 0.7,
    today: "lesson.start",
    variants: [one("System_Timer_Start"), one("UI_Announce_New"), one("System_Timer_Start_Event")],
  },
  {
    id: "game.boss-intro",
    area: "Atom Maze",
    title: "The boss cinematic (bars, roar, name stamped)",
    where: "components/platformer/BossIntro.tsx",
    category: "stinger",
    volume: 0.8,
    note: "Event_TsunekichiChance00 is a guess: its name says 'chance', not 'boss'.",
    variants: [one("System_Timer_Start_Event"), one("Event_TsunekichiChance00"), one("UI_MinigameCounter_Attack")],
  },
  {
    id: "game.boss-victory",
    area: "Atom Maze",
    title: "The boss is defeated",
    where: "components/platformer/BossVictory.tsx",
    category: "stinger",
    volume: 0.85,
    today: "game.explosion",
    variants: [one("System_Timer_Finish_Event"), { label: "existing fireworks-burst", steps: [cue("game.fireworks-burst")] }],
  },
  {
    id: "game.impact",
    area: "Atom Maze",
    title: "A hit lands (bricks, enemy hits)",
    where: "app/explorer/platformer.tsx, Radiation Shield lab (replaces the 'game.hit' alias of ui.lock)",
    category: "feedback",
    volume: 0.8,
    today: "game.hit",
    note: "SFX_SPEC §10 decision 3: the library had no impact sound. These are the closest candidates.",
    variants: [one("UI_MinigameCounter_Attack"), one("UI_Decide_Erase"), one("System_Message_Katsu")],
  },

  /* ------------------------------------------------------------------ */
  /* Games and Lab                                                       */
  /* ------------------------------------------------------------------ */
  {
    id: "game.timer-tick",
    area: "Games and Lab",
    title: "The last seconds of an Endless round",
    where: "app/mythbuster/index.tsx (once a second under 5 s)",
    category: "feedback",
    volume: 0.6,
    variants: [one("System_Timer_CountDown"), one("UI_CountDown"), one("UI_MinigameCounter_Count")],
  },
  {
    id: "lab.geiger",
    area: "Games and Lab",
    title: "A Geiger click (a run of eight)",
    where: "components/lab/DecayLab.tsx, RadiationShieldLab.tsx",
    category: "feedback",
    volume: 0.5,
    today: "ui.tick",
    note: "Today it is ui.tick at rate 2. Each variant plays eight clicks at uneven times.",
    variants: [
      seq("Check_Small x8", ...clicks("UI_Check_Small", GEIGER)),
      seq("MyDesignEdit_Pen x8", ...clicks("UI_MyDesignEdit_Pen", GEIGER)),
      seq("Swkbd_Enter x8", ...clicks("UI_Swkbd_Enter", GEIGER)),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Onboarding                                                          */
  /* ------------------------------------------------------------------ */
  {
    id: "onboard.build",
    area: "Onboarding",
    title: "'Building your path' (3 s)",
    where: "components/onboarding/PlanStep.tsx",
    category: "feedback",
    volume: 0.5,
    today: "reward.fill",
    note: "UI_Wait is an 18 s loop at about -41 dB. It is cut at 3 s here, with no fade.",
    variants: [{ label: "UI_Wait (cut at 3 s)", steps: [file("UI_Wait", { stopAfter: 3000 })] }, { label: "existing reward.fill", steps: [cue("reward.fill")] }],
  },
  {
    id: "onboard.go",
    area: "Onboarding",
    title: "The last button ('Start learning')",
    where: "components/onboarding/WelcomeStep.tsx",
    category: "feedback",
    volume: 0.75,
    variants: [one("UI_Decide_Title"), one("UI_Decide_Small_Echo")],
  },
  {
    id: "transition.wipe",
    area: "Onboarding",
    title: "A big screen change",
    where: "Onboarding to Home, Delete Account ('Account deleted' to onboarding)",
    category: "stinger",
    volume: 0.6,
    note: "Long (1 to 2.6 s) and stereo in the original: only for the rare, whole-screen moments.",
    variants: [one("UI_HeartWipeIn00"), one("UI_AppWipe_In"), one("UI_Interior_Wipe_On"), one("UI_Return_Title")],
  },
];

/**
 * What the owner chose after listening (2026-11-20). A moment with no entry is undecided, and the lab
 * stars its recommended candidate. `pick` is a variant index (0 is A), `"today"` keeps the sound that
 * plays now, `"none"` leaves the moment silent, `"open"` is still undecided on purpose. `rate` is a
 * pitch the owner liked, applied to the whole variant.
 */
export type LabDecision = { pick: number; rate?: number; note?: string } | { pick: "today" | "none" | "open"; note?: string };

export const LAB_DECISIONS: Readonly<Record<string, LabDecision>> = {
  "nav.page-next": { pick: 3 },
  "nav.page-back": { pick: 2 },
  "ui.press": { pick: "today" },
  "ui.panel-open": { pick: 1 },
  "ui.invalid": { pick: 0 },
  "ui.announce": { pick: 0 },
  "ui.delete": { pick: 0 },
  "phone.start": { pick: 2 },
  "phone.install": { pick: "today", note: "Changed after wiring: keeps reward.pop." },
  "phone.app-open": { pick: 0 },
  "phone.app-close": { pick: 0 },
  "phone.wallpaper": { pick: 1 },
  "chat.typing": { pick: 0 },
  "chat.incoming": { pick: 2, rate: 1.5 },
  "chat.send": { pick: 0 },
  "chat.sticker": { pick: 1 },
  "chat.end": { pick: 0 },
  "chat.archive": { pick: 0 },
  "notes.new": { pick: 0 },
  "notes.clip": { pick: 0 },
  "camera.shutter": { pick: 0 },
  "camera.saved": { pick: 0 },
  "camera.option": { pick: 2 },
  "scanner.lock": { pick: 2 },
  "scanner.scan": { pick: 0, note: "Changed after wiring: one UI_CountUp sweep." },
  "scanner.success": { pick: "today", note: "Changed after wiring: keeps ui.select." },
  "scanner.miss": { pick: 1 },
  "map.open": { pick: 0 },
  "map.close": { pick: 0 },
  "map.pin": { pick: 0 },
  "map.zoom": { pick: 0 },
  "map.limit": { pick: 0 },
  "map.filter": { pick: 0 },
  "library.book": { pick: 0 },
  "shop.tab": { pick: 0 },
  "shop.swatch": { pick: 0 },
  "shop.equip-confirm": { pick: 0, note: "Changed after wiring: UI_Closet_In when Equip is pressed on an owned item." },
  "shop.buy-fly": { pick: 0 },
  "count.run": { pick: 0, note: "Wanted: the count-up is no longer silent (SFX_SPEC.md §6.4 is overturned)." },
  "rank.up": { pick: 0 },
  "rank.down": { pick: 0 },
  "rank.podium": { pick: 0 },
  "levelup.items": { pick: 0 },
  "lesson.piece": { pick: 0 },
  "lesson.pair-ok": { pick: 0 },
  "lesson.scroll-cue": { pick: "none" },
  "lesson.lock-in": { pick: 0 },
  "quest.lamp": { pick: "none", note: "Dropped: the claim sounds are enough." },
  "chest.open-alt": { pick: 0, note: "Replaces reward.chest-open." },
  "feed.land": { pick: "today" },
  "feed.picker": { pick: 0 },
  "game.sign": { pick: 2 },
  "game.key": { pick: "today" },
  "game.lock": { pick: "today" },
  "game.gem": { pick: "today" },
  "game.heart": { pick: 0 },
  "game.get-ready": { pick: 0 },
  "game.boss-intro": { pick: "none" },
  "game.boss-victory": { pick: "today" },
  "game.impact": { pick: "today" },
  "game.timer-tick": { pick: 0 },
  "lab.geiger": { pick: 0 },
  "onboard.build": { pick: "today" },
  "onboard.go": { pick: 0 },
  "transition.wipe": { pick: 0 },
};

/** Every candidate file the lab uses (names in kent-sfx, without `.wav`), sorted. */
export const labFiles = (moments: readonly LabMoment[] = LAB_MOMENTS): string[] => {
  const names = new Set<string>();
  for (const m of moments) for (const v of m.variants) for (const s of v.steps) if (s.file) names.add(s.file);
  return [...names].sort();
};

/** The loudest category a file is used in decides the level it is baked to (the same table as `normalize-sfx.mjs`). */
export const LAB_TARGET_DB: Readonly<Record<SfxCategory, number>> = { tap: -22, panel: -22, feedback: -22, reward: -22, stinger: -20, voice: -28 };

export const labTargetFor = (name: string, moments: readonly LabMoment[] = LAB_MOMENTS): number =>
  Math.max(
    ...moments
      .filter((m) => m.variants.some((v) => v.steps.some((s) => s.file === name)))
      .map((m) => LAB_TARGET_DB[m.category]),
  );

/** How long a variant lasts, ms, for the label: the last step's start plus its file length (needs the lengths). */
export const variantLength = (variant: LabVariant, lengthOf: (step: LabStep) => number): number =>
  Math.max(0, ...variant.steps.map((s) => (s.at ?? 0) + Math.min(s.stopAfter ?? Infinity, lengthOf(s))));
