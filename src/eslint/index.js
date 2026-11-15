import { createRequire } from "node:module";
import tseslint from "typescript-eslint";
import { loadProjectConfig } from "../shared/config.js";
import { importFromProject } from "../shared/resolve.js";
import noColorLiteral from "./rules/no-color-literal.js";
import noArbitraryTailwind from "./rules/no-arbitrary-tailwind.js";
import noRawFontFamily from "./rules/no-raw-font-family.js";

const pkg = createRequire(import.meta.url)("../../package.json");

export const rules = {
  "no-color-literal": noColorLiteral,
  "no-arbitrary-tailwind": noArbitraryTailwind,
  "no-raw-font-family": noRawFontFamily,
};

export const plugin = {
  meta: { name: "no-hardcode", version: pkg.version },
  rules,
  configs: {},
};

export const ruleSeverities = {
  "no-hardcode/no-color-literal": "error",
  "no-hardcode/no-arbitrary-tailwind": "error",
  "no-hardcode/no-raw-font-family": "error",
};

export const JS_FILES = ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"];
export const ASTRO_FILES = ["**/*.astro"];

/**
 * Build the flat-config array for JS/TS. `cwd` decides which package.json
 * `noHardcode` key is read (allow + ignore globs are excluded from these rules).
 */
export function createRecommended({ cwd = process.cwd() } = {}) {
  const project = loadProjectConfig(cwd);
  return [
    {
      name: "no-hardcode/recommended",
      files: JS_FILES,
      ignores: [...project.allow, ...project.userIgnore],
      plugins: { "no-hardcode": plugin },
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      rules: { ...ruleSeverities },
    },
  ];
}

/**
 * Try to load astro-eslint-parser from the consumer project (optional peer).
 * Returns the parser module or null.
 */
export async function resolveAstroParser(cwd = process.cwd()) {
  const mod = await importFromProject("astro-eslint-parser", cwd);
  if (!mod) return null;
  const parser = mod.default && typeof mod.default.parseForESLint === "function" ? mod.default : mod;
  return typeof parser.parseForESLint === "function" ? parser : null;
}

/**
 * Flat-config array for `.astro` files. Pass the parser explicitly, or let it
 * be resolved from the project; without a parser it only adds the rules (use it
 * after `eslint-plugin-astro`'s config, which sets the parser).
 */
export function createAstroConfig({ cwd = process.cwd(), parser = null } = {}) {
  const project = loadProjectConfig(cwd);
  const config = {
    name: "no-hardcode/astro",
    files: ASTRO_FILES,
    ignores: [...project.allow, ...project.userIgnore],
    plugins: { "no-hardcode": plugin },
    rules: { ...ruleSeverities },
  };
  if (parser) {
    config.languageOptions = {
      parser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".astro"],
        sourceType: "module",
      },
    };
  }
  return [config];
}

const astroParser = await resolveAstroParser();

plugin.configs.recommended = createRecommended();
plugin.configs.astro = createAstroConfig({ parser: astroParser });

export const configs = plugin.configs;
export const recommended = plugin.configs.recommended;
export const astro = plugin.configs.astro;

export default plugin;
