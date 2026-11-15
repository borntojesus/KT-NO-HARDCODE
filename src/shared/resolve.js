import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function entryOf(pkg) {
  const pick = (e) => {
    if (!e) return null;
    if (typeof e === "string") return e;
    if (Array.isArray(e)) return pick(e[0]);
    return pick(e.import) ?? pick(e.default) ?? pick(e.node) ?? pick(e.require);
  };
  const exp = pkg.exports;
  if (exp) {
    const dot = typeof exp === "string" || Array.isArray(exp) || !("." in exp) ? exp : exp["."];
    const hit = pick(dot);
    if (hit) return hit;
  }
  return pkg.module ?? pkg.main ?? "index.js";
}

/**
 * Import an ESM-or-CJS package as the project at `cwd` would see it
 * (walks up node_modules folders). Returns the module or null.
 */
export async function importFromProject(name, cwd = process.cwd()) {
  let dir = resolve(cwd);
  for (;;) {
    const pkgDir = join(dir, "node_modules", name);
    const pkgJson = join(pkgDir, "package.json");
    if (existsSync(pkgJson)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgJson, "utf8"));
        const mod = await import(pathToFileURL(join(pkgDir, entryOf(pkg))).href);
        return mod;
      } catch {
        return null;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
