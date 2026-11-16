/* global __dirname */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Compile the actual TypeScript sources with the installed compiler and mock native boundaries.
function modulos(mocks = {}, globais = {}) {
  const cache = new Map();
  function carregar(arquivo) {
    let absoluto = path.resolve(__dirname, "..", arquivo);
    if (!path.extname(absoluto)) absoluto += fs.existsSync(`${absoluto}.ts`) ? ".ts" : ".tsx";
    if (cache.has(absoluto)) return cache.get(absoluto);
    const exports = {};
    cache.set(absoluto, exports);
    const compilado = ts.transpileModule(fs.readFileSync(absoluto, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(compilado, {
      exports, Date, Set, Object, JSON, Error, __DEV__: true,
      setTimeout: () => 1, clearTimeout: () => {}, ...globais,
      require: (nome) => {
        if (Object.hasOwn(mocks, nome)) return mocks[nome];
        if (nome.startsWith(".")) return carregar(path.resolve(path.dirname(absoluto), nome));
        throw new Error(`Mock ausente: ${nome}`);
      },
    }, { filename: absoluto });
    return exports;
  }
  return carregar;
}
module.exports = { modulos };
