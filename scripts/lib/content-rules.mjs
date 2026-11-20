/**
 * Content quality rule engine (no database access — safe to import in tests).
 *
 * Every learner-facing question surface is normalised into a small "item"
 * shape and run through `checkQuestion`.
 * Each rule returns findings of the form:
 *
 *   { rule: "stem-fragment", field: "question", severity: "error" | "warn", message: "..." }
 *
 * Errors fail `npm run validate:content`; warnings are reported for human
 * review but do not fail the run. The rules are intentionally conservative:
 * a rule should only fire when a beginner would plausibly be confused.
 * See docs/critical/CONTENT_QUESTION_QUALITY.md for the rule list and rationale.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lowercase, strip punctuation/markup and collapse whitespace. */
export function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[“”"'‘’`]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const finding = (rule, field, message, severity = "error") => ({
  rule,
  field,
  message,
  severity,
});

const IMPERATIVE_VERBS =
  "select|choose|pick|identify|match|complete|name|decide|determine|find|calculate|order|sort|arrange|classify|label|tap|click|circle|read|use|think|imagine|consider|explain|describe|state|list|predict|compare|spot|unscramble|drag";
const IMPERATIVE_RE = new RegExp(`^(?:please\\s+)?(?:${IMPERATIVE_VERBS})\\b`, "i");
const WH_START_RE =
  /^(what|which|who|whom|whose|where|when|why|how|is|are|do|does|did|can|could|should|would|will|has|have|was|were)\b/i;

const CONTINUATION_START_RE =
  /^(and|or|but|nor|yet|because|that|whose|then|also|of)\b/i;

const TRAILING_FUNCTION_WORD_RE =
  /\b(the|a|an|and|or|but|than|its|their|that|which|of the|to the|in the)$/i;

// Words that carry no subject matter for the "missing subject" rule.
const GENERIC_WORDS = new Set([
  "which", "what", "who", "whom", "whose", "where", "when", "why", "how",
  "these", "those", "this", "that", "them", "they", "following", "about",
  "there", "their", "following", "above", "below", "correct", "incorrect",
  "true", "false", "right", "wrong", "answer", "answers", "statement",
  "statements", "option", "options", "choice", "choices", "best", "most",
  "following", "example", "examples", "thing", "things", "item", "items",
  "does", "doing", "done", "have", "with", "from", "into", "being", "would",
  "could", "should", "tell", "describes", "describe", "means", "mean",
  "here", "belongs", "belong", "applies", "apply", "fits", "fit", "used",
  "make", "makes", "made", "happens", "happen", "one", "ones", "same",
  "different", "another", "other", "kind", "type", "sort",
]);

const PRONOUN_ONLY_AFTER_VERB =
  /\b(?:is|are|does|do|did|can|could|will|would|should|was|were|has|have|means|happens)\s+(?:it|this|that|they|these|those)\b(?!\s+(?:[a-z]+(?:\s+[a-z]+)?\s+)?(?:reaction|process|particle|atom|element|isotope|type|kind|radiation))/i;

// ---------------------------------------------------------------------------
// Generic text rules (apply to ANY learner-facing string)
// ---------------------------------------------------------------------------

const PLACEHOLDER_PATTERNS = [
  [/\b(TODO|TBD|FIXME|XXX|TBA)\b/, "contains a TODO/TBD marker"],
  [/\blorem\b|\bipsum\b/i, "contains lorem ipsum filler"],
  [/\bplaceholder\b/i, 'contains the word "placeholder"'],
  [/\{\{[^}]*\}\}|\{[A-Za-z_][A-Za-z0-9_]*\}|%s|%d|\$\{[^}]*\}/, "contains an unresolved template token"],
  [/\[\s*\]/, "contains an empty [ ] placeholder"],
  [/\[[^\]]*\b(insert|blank|todo|tbd|fill|name here|your|answer here)\b[^\]]*\]/i, "contains a bracketed placeholder"],
  [/<\s*[A-Z_]{3,}\s*>|<\s*(?:insert|name|value)[^>]*>/i, "contains an angle-bracket placeholder"],
  [/\bundefined\b|\bNaN\b|\[object Object\]/, "contains a leaked programming value (undefined/NaN/[object Object])"],
  [/\bN\/A\b/i, 'contains "N/A"'],
];

/**
 * Placeholder / leaked-value checks.
 * @param {string} text
 * @param {string} field
 * @param {{allowBlank?: boolean}} opts allowBlank: permit ___ (fill_blank only)
 */
export function checkPlaceholders(text, field, opts = {}) {
  const out = [];
  const value = String(text ?? "");
  for (const [re, message] of PLACEHOLDER_PATTERNS) {
    if (re.test(value)) out.push(finding("placeholder", field, message));
  }
  if (/^\s*(null|nil|n\/a|-|—|\?+)\s*$/i.test(value)) {
    out.push(finding("placeholder", field, `is only "${value.trim()}"`));
  }
  if (!opts.allowBlank && /_{3,}/.test(value)) {
    out.push(finding("placeholder", field, "contains a ___ blank outside a fill_blank question"));
  }
  return out;
}

/** Balanced brackets/quotes, stray punctuation, doubled punctuation. */
export function checkPunctuation(text, field) {
  const out = [];
  const value = String(text ?? "");
  if (!value.trim()) return out;

  const count = (re) => (value.match(re) || []).length;
  if (count(/\(/g) !== count(/\)/g)) {
    out.push(finding("dangling-punctuation", field, "unbalanced parentheses"));
  }
  if (count(/\[/g) !== count(/\]/g)) {
    out.push(finding("dangling-punctuation", field, "unbalanced square brackets"));
  }
  if (count(/"/g) % 2 !== 0) {
    out.push(finding("dangling-punctuation", field, "odd number of straight double quotes"));
  }
  if (count(/“/g) !== count(/”/g)) {
    out.push(finding("dangling-punctuation", field, "unbalanced curly double quotes"));
  }
  if (/^[\s,.;:)\]\-–—?!]/.test(value)) {
    out.push(finding("dangling-punctuation", field, "starts with stray punctuation"));
  }
  if (/[,;:]\s*[?.!]/.test(value)) {
    out.push(finding("dangling-punctuation", field, "comma/semicolon/colon directly before ? . or !"));
  }
  if (/\w\s+[,;?!]/.test(value) || /\w\s+\.(\s|$)/.test(value)) {
    out.push(finding("dangling-punctuation", field, "space before punctuation mark"));
  }
  if (/\?\?|\.\.(?!\.)|!!|,,|;;|::/.test(value)) {
    out.push(finding("dangling-punctuation", field, "doubled punctuation"));
  }
  return out;
}

/** Truncation / ellipsis / trailing connector checks for free text. */
export function checkTruncation(text, field, { requireTerminal = true } = {}) {
  const out = [];
  const value = String(text ?? "").trim();
  if (!value) return out;
  if (/(\.{3}|…)\s*$/.test(value)) {
    out.push(finding("truncated", field, "ends with an ellipsis"));
  }
  if (/[-–—]\s*$/.test(value)) {
    out.push(finding("truncated", field, "ends with a hyphen or dash"));
  }
  if (/[,;]\s*$/.test(value)) {
    out.push(finding("truncated", field, "ends with a comma or semicolon"));
  }
  if (requireTerminal && !/[.?!)"”'’\]]\s*$/.test(value) && !/[:]\s*$/.test(value)) {
    out.push(finding("truncated", field, "has no terminal punctuation (possibly cut off)", "warn"));
  }
  if (!/[.?!)"”'’\]:]\s*$/.test(value) && TRAILING_FUNCTION_WORD_RE.test(value)) {
    out.push(finding("truncated", field, `ends mid-phrase on a connector word ("${value.split(/\s+/).pop()}")`));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Question stem rules
// ---------------------------------------------------------------------------

const VISUAL_REF_RE =
  /\b(?:(?:the|this|that)\s+)?(image|picture|photo|diagram|figure|illustration|chart|graph|table|map|timeline|animation|video|screenshot)\b[^.?!]{0,30}\b(above|below|shown|pictured|displayed|on screen|on the screen|here)\b|\b(?:see|refer to|look at|study|examine|using|based on|in)\s+the\s+(?:image|picture|photo|diagram|figure|illustration|chart|graph|table|map|timeline)\b/i;

const PREVIOUS_STEP_RE = [
  /\b(?:the|in the|from the)\s+(?:above|previous|preceding|prior|earlier|last)\s+(?:question|step|slide|screen|example|statement|passage|paragraph|lesson|text|answer|card|page|section|briefing)\b/i,
  /\bas\s+(?:shown|discussed|described|mentioned|seen|explained)\s+(?:above|earlier|before|previously)\b/i,
  /\b(?:mentioned|discussed|described|explained|covered|introduced)\s+(?:above|earlier|previously|before|in the (?:last|previous) (?:step|lesson|slide|screen))\b/i,
  /\bbased on\s+(?:what|everything)\s+(?:you|we)\s+(?:just\s+)?(?:learned|saw|read|studied)\b/i,
  /\b(?:the|this)\s+(?:above|following)\s*[.?!]?\s*$/i,
  /\bin\s+the\s+(?:last|previous)\s+(?:step|question|lesson)\b/i,
];

/**
 * Check a question stem.
 * @param {string} text
 * @param {{kind: string, hasVisual?: boolean, field?: string}} ctx
 *   kind: multiple_choice | true_false | fill_blank | matching | lab | statement
 */
export function checkStem(text, ctx) {
  const field = ctx.field ?? "question";
  const kind = ctx.kind;
  const out = [];
  const raw = String(text ?? "");
  const trimmed = raw.trim();

  if (!trimmed) {
    out.push(finding("empty-text", field, "is empty"));
    return out;
  }

  out.push(...checkPlaceholders(trimmed, field, { allowBlank: kind === "fill_blank" }));
  out.push(...checkPunctuation(trimmed, field));

  // True/False stems conventionally start with "True or False:"; judge the statement itself.
  let stem = trimmed;
  const tfPrefix = /^true\s*(?:or|\/)\s*false\s*[:\-–—]?\s*/i;
  if (kind === "true_false" && tfPrefix.test(stem)) stem = stem.replace(tfPrefix, "");

  const minLen = kind === "fill_blank" ? 8 : 15;
  if (stem.length < minLen) {
    out.push(finding("stem-too-short", field, `only ${stem.length} characters — too short to stand alone`));
  }

  if (/^[a-z]/.test(stem.replace(/^[^A-Za-z0-9]+/, ""))) {
    out.push(finding("stem-fragment", field, "starts with a lowercase letter (looks like a continuation)"));
  }
  if (CONTINUATION_START_RE.test(stem)) {
    out.push(finding("stem-fragment", field, `starts with a continuation word ("${stem.split(/\s+/)[0]}")`));
  }

  const endsColon = /:\s*$/.test(stem);
  const endsTerminal = /[.?!]["”'’)\]]*\s*$/.test(stem);

  if (kind !== "fill_blank") {
    if (endsColon) {
      // "Choose the correct statement:" is a complete instruction; "Alpha particles can be stopped by:" is not.
      if (!IMPERATIVE_RE.test(stem) && !/^(?:which|what|who|where|when|why|how)\b.*\?/i.test(stem)) {
        out.push(finding("stem-fragment", field, 'ends with ":" — an unfinished sentence that depends on the options to complete it'));
      }
    } else if (!endsTerminal) {
      out.push(finding("stem-fragment", field, "has no terminal punctuation — not a finished question or instruction"));
    }
    if (/(\.{3}|…)\s*$/.test(stem)) {
      out.push(finding("truncated", field, "ends with an ellipsis"));
    }
    if (/[-–—,;]\s*$/.test(stem)) {
      out.push(finding("truncated", field, "ends with a hyphen, dash, comma, or semicolon"));
    }
    if (!endsTerminal && !endsColon && TRAILING_FUNCTION_WORD_RE.test(stem)) {
      out.push(finding("truncated", field, `ends mid-phrase on "${stem.split(/\s+/).pop()}"`));
    }
  }

  // Must be a question or an instruction (true/false may be a plain statement).
  if (kind === "multiple_choice" || kind === "lab" || kind === "matching") {
    const hasQuestionMark = /\?/.test(stem);
    const isInstruction = IMPERATIVE_RE.test(stem) || /^(?:in|on|at|for|during|after|before|if|when|given|suppose|imagine)\b[^?]*,\s*(?:which|what|who|how|why|select|choose)/i.test(stem);
    const startsWh = WH_START_RE.test(stem);
    if (!hasQuestionMark && !isInstruction && !(startsWh && endsTerminal)) {
      out.push(finding("not-a-question", field, "is neither a question (?) nor an instruction (Select/Choose/Identify...)"));
    }
  }

  // Chat-style shorthand reads as a note, not a question ("What is prompt vs delayed neutrons?").
  if (/(?:\bvs\.?(?=\s|$)|\bw\/|\bb\/c\b|\bbtw\b|\bapprox\.)/i.test(stem)) {
    out.push(finding("stem-fragment", field, 'uses shorthand ("vs", "w/", "b/c") — write the full comparison as a sentence'));
  }

  // Missing subject / vague stems.
  const words = normalize(stem.replace(tfPrefix, "")).split(" ").filter(Boolean);
  const contentWords = words.filter((w) => w.length >= 4 && !GENERIC_WORDS.has(w));
  if (kind !== "fill_blank" && contentWords.length === 0) {
    out.push(finding("missing-context", field, "names no subject — a learner cannot tell what is being asked (e.g. \"Which of these?\")"));
  }
  if (/^what\s+about\s+(?:it|this|that|them|these|those)\b/i.test(stem)) {
    out.push(finding("missing-context", field, "refers to something not on screen (\"what about it\")"));
  }

  // "If half-life is 5 years, remaining after 15 years?" — a condition with no actual question after it.
  if (kind !== "true_false" && kind !== "fill_blank" && /^(?:if|when|suppose|assuming|given)\b/i.test(stem) && stem.includes(",")) {
    const tail = stem.slice(stem.indexOf(",") + 1).trim();
    if (!WH_START_RE.test(tail) && !/\b(?:what|which|who|how|why|where|when)\b/i.test(tail) && !IMPERATIVE_RE.test(tail)) {
      out.push(finding("stem-fragment", field, "states a condition but never asks a question about it (no what/which/how ...?)"));
    }
  }

  // Pronoun-only reference with no antecedent in an earlier sentence of the stem.
  const sentences = stem.split(/(?<=[.?!])\s+/);
  const first = sentences[0] ?? stem;
  if (/^(?:it|they|this|that|these|those|he|she|its|their)\b/i.test(first) && !/^(?:this|that|these|those)\s+[a-z]/i.test(first)) {
    out.push(finding("missing-context", field, `starts with a pronoun ("${first.split(/\s+/)[0]}") that has no antecedent on screen`));
  } else if (PRONOUN_ONLY_AFTER_VERB.test(first) && sentences.length === 1 && words.length <= 9) {
    out.push(finding("missing-context", field, "pronoun (it/this/that/they) has no antecedent in the stem"));
  }

  // References to something that is not on this screen.
  for (const re of PREVIOUS_STEP_RE) {
    if (re.test(stem)) {
      out.push(finding("depends-on-previous-step", field, "refers to a previous step/screen that may not be visible"));
      break;
    }
  }
  if (VISUAL_REF_RE.test(stem) && !ctx.hasVisual) {
    out.push(finding("missing-visual", field, "refers to an image/diagram/chart, but this question has no visual attached"));
  }

  // Inline answer options crammed into the stem.
  if (/\bA[).]\s.+\bB[).]\s/.test(stem)) {
    out.push(finding("options-in-stem", field, "answer choices are embedded in the stem"));
  }

  return out;
}

// ---------------------------------------------------------------------------
// Option rules
// ---------------------------------------------------------------------------

const POSITIONAL_LETTER_RE =
  /\b(?:[Bb]oth|[Ee]ither|[Nn]either|[Aa]ll|[Oo]nly)\s+(?:of\s+)?(?:[Oo]ptions?\s+)?[A-D](?:\s*(?:,|and|&|or)\s*[A-D])+\b|\b[Oo]ptions?\s+[A-D]\b|\b(?:[Aa]nswer|[Cc]hoice)\s+[A-D]\b/;
const ABOVE_BELOW_RE = /\b(?:all|none|both|neither|any)\s+of\s+(?:the\s+)?(?:above|below)\b|\b(?:the\s+)?(?:above|below)\s+(?:answers?|options?|choices?)\b|\bnone\s+above\b|\ball\s+(?:the\s+)?above\b/i;

/**
 * @param {string[]} options
 * @param {string} questionText
 * @param {{kind: string, shuffled?: boolean}} ctx
 *   shuffled: true when the pool is shuffled at runtime (position-dependent options are errors)
 */
export function checkOptions(options, questionText, ctx) {
  const out = [];
  const field = "options";
  if (!Array.isArray(options)) {
    out.push(finding("options-shape", field, "options is not an array"));
    return out;
  }
  if (options.length < 2) {
    out.push(finding("options-shape", field, `has ${options.length} option(s); at least 2 are required`));
  }
  const seen = new Map();
  const normQuestion = normalize(String(questionText ?? "").replace(/^true\s*(?:or|\/)\s*false\s*[:\-–—]?\s*/i, ""));
  options.forEach((opt, index) => {
    const f = `options[${index}]`;
    if (typeof opt !== "string") {
      out.push(finding("options-shape", f, `is a ${typeof opt}, expected a string`));
      return;
    }
    if (!opt.trim()) {
      out.push(finding("empty-option", f, "is empty"));
      return;
    }
    out.push(...checkPlaceholders(opt, f, { allowBlank: ctx.kind === "fill_blank" }));
    out.push(...checkPunctuation(opt, f));
    if (/(\.{3}|…)\s*$/.test(opt.trim()) || /[-–—,;:]\s*$/.test(opt.trim())) {
      out.push(finding("truncated", f, "ends with an ellipsis/dash/comma/colon"));
    }
    if (/^\s*[A-Da-d][).:]\s+\S/.test(opt)) {
      out.push(finding("option-letter-prefix", f, "starts with its own letter label (the UI adds labels)"));
    }
    if (opt.length > 160) {
      out.push(finding("option-too-long", f, `is ${opt.length} characters`, "warn"));
    }
    const norm = normalize(opt);
    if (norm && seen.has(norm)) {
      out.push(finding("duplicate-option", f, `duplicates options[${seen.get(norm)}] ("${opt}")`));
    } else if (norm) {
      seen.set(norm, index);
    }
    if (norm && normQuestion && norm === normQuestion) {
      out.push(finding("question-equals-option", f, "is identical to the question text"));
    }
    if (POSITIONAL_LETTER_RE.test(opt)) {
      out.push(finding("position-dependent-option", f, `refers to other options by letter ("${opt}") — breaks when options are reordered`));
    }
    if (ABOVE_BELOW_RE.test(opt)) {
      out.push(
        finding(
          "position-dependent-option",
          f,
          `uses "${opt}" — depends on option order${ctx.shuffled ? " and this pool is shuffled at runtime" : ""}; use "All of these"/"None of these"`,
          ctx.shuffled ? "error" : "warn",
        ),
      );
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Answer + explanation rules
// ---------------------------------------------------------------------------

/** First sentence-ish fragment of the explanation, for polarity checks. */
const explanationLead = (explanation) => String(explanation ?? "").trim().split(/(?<=[.!?])\s/)[0] ?? "";

export function checkAnswer(item) {
  const out = [];
  const { kind, options = [], correct } = item;
  if (kind === "true_false") {
    const norm = options.map((o) => normalize(o));
    const isTF = norm.length === 2 && norm[0] === "true" && norm[1] === "false";
    if (!isTF) {
      out.push(finding("true-false-shape", "options", 'true_false options must be exactly ["True", "False"]'));
    }
    const okIndex = Number.isInteger(correct) && (correct === 0 || correct === 1);
    if (!(okIndex || typeof correct === "boolean")) {
      out.push(finding("answer-type", "correct_answer", `true_false answer must be 0/1 or a boolean, got ${JSON.stringify(correct)}`));
    }
    return out;
  }
  if (kind === "lab") {
    // Lab answers reference an option id (see lesson_steps lab data).
    const ids = options.map((o) => (typeof o === "object" && o ? o.id : undefined));
    if (typeof correct !== "string" || !ids.includes(correct)) {
      out.push(finding("answer-range", "correctAnswer", `${JSON.stringify(correct)} does not match any option id (${ids.join(", ")})`));
    }
    return out;
  }
  if (kind === "multiple_choice" || kind === "matching") {
    if (typeof correct !== "number" || !Number.isInteger(correct)) {
      out.push(finding("answer-type", "correct_answer", `expected a numeric option index, got ${typeof correct} ${JSON.stringify(correct)}`));
    } else if (correct < 0 || correct >= options.length) {
      out.push(finding("answer-range", "correct_answer", `index ${correct} is out of range for ${options.length} options`));
    }
  }
  if (kind === "fill_blank") {
    if (correct === undefined || correct === null || correct === "") {
      out.push(finding("answer-type", "correct_answer", "fill_blank has no answer"));
    }
  }
  return out;
}

export function checkExplanation(item) {
  const out = [];
  const field = "explanation";
  const text = String(item.explanation ?? "").trim();
  if (!text) {
    out.push(finding("explanation-missing", field, "is empty"));
    return out;
  }
  out.push(...checkPlaceholders(text, field));
  out.push(...checkPunctuation(text, field));
  out.push(...checkTruncation(text, field));
  if (text.length < 20) {
    out.push(finding("explanation-thin", field, `only ${text.length} characters`, "warn"));
  }

  const options = (item.options ?? []).map((o) => (typeof o === "object" && o ? o.label : o));
  let correctText;
  if (item.kind === "multiple_choice" && Number.isInteger(item.correct)) correctText = options[item.correct];
  if (item.kind === "lab") {
    const opt = (item.options ?? []).find((o) => o && o.id === item.correct);
    correctText = opt?.label;
  }

  const normExplanation = normalize(text);
  if (/^correct answer\b/.test(normExplanation) || (correctText && normExplanation === normalize(correctText))) {
    out.push(finding("explanation-restates-answer", field, 'only repeats the answer ("Correct answer: ...") and teaches nothing'));
  }
  // Explanation should be longer than the bare answer; "X." style.
  if (correctText && normalize(correctText).length > 0 && normExplanation.replace(normalize(correctText), "").trim().length < 6) {
    if (!out.some((f) => f.rule === "explanation-restates-answer")) {
      out.push(finding("explanation-restates-answer", field, "adds nothing beyond the correct option text"));
    }
  }

  // Polarity: "True!"/"False." in the explanation must agree with the answer.
  if (item.kind === "true_false") {
    const lead = explanationLead(text);
    const says = /^(true|correct|yes)\b/i.test(lead) ? true : /^(false|incorrect|no|not true|myth)\b/i.test(lead) ? false : null;
    let answer = item.correct;
    if (typeof answer === "number") answer = answer === 0;
    if (says !== null && typeof answer === "boolean" && says !== answer) {
      out.push(finding("explanation-contradicts-answer", field, `explanation says "${lead.slice(0, 30)}" but the stored answer is ${answer ? "True" : "False"}`));
    }
  }

  // MC: explanation that opens with a *different* option's text is suspicious.
  if (item.kind === "multiple_choice" && Number.isInteger(item.correct)) {
    options.forEach((opt, index) => {
      if (index === item.correct || typeof opt !== "string") return;
      const normOpt = normalize(opt);
      if (normOpt.length >= 5 && normExplanation.startsWith(normOpt + " ") && !normalize(options[item.correct]).includes(normOpt)) {
        out.push(finding("explanation-mismatch", field, `opens with option ${index} ("${opt}") but the answer is option ${item.correct}`, "warn"));
      }
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public question entry point
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} QuestionItem
 * @property {string} kind multiple_choice | true_false | fill_blank | matching | lab | scramble
 * @property {string} text the stem / task
 * @property {Array<string|{id:string,label:string}>} [options]
 * @property {number|boolean|string} [correct]
 * @property {string} [explanation]
 * @property {boolean} [hasVisual]
 * @property {boolean} [shuffled]
 * @property {boolean} [explanationOptional]
 * @property {string} [textField]
 * @property {string} [clue] scramble hint
 */
export function checkQuestion(item) {
  const out = [];
  const textField = item.textField ?? "question";

  if (item.kind === "scramble") {
    // Scramble clues are short noun-phrase prompts ("Center of an atom:") and the game
    // does not currently render them; apply only structural + placeholder checks.
    out.push(...checkPlaceholders(item.text, textField));
    if (!String(item.text ?? "").trim()) out.push(finding("empty-text", textField, "is empty"));
    if (!/^[A-Za-z]{3,20}$/.test(String(item.correct ?? ""))) {
      out.push(finding("answer-type", "answer", `scramble answer must be 3-20 letters, got ${JSON.stringify(item.correct)}`));
    }
    return out;
  }

  out.push(...checkStem(item.text, { kind: item.kind, hasVisual: item.hasVisual, field: textField }));

  const optionLabels = (item.options ?? []).map((o) => (typeof o === "object" && o ? o.label : o));
  if (item.kind !== "fill_blank" || (item.options ?? []).length > 0) {
    out.push(...checkOptions(optionLabels, item.text, { kind: item.kind, shuffled: item.shuffled }));
  }
  if (
    /\b(?:name|give|identify|select|choose|pick)\s+(?:only\s+)?(?:one|a single|1)\b/i.test(String(item.text ?? "")) &&
    optionLabels.some((o) => /^(?:all|both|none)\s+of\s+(?:these|the above|them)\b/i.test(String(o)))
  ) {
    out.push(finding("stem-option-mismatch", textField, 'asks for ONE answer but offers an "All of ..." option'));
  }
  out.push(...checkAnswer(item));
  if (!item.explanationOptional) out.push(...checkExplanation(item));
  return out;
}

/**
 * Statements shown in the Myth-or-Fact game (myths.myth_statement / reality).
 * They are claims, not questions, so only completeness checks apply.
 */
export function checkStatement(text, field) {
  const out = [];
  const value = String(text ?? "").trim();
  if (!value) {
    out.push(finding("empty-text", field, "is empty"));
    return out;
  }
  out.push(...checkPlaceholders(value, field));
  out.push(...checkPunctuation(value, field));
  // Myth/fact cards are short banner statements; terminal punctuation is not required.
  out.push(...checkTruncation(value, field, { requireTerminal: false }));
  if (value.length < 15) out.push(finding("stem-too-short", field, `only ${value.length} characters`));
  if (/^[a-z]/.test(value)) out.push(finding("stem-fragment", field, "starts with a lowercase letter"));
  if (CONTINUATION_START_RE.test(value)) out.push(finding("stem-fragment", field, "starts with a continuation word"));
  return out;
}

/**
 * Find a stem that appears more than once where one copy marks an answer as correct
 * that another copy lists as a WRONG option (a genuine contradiction between pools).
 * Differently-worded correct answers for the same idea are not flagged.
 * @param {Array<{id: string, text: string, options: string[], correct: number}>} items
 * @returns {Array<{a: object, b: object}>} contradicting pairs
 */
export function findConflictingDuplicates(items) {
  const byStem = new Map();
  for (const item of items) {
    const key = normalize(item.text);
    if (!key) continue;
    if (!byStem.has(key)) byStem.set(key, []);
    byStem.get(key).push(item);
  }
  const conflicts = [];
  for (const group of byStem.values()) {
    for (const a of group) {
      for (const b of group) {
        if (a === b) continue;
        const aCorrect = normalize(a.options[a.correct]);
        const bWrong = b.options.filter((_, i) => i !== b.correct).map(normalize);
        if (aCorrect && bWrong.includes(aCorrect)) conflicts.push({ a, b });
      }
    }
  }
  return conflicts;
}
