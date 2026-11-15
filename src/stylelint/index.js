import { isAbsolute, join } from "node:path";
import postcssHtml from "postcss-html";
import plugins from "./plugin.js";
import { COLOR_FUNCTIONS } from "../shared/colors.js";
import { DEFAULT_ALLOW, loadProjectConfig } from "../shared/config.js";

/** Tailwind v4 (and v3) at-rules. None of our rules touch them; listed for consumers. */
export const TAILWIND_AT_RULES = [
  "theme",
  "custom-variant",
  "variant",
  "apply",
  "utility",
  "source",
  "plugin",
  "reference",
  "config",
  "tailwind",
  "layer",
  "screen",
  "responsive",
];

export const HTML_LIKE_FILES = ["**/*.astro", "**/*.vue", "**/*.html", "**/*.svelte"];

export const rules = {
  "color-no-hex": true,
  "function-disallowed-list": [COLOR_FUNCTIONS],
  "color-named": "never",
  "no-hardcode/font-family-tokens": true,
  "no-hardcode/no-arbitrary-tailwind": true,
};

// Leading "/" makes stylelint use a glob as is, instead of resolving it
// against this config file's directory inside node_modules.
const anywhere = (glob) => (glob.startsWith("**/") ? `/${glob}` : glob);

/** Build the shareable config for a project root (reads package.json `noHardcode`). */
export function createConfig({ cwd = process.cwd() } = {}) {
  const project = loadProjectConfig(cwd);
  const projectGlobs = [...project.userAllow, ...project.userIgnore].map((g) =>
    isAbsolute(g) ? g : join(project.root, g),
  );
  return {
    plugins,
    ignoreFiles: [...DEFAULT_ALLOW.map(anywhere), ...projectGlobs],
    rules: { ...rules },
    overrides: [{ files: HTML_LIKE_FILES, customSyntax: postcssHtml }],
  };
}

export default createConfig();
