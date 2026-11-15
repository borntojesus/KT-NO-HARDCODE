import { readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import picomatch from "picomatch";
import { ESLint } from "eslint";
import stylelint from "stylelint";
import { createRecommended, createAstroConfig, resolveAstroParser } from "./eslint/index.js";
import { createConfig as createStylelintConfig } from "./stylelint/index.js";
import { loadProjectConfig } from "./shared/config.js";

const JS_EXT = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"]);
const CSS_EXT = new Set([".css"]);
const HTML_EXT = new Set([".astro", ".vue", ".html", ".svelte"]);
const RULE_PREFIXES = ["no-hardcode/", "color-no-hex", "function-disallowed-list", "color-named"];

const HELP = `Usage: no-hardcode [paths...]

Checks that components use design tokens only: no colour literals, no
arbitrary Tailwind values, no raw font families. Default path is ".".
Reads "noHardcode": { "allow": [...], "ignore": [...] } from the nearest package.json.
Exit code 1 when anything is found.`;

function walk(dir, root, isIgnored, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const abs = join(dir, e.name);
    const rel = relative(root, abs).split(sep).join("/");
    if (e.isDirectory()) {
      if (isIgnored(`${rel}/`) || isIgnored(`${rel}/x`)) continue;
      walk(abs, root, isIgnored, out);
    } else if (e.isFile()) {
      if (!isIgnored(rel)) out.push(abs);
    }
  }
}

export async function run(argv) {
  if (argv.includes("-h") || argv.includes("--help")) {
    console.log(HELP);
    return 0;
  }
  const targets = argv.filter((a) => !a.startsWith("-"));
  if (targets.length === 0) targets.push(".");
  const cwd = process.cwd();
  const project = loadProjectConfig(resolve(cwd, targets[0]));
  const root = project.root;

  const opts = { dot: true };
  const ignored = picomatch(project.ignore, opts);
  const allowed = picomatch(project.allow, opts);
  const toRel = (abs) => relative(root, abs).split(sep).join("/");
  // paths outside the project root are matched against their absolute path
  const isIgnored = (rel) => ignored(rel);

  const files = [];
  for (const t of targets) {
    const abs = resolve(cwd, t);
    let st;
    try {
      st = statSync(abs);
    } catch {
      console.error(`no-hardcode: path not found: ${t}`);
      return 2;
    }
    if (st.isDirectory()) walk(abs, root, isIgnored, files);
    else files.push(abs);
  }

  const js = [];
  const css = [];
  const astro = [];
  for (const f of files) {
    const rel = toRel(f);
    if (allowed(rel)) continue;
    const ext = extname(f).toLowerCase();
    if (JS_EXT.has(ext)) js.push(f);
    if (CSS_EXT.has(ext) || HTML_EXT.has(ext)) css.push(f);
    if (ext === ".astro") astro.push(f);
  }

  const problems = [];

  // ESLint: only our rules, the project's eslint.config is not loaded.
  const astroParser = astro.length ? await resolveAstroParser(root) : null;
  if (astro.length && !astroParser) {
    console.log(
      `no-hardcode: ${astro.length} .astro file(s): scripts/markup skipped (install astro-eslint-parser to lint them); <style> blocks are still checked.`,
    );
  }
  const eslintFiles = astroParser ? [...js, ...astro] : js;
  if (eslintFiles.length) {
    const overrideConfig = [
      { linterOptions: { reportUnusedDisableDirectives: "off", reportUnusedInlineConfigs: "off" } },
      ...createRecommended({ cwd: root }),
      ...(astroParser ? createAstroConfig({ cwd: root, parser: astroParser }) : []),
    ];
    const eslint = new ESLint({
      cwd: root,
      overrideConfigFile: true,
      overrideConfig,
      ignore: false,
      errorOnUnmatchedPattern: false,
    });
    const results = await eslint.lintFiles(eslintFiles);
    for (const r of results) {
      for (const m of r.messages) {
        const ours = m.ruleId && m.ruleId.startsWith("no-hardcode/");
        if (!ours && !m.fatal) continue;
        problems.push({
          file: r.filePath,
          line: m.line ?? 0,
          column: m.column ?? 0,
          rule: m.ruleId ?? "parse-error",
          message: m.message,
        });
      }
    }
  }

  // stylelint: plain CSS plus <style> blocks of .astro/.vue/.html/.svelte.
  if (css.length) {
    const { results } = await stylelint.lint({
      files: css,
      cwd: root,
      config: createStylelintConfig({ cwd: root }),
      configBasedir: root,
      allowEmptyInput: true,
      disableDefaultIgnores: true,
    });
    for (const r of results) {
      if (r.ignored) continue;
      for (const w of r.warnings) {
        const ours = RULE_PREFIXES.some((p) => w.rule.startsWith(p)) || w.rule === "CssSyntaxError";
        if (!ours) continue;
        problems.push({
          file: r.source,
          line: w.line,
          column: w.column,
          rule: w.rule,
          message: w.text.replace(` (${w.rule})`, ""),
        });
      }
    }
  }

  problems.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
  for (const p of problems) {
    console.log(`${relative(cwd, p.file) || p.file}:${p.line}:${p.column}  ${p.message}  [${p.rule}]`);
  }
  const checked = js.length + css.length + (astroParser ? astro.length : 0);
  if (problems.length) {
    console.log(`\nno-hardcode: ${problems.length} problem(s) in ${new Set(problems.map((p) => p.file)).size} file(s), ${checked} file(s) checked.`);
    return 1;
  }
  console.log(`no-hardcode: ok, ${checked} file(s) checked.`);
  return 0;
}
