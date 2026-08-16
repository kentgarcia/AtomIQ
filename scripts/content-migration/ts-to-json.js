/**
 * Convert exported content objects from TypeScript files into pure JSON.
 *
 * WHAT IT DOES
 *   Recursively walks a directory, parses every `.ts` file with the TypeScript
 *   compiler (already a devDependency of this repo) and extracts each exported
 *   top-level *object literal* (e.g. `export const backgroundRadiationLesson: Lesson = { ... }`)
 *   or *array literal* (e.g. `export const averageMythBusterQuestions: QuizQuestion[] = [ ... ]`),
 *   then writes the value as a standalone, pretty-printed `.json` file named
 *   after the object's `id` field, falling back to the const name
 *   (e.g. `background-radiation.json` or `averageMythBusterQuestions.json`).
 *
 *   Parsing via the TS AST is safe against nested objects/arrays, comments,
 *   single/double quotes, escaped quotes, and multi-line template literals —
 *   something naive regex extraction cannot guarantee.
 *
 *   A module whose members mix serializable and non-serializable exports is
 *   processed per-export: a failing export (e.g. an object with shorthand
 *   property assignments referencing other bindings) is skipped with a warning
 *   while the remaining serilaizable exports are still written.
 *
 *   References to other top-level consts inside the same file (e.g. a Maze
 *   object whose `boss`/`monster` property points at a Monster const defined
 *   earlier in the file) are resolved inline: the referenced const's object
 *   literal is inlined into the output. Cyclic references are rejected.
 *
 * HOW TO RUN
 *   node scripts/content-migration/ts-to-json.js [inputDir] [outputDir]
 *
 *   Examples:
 *     node scripts/content-migration/ts-to-json.js
 *         # uses defaults below
 *     node scripts/content-migration/ts-to-json.js content/lessons my-json-out
 *     node scripts/content-migration/ts-to-json.js content/quizzes
 *
 * DEFAULTS
 *   inputDir  = content/lessons
 *   outputDir = content/lessons/json
 *
 * NOTES
 *   - `index.ts` files and dotfiles are skipped (they are barrel files, not content).
 *   - Only *object/array literal* exports are converted; other exports are ignored.
 *   - Files that cannot be serialized are skipped with a warning; healthy files
 *     are still processed.
 */

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

// ---------------------------------------------------------------------------
// Configuration / CLI
// ---------------------------------------------------------------------------

const DEFAULT_INPUT_DIR = path.join(__dirname, "..", "..", "content", "lessons");
const DEFAULT_OUTPUT_DIR = path.join(DEFAULT_INPUT_DIR, "json");

const [inputDirArg = DEFAULT_INPUT_DIR, outputDirArg = DEFAULT_OUTPUT_DIR] =
  process.argv.slice(2);

const SKIP_FILES = new Set(["index.ts"]);

// ---------------------------------------------------------------------------
// TypeScript AST -> plain JS value conversion
// ---------------------------------------------------------------------------

/** Build a human-readable "cannot be serialized" error, tagged with a line. */
function unsupported(sourceFile, node, what) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const kind = ts.SyntaxKind[node.kind] || "unknown";
  return new Error(`${what} (${kind}, line ${line + 1})`);
}

/** Resolve a property key: identifier, string, or numeric literal. */
function propertyName(sourceFile, name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  throw unsupported(sourceFile, name, "Cannot serialize computed property name");
}

/** Convert an ObjectLiteralExpression into a plain object. */
function objectToValue(sourceFile, node, refs, seen = new Set()) {
  const obj = {};
  for (const prop of node.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const key = propertyName(sourceFile, prop.name);
      const value = astToValue(sourceFile, prop.initializer, refs, seen);
      // `undefined` has no JSON representation — omit the key entirely.
      if (value !== undefined) obj[key] = value;
    } else if (ts.isShorthandPropertyAssignment(prop)) {
      // e.g. `{ demo }` — can be resolved when the referenced const is a
      // known top-level object/array literal in this file.
      const name = prop.name.text;
      const value = astToValue(sourceFile, prop.name, refs, seen);
      if (value !== undefined) obj[name] = value;
    } else if (ts.isSpreadAssignment(prop)) {
      throw unsupported(sourceFile, prop, "Cannot serialize object spread element");
    } else if (ts.isMethodDeclaration(prop)) {
      throw unsupported(sourceFile, prop, "Cannot serialize method (content must be data only)");
    } else {
      throw unsupported(sourceFile, prop, "Cannot serialize property");
    }
  }
  return obj;
}

/** Convert any supported AST node into a JSON-able JavaScript value. */
function astToValue(sourceFile, node, refs = null, seen = new Set()) {
  if (node === undefined || node === null) return undefined;

  switch (node.kind) {
    case ts.SyntaxKind.ObjectLiteralExpression:
      return objectToValue(sourceFile, node, refs, seen);

    case ts.SyntaxKind.ArrayLiteralExpression:
      return node.elements.map((element) => {
        if (ts.isSpreadElement(element)) {
          throw unsupported(sourceFile, element, "Cannot serialize array spread element");
        }
        return astToValue(sourceFile, element, refs, seen);
      });

    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return node.text;

    case ts.SyntaxKind.TemplateExpression: {
      // `Hello ${name}!` — only useful when interpolated values are strings.
      let result = node.head.text;
      for (const span of node.templateSpans) {
        result += String(astToValue(sourceFile, span.expression, refs, seen));
        result += span.literal.text;
      }
      return result;
    }

    case ts.SyntaxKind.NumericLiteral:
      return Number(node.text);

    case ts.SyntaxKind.PrefixUnaryExpression:
      if (node.operator === ts.SyntaxKind.MinusToken) {
        return -astToValue(sourceFile, node.operand, refs, seen);
      }
      throw unsupported(sourceFile, node, "Cannot serialize prefix operator");

    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.NullKeyword:
      return null;

    case ts.SyntaxKind.Identifier:
      if (node.text === "undefined") return undefined;
      // Resolve references to other top-level consts declared in this file.
      if (refs && refs.has(node.text)) {
        if (seen.has(node.text)) {
          throw unsupported(sourceFile, node, `Cannot serialize cycle involving '${node.text}'`);
        }
        const nextSeen = new Set(seen).add(node.text);
        return astToValue(sourceFile, refs.get(node.text), refs, nextSeen);
      }
      throw unsupported(sourceFile, node, `Cannot serialize bare identifier '${node.text}'`);

    default:
      throw unsupported(sourceFile, node, "Cannot serialize node");
  }
}

// ---------------------------------------------------------------------------
// Top-level extraction
// ---------------------------------------------------------------------------

/**
 * Find all exported top-level object/array literals in a source text.
 * Returns an array of `{ constName, value }`. Errors are collected per export
 * (via `errors`) so one bad export does not discard the whole file.
 */
function extractExportedObjects(fileName, contents) {
  const sourceFile = ts.createSourceFile(fileName, contents, ts.ScriptTarget.Latest, true);
  const results = [];
  const errors = [];

  // Collect every top-level const whose initializer is a serializable literal
  // (object, array, or plain string/number/boolean — exported or not) so that
  // identifiers inside exported values — e.g. a maze whose `boss`/`monster`
  // points at a Monster const, or an author `avatar` alias for a shared path —
  // can be resolved to their literal value.
  const refs = new Map();
  for (const stmt of sourceFile.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (
          decl.initializer &&
          (ts.isObjectLiteralExpression(decl.initializer) ||
            ts.isArrayLiteralExpression(decl.initializer) ||
            ts.isStringLiteral(decl.initializer) ||
            ts.isNumericLiteral(decl.initializer) ||
            decl.initializer.kind === ts.SyntaxKind.TrueKeyword ||
            decl.initializer.kind === ts.SyntaxKind.FalseKeyword)
        ) {
          refs.set(
            ts.isIdentifier(decl.name) ? decl.name.text : decl.name.getText(sourceFile),
            decl.initializer,
          );
        }
      }
    }
  }

  const recordValue = (constName, node) => {
    results.push({ constName, value: astToValue(sourceFile, node, refs) });
  };

  for (const stmt of sourceFile.statements) {
    const isExported =
      stmt.modifiers && stmt.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

    // `export const foo: Lesson = { ... }`, `export const foo: QuizQuestion[] = [ ... ]`
    // (also non-exported `const foo: ... = [ ... ]` — e.g. the inline easy bank in
    //  mythbuster-difficulty-repository.ts — captured by name so we don't lose it)
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (
          decl.initializer &&
          (ts.isObjectLiteralExpression(decl.initializer) ||
            ts.isArrayLiteralExpression(decl.initializer))
        ) {
          const constName = ts.isIdentifier(decl.name)
            ? decl.name.text
            : decl.name.getText(sourceFile);
          const shouldCapture =
            isExported ||
            (ts.isArrayLiteralExpression(decl.initializer) &&
              /MythBusterQuestions$/.test(constName));
          if (shouldCapture) {
            try {
              recordValue(constName, decl.initializer);
            } catch (err) {
              errors.push(err);
            }
          }
        }
      }
      continue;
    }

    // `export default { ... }` with an inline object/array literal, or
    // `export default foo` aliasing a top-level const object/array
    if (ts.isExportAssignment(stmt)) {
      if (
        ts.isObjectLiteralExpression(stmt.expression) ||
        ts.isArrayLiteralExpression(stmt.expression)
      ) {
        try {
          recordValue("default", stmt.expression);
        } catch (err) {
          errors.push(err);
        }
      } else if (ts.isIdentifier(stmt.expression) && refs.has(stmt.expression.text)) {
        try {
          recordValue(stmt.expression.text, refs.get(stmt.expression.text));
        } catch (err) {
          errors.push(err);
        }
      }
    }
  }

  return { results, errors };
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

/** Recursively collect `.ts` files under a directory (skipping index/dotfiles). */
function findAllTsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findAllTsFiles(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !SKIP_FILES.has(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
}

/** Prefer the object's `id` for the filename; fall back to the const name. */
function outputFileName(constName, value) {
  if (Array.isArray(value)) return `${constName}.json`;
  const id = typeof value.id === "string" && value.id.trim() ? value.id.trim() : constName;
  return `${id}.json`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const inputDir = path.resolve(inputDirArg);
const outputDirArgs = path.resolve(outputDirArg);

if (!fs.existsSync(inputDir)) {
  console.error(`Input directory does not exist: ${inputDir}`);
  process.exit(1);
}

fs.mkdirSync(outputDirArgs, { recursive: true });

const tsFiles = findAllTsFiles(inputDir);
if (tsFiles.length === 0) {
  console.warn(`No .ts content files found under ${inputDir}.`);
  console.warn("Pass the input directory containing your .ts files as the first argument, e.g.:");
  console.warn("  node scripts/content-migration/ts-to-json.js path/to/content content/lessons/json");
  process.exit(0);
}

const seenOutputs = new Set();
let converted = 0;
let skipped = 0;

for (const filePath of tsFiles) {
  const contents = fs.readFileSync(filePath, "utf8");

  const { results: objects, errors } = extractExportedObjects(filePath, contents);

  for (const err of errors) {
    const { line } = (() => {
      const sourceFile = ts.createSourceFile(filePath, contents, ts.ScriptTarget.Latest, true);
      return sourceFile.getLineAndCharacterOfPosition(0);
    })();
    console.warn(`  ! ${path.relative(process.cwd(), filePath)}: ${err.message}`);
    skipped++;
  }

  if (objects.length === 0) {
    if (errors.length === 0) {
      console.warn(`  ! no exported object/array literal in ${path.relative(process.cwd(), filePath)}`);
      skipped++;
    }
    continue;
  }

  for (const { constName, value } of objects) {
    const outName = outputFileName(constName, value);
    const outPath = path.join(outputDirArgs, outName);

    if (seenOutputs.has(outName)) {
      console.warn(`  ! duplicate output name "${outName}" — overwriting`);
    }
    seenOutputs.add(outName);

    fs.writeFileSync(outPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    console.log(`  + ${outPath}`);
    converted++;
  }
}

console.log(`\nDone. ${converted} content object(s) written to ${outputDirArgs} (${skipped} skipped).`);