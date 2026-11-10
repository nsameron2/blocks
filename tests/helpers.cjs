const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");

// Load the app's TypeScript without emitting build artifacts. Tests can replace
// UI/native boundaries while executing the actual application functions.
function loadTypeScript(file, mocks = {}) {
  const cache = new Map();

  function load(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const nativeRequire = createRequire(filename);
    const requireModule = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith(".")) {
        const base = path.resolve(path.dirname(filename), name);
        for (const extension of [".ts", ".tsx"]) {
          if (fs.existsSync(base + extension)) return load(base + extension);
        }
      }
      return nativeRequire(name);
    };
    new Function("require", "module", "exports", source)(
      requireModule, module, module.exports,
    );
    return module.exports;
  }

  return load(file);
}

function elements(node) {
  if (!node || typeof node !== "object") return [];
  const children = node.props?.children;
  return [node, ...[children].flat(Infinity).flatMap(elements)];
}

module.exports = { loadTypeScript, elements };
