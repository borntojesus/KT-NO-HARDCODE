import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Files that are allowed to contain literals: they define the tokens. */
export const DEFAULT_ALLOW = [
  "**/tokens/**",
  "**/*.tokens.{css,ts,js,mjs,json}",
  "**/tenant*.{css,ts,js,json}",
  "**/theme/tokens*",
  "**/styles/tenant/**",
];

/** Paths the CLI never lints. */
export const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/out/**",
  "**/storybook-static/**",
  "**/public/**",
  "**/.astro/**",
  "**/coverage/**",
  "**/.turbo/**",
  "**/.vercel/**",
  "**/.netlify/**",
  "**/pnpm-lock.yaml",
  "**/package-lock.json",
  "**/yarn.lock",
  "**/bun.lockb",
];

/** Walk up from `start` to the nearest directory holding a package.json. */
export function findPackageRoot(start = process.cwd()) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Read `noHardcode: { allow, ignore }` from the nearest package.json.
 * Returns the merged lists (defaults + project) and the project root.
 */
export function loadProjectConfig(start = process.cwd()) {
  const root = findPackageRoot(start);
  let user = {};
  if (root) {
    try {
      const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
      if (pkg && typeof pkg.noHardcode === "object" && pkg.noHardcode) user = pkg.noHardcode;
    } catch {
      // unreadable package.json: fall back to defaults
    }
  }
  const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  return {
    root: root ?? resolve(start),
    allow: [...DEFAULT_ALLOW, ...list(user.allow)],
    ignore: [...DEFAULT_IGNORE, ...list(user.ignore)],
    userAllow: list(user.allow),
    userIgnore: list(user.ignore),
  };
}
