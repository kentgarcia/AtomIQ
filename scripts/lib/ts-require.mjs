/**
 * Shared Node loader for tests that need the app's TypeScript theme modules
 * (path-alias free). Mirrors the hook used by scripts/test-theme-colors.mjs.
 */
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

export const ROOT = process.cwd();

Module._extensions[".ts"] = function loadTypeScript(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const reactNativeStub = {
  StyleSheet: { create: (s) => s, flatten: (s) => s },
  Platform: { OS: "node", select: (v) => v.default ?? v.ios },
};
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "react-native") return reactNativeStub;
  return originalLoad.call(this, request, parent, isMain);
};

const require = createRequire(import.meta.url);
export const loadTs = (relativePath) => require(path.join(ROOT, relativePath));
