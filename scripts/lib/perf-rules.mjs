/**
 * Rules of `npm run check:perf` (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §8), as pure functions over source text so
 * `test:perf` can run them without touching the repository.
 */

/** Style keys that cost a layout pass when they change. A transform or opacity does not. */
const LAYOUT_KEY = /(^|[\s{,])(width|height|top|left|right|bottom|margin\w*|padding\w*|flex|flexGrow|flexShrink|flexBasis|gap|rowGap|columnGap|minWidth|maxWidth|minHeight|maxHeight|fontSize|lineHeight|borderWidth\w*)\s*:/;

/** The text of the call that starts at `open` (the index of its "("), up to the matching ")". */
const callBody = (text, open) => {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return text.slice(open + 1);
};

const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/**
 * The animated styles or props in `text` that return a layout key: `[{ line, key }]`. Looks inside every
 * `useAnimatedStyle(...)` and `useAnimatedProps(...)` call, at the keys of the returned object (a key nested in a
 * `transform` array is a transform and is fine, so only keys at the top of an object literal count).
 */
export const layoutAnimations = (source) => {
  const text = stripComments(source);
  const found = [];
  const re = /\b(useAnimatedStyle|useAnimatedProps)\s*\(/g;
  let m;
  while ((m = re.exec(text))) {
    const open = m.index + m[0].length - 1;
    const body = callBody(text, open);
    // Flatten what is inside brackets and calls nested deeper than the returned object, so a key inside `transform: [{ ... }]` or
    // `Math.max(...)` is not mistaken for a style key. The parenthesis of an arrow body, `=> ({ ... })`, or of `return (` is just
    // the object's wrapper and stays transparent.
    const stack = [];
    let depth = 0;
    let flat = "";
    for (let i = 0; i < body.length; i += 1) {
      const ch = body[i];
      if (ch === "[" || ch === "(") {
        const before = body.slice(0, i).trimEnd();
        const wrapper = ch === "(" && (before.endsWith("=>") || /\breturn$/.test(before));
        stack.push(!wrapper);
        if (!wrapper) depth += 1;
        flat += depth > 0 && !wrapper ? ch : ch === "(" ? " " : ch;
        continue;
      }
      if (ch === "]" || ch === ")") {
        const counted = stack.pop();
        if (counted) depth -= 1;
        flat += depth > 0 ? (ch === "\n" ? ch : " ") : " ";
        continue;
      }
      flat += depth === 0 ? ch : ch === "\n" ? ch : " ";
    }
    const key = LAYOUT_KEY.exec(flat);
    if (key) {
      const upTo = text.slice(0, open + 1 + flat.indexOf(key[0]));
      found.push({ line: upTo.split("\n").length, key: key[2] });
    }
  }
  return found;
};

/**
 * A never-ending loop (`withRepeat(..., -1...)` or `useLoopClock`) in a file with no sign of stopping when the screen is not in front
 * or motion is reduced (`useIsFocused`, `focused`, `live`, `reduced`, `useReducedMotion`, `cancelAnimation`): a loop that runs for ever.
 */
export const unguardedLoops = (source) => {
  const text = stripComments(source);
  const loops = /\bwithRepeat\s*\([^;]*?,\s*-1\b|\buseLoopClock\s*\(/.test(text);
  if (!loops) return false;
  return !/\b(useIsFocused|focused|live|reduced|useReducedMotion|cancelAnimation)\b/.test(text);
};
