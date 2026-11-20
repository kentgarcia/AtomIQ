#!/usr/bin/env node
/**
 * Feed source gate (docs/features/NPC_FEED_SPEC.md §14). The learner only reacts: there must be no way for
 * them to write a comment. This greps the feed's screens and services for
 *   - a TextInput (an import, a `<TextInput` element or any use of the name),
 *   - a function named comment / insertComment / addComment / postComment (any spelling of "comment"
 *     as a verb: `function comment`, `const addComment =`, `async postComment(`),
 *   - an INSERT into a comments-like table from the learner side (`INSERT ... INTO ... comment`,
 *     including `blog_comments`, `comments`, `community_posts`-style comment tables).
 * in app/blog, components/feed, app/(tabs)/community.tsx and services/feed*.ts. Comments are content
 * (`blog_comments`), authored in Studio, and are only ever read here.
 *
 * Run: npm run check:feed        (options for tests: --root <dir>)
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const ROOT = rootArg >= 0 ? path.resolve(args[rootArg + 1]) : process.cwd();

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs)$/;
const TARGETS = [
  { dir: "app/blog" },
  { dir: "components/feed" },
  { file: "app/(tabs)/community.tsx" },
  { dir: "services", match: /^feed.*\.(ts|tsx)$/ },
];

function* walk(dir, match) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full, match);
    else if (match ? match.test(entry.name) : SOURCE_EXT.test(entry.name)) yield full;
  }
}

/** Remove comments and string-free noise so a word in a doc comment ("there is no comment()") does not trip the gate. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, (m, lead) => lead + " ".repeat(m.length - lead.length));
}

const RULES = [
  { name: "a text input", re: /\bTextInput\b/ },
  { name: "a function named comment", re: /\b(?:function\s+(?:comment|insertComment|addComment|postComment|writeComment|submitComment)\b|(?:const|let|var)\s+(?:comment|insertComment|addComment|postComment|writeComment|submitComment)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\(|function|[A-Za-z_$][\w$]*\s*=>)|\b(?:insertComment|addComment|postComment|writeComment|submitComment)\s*\()/ },
  { name: "an INSERT into a comments table", re: /\bINSERT\s+(?:OR\s+\w+\s+)?INTO\s+[`"']?\w*comment\w*/i },
];

export function checkFeed(root = ROOT) {
  const failures = [];
  const files = new Set();
  for (const t of TARGETS) {
    if (t.file) {
      const full = path.join(root, t.file);
      if (fs.existsSync(full)) files.add(full);
    } else {
      for (const f of walk(path.join(root, t.dir), t.match)) files.add(f);
    }
  }
  for (const file of files) {
    const lines = stripComments(fs.readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      for (const rule of RULES) {
        if (rule.re.test(line)) failures.push(`${path.relative(root, file)}:${i + 1}: ${rule.name}: ${line.trim()}`);
      }
    });
  }
  return { failures, checked: files.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const { failures, checked } = checkFeed();
  if (failures.length) {
    console.error(`check-feed: ${failures.length} problem(s). The learner may only react; a comment path must not exist.\n`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log(`check-feed: OK. ${checked} file(s) checked: no text input, comment function or comment insert.`);
}
