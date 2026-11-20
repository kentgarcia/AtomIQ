/**
 * The NPC chat vocabulary (docs/features/PHONE_SPEC.md §5.2 and §7), as plain data and a few pure helpers.
 *
 * Framework-free and dependency-free on purpose: the validator (scripts/lib/chat-rules.mjs), the Content
 * Studio and the app's chat core (services/chat-core.ts) all read the same names, so the app mirrors this
 * file rather than inventing its own. Change a kind, a trigger or an action here first.
 */

/**
 * Shrodi, the mascot, chats like a teacher: his nodes have `npc_id` "shrodi", which is not a row of `npcs` (the cast of teachers, the
 * Feed and the Ranks), so he is not in the feed or on the podium. He is always in Contacts and can send stories like a teacher.
 */
export const CHAT_MASCOT_ID = "shrodi";

/** `chat_nodes.kind` (also the CHECK in schema.sql). */
export const CHAT_KINDS = ["greeting", "reply", "unprompted", "sign_off"];

/** A line a teacher says fits a bubble; a pill the learner taps fits a row. */
/**
 * `text` is the limit of one bubble. A node's text is split into bubbles at a blank line, so a long message is several short
 * ones that arrive one after another, up to `parts` of them.
 */
export const CHAT_LIMITS = { text: 240, label: 40, replies: 6, minReplies: 2, parts: 6 };

/** A teacher needs at least this many nodes that are not the greeting (the spec's "a greeting and four reachable nodes"). */
export const CHAT_MIN_BODY_NODES = 4;

/**
 * What unlocks a story thread (`chat_nodes.trigger` on its first, unprompted node, written `kind:argument`). Each is worked
 * out from the learner's progress, so a story that was earned while the app was closed is still unlocked later:
 *   app_installed:<app id>     an app of the phone has just arrived (an id of `PHONE_APPS`)
 *   unit_complete:<unit id>    the learner finished the unit
 *   lessons_completed:<n>      the learner has finished n lessons in all (n >= 1)
 *   level_reached:<n>          the learner is level n or more (n >= 2)
 *   welcome_back               the learner is back after a few days away
 */
export const CHAT_TRIGGER_KINDS = {
  app_installed: { argument: "app" },
  unit_complete: { argument: "unit" },
  lessons_completed: { argument: "count" },
  level_reached: { argument: "level" },
  welcome_back: { argument: null },
};

/**
 * What a reply can be (`replies[].type`): `text` (a chip with the label, the default), `emoji` (a sticker: the label is an
 * id from CHAT_STICKERS, sent as a big picture) or `react` (a reaction to the teacher's last message: the label is an
 * id from CHAT_REACTIONS, put on that message). The pictures are AtomIQ's own, `components/phone/chat-art.ts` (a test keeps the
 * ids equal). A sticker or a reaction may go nowhere: the story ends there.
 */
export const CHAT_REPLY_TYPES = ["text", "emoji", "react"];
export const CHAT_REACTIONS = ["like", "love", "haha", "wow", "think", "clap"];
export const CHAT_STICKERS = ["mind-blown", "party", "atom", "banana", "radiation", "sleepy", "nerd", "star"];

/**
 * A part of a node's text that is only `[[pic:<id>]]` is drawn as a picture (Shrodi's tour: what each screen looks like). The ids
 * are the scenes of `components/phone/tour-art.ts` (a test keeps them equal). A picture needs a bubble of text before it, so it
 * never opens a message on its own.
 */
export const CHAT_PICTURES = ["tour-map", "tour-quests", "tour-games", "tour-profile", "tour-phone"];
export const CHAT_PICTURE_RE = /^\[\[pic:([a-z0-9-]+)\]\]$/;

/** A story's subject line fits the list row. */
export const CHAT_TITLE_MAX = 40;

/** Days away before a teacher welcomes the learner back (the same number as a Feed comeback post). */
export const WELCOME_BACK_MIN_DAYS = 3;

/**
 * What a reply can do besides leading to the next node (`replies[].action`). `screen` is the kind of place;
 * `id` is an id of the table named (a lesson, a path node, an AtomDex entry, a phone app, a unit).
 *   next-lesson   the next lesson of the teacher's own unit, worked out when the learner taps (no id)
 *   lesson        /lesson/<id>
 *   practice      /practice/<path node id>
 *   entry         an AtomDex entry
 *   mythbuster    Myth Buster Quick Play on the teacher's unit (no id) or on `id` (a unit)
 *   app           an app of the phone, by its id
 */
export const CHAT_ACTIONS = {
  "next-lesson": { id: null },
  lesson: { id: "lesson" },
  practice: { id: "node" },
  entry: { id: "entry" },
  mythbuster: { id: "unit?" },
  app: { id: "app" },
};

/** Split a trigger into its kind and argument; `null` when it is not of the form `kind` or `kind:argument`. */
export function parseTrigger(trigger) {
  if (typeof trigger !== "string") return null;
  const [kind, ...rest] = trigger.split(":");
  const argument = rest.length ? rest.join(":") : null;
  if (!Object.hasOwn(CHAT_TRIGGER_KINDS, kind)) return null;
  return { kind, argument };
}

/** Whether `%` placeholders or braces are left in a text (chat text is plain: nothing is filled in). */
export const hasBraces = (text) => /[{}]/.test(String(text ?? ""));
