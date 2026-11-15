import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import stylelint from "stylelint";
import config, { createConfig } from "../src/stylelint/index.js";

const lint = async (code, codeFilename = "/project/src/components/x.css", cfg = config) => {
  const { results } = await stylelint.lint({ code, codeFilename, config: cfg });
  return results[0].warnings.map((w) => w.rule);
};

describe("stylelint config", () => {
  it("flags hex, colour functions, named colours, raw fonts", async () => {
    const rules = await lint(
      `.a { color: #fff; border: 1px solid #0d827580; background: rgb(0 0 0); outline-color: hsl(1 2% 3%);
            fill: oklch(0.7 0.1 200); --a: rgba(0,0,0,1); --b: hsla(1,2%,3%,1); stroke: oklab(0.1 0.1 0.1); caret-color: lab(1 2 3);
            text-decoration-color: lch(1 2 3); column-rule-color: hwb(1 2% 3%); accent-color: color(srgb 1 0 0);
            border-left-color: red; font-family: Inter, sans-serif; }`,
    );
    for (const r of ["color-no-hex", "function-disallowed-list", "color-named", "no-hardcode/font-family-tokens"]) {
      assert.ok(rules.includes(r), `expected ${r} in ${rules}`);
    }
    assert.equal(rules.filter((r) => r === "function-disallowed-list").length, 10);
    assert.equal(rules.filter((r) => r === "color-no-hex").length, 2);
  });

  it("allows tokens and keywords", async () => {
    const rules = await lint(
      `.a { color: var(--fg); fill: currentColor; background: transparent; border-color: inherit;
            outline: none; mask: url(#mask); font-family: var(--font-sans); font: 600 1rem/1.2 var(--font-sans);
            background: color-mix(in oklab, var(--a), var(--b)); }
       .b { font-family: inherit; font: inherit; }`,
    );
    assert.deepEqual(rules, []);
  });

  it("flags the font shorthand with a raw family", async () => {
    assert.deepEqual(await lint(`.a { font: 600 1rem/1.2 Inter, sans-serif; }`), ["no-hardcode/font-family-tokens"]);
  });

  it("does not error on Tailwind v4 at-rules", async () => {
    const rules = await lint(
      `@import "tailwindcss";
       @reference "../app.css";
       @source "../components";
       @plugin "@tailwindcss/typography";
       @custom-variant dark (&:is(.dark *));
       @theme inline { --color-card: var(--card); }
       @utility tab-4 { tab-size: 4; }
       @layer base { body { @apply bg-background text-foreground; } }
       @variant hover { .x { color: var(--fg); } }`,
    );
    assert.deepEqual(rules, []);
  });

  it("flags arbitrary values inside @apply", async () => {
    assert.deepEqual(await lint(`.a { @apply p-4 bg-[#fff]; }`), ["no-hardcode/no-arbitrary-tailwind"]);
    assert.deepEqual(await lint(`.a { @apply w-[var(--w)]; }`), []);
  });

  it("lints <style> blocks of .astro, .vue and .html", async () => {
    for (const ext of ["astro", "vue", "html"]) {
      const rules = await lint(
        `<div></div>\n<style>\n.a { color: #fff; font-family: Inter; }\n</style>\n`,
        `/project/src/components/x.${ext}`,
      );
      assert.deepEqual(rules.sort(), ["color-no-hex", "no-hardcode/font-family-tokens"], ext);
    }
  });

  it("ignores default token files", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nh-"));
    const files = ["src/tokens/colors.css", "src/brand.tokens.css", "src/tenant-acme.css", "src/theme/tokens.css", "src/styles/tenant/a.css"];
    for (const f of files) {
      mkdirSync(join(dir, f, ".."), { recursive: true });
      writeFileSync(join(dir, f), `:root { --x: #fff; --f: Inter; } .a { color: red; font-family: Inter; }`);
    }
    mkdirSync(join(dir, "src/components"), { recursive: true });
    writeFileSync(join(dir, "src/components/a.css"), `.a { color: #fff; }`);
    const { results } = await stylelint.lint({ files: join(dir, "src/**/*.css"), config });
    const flagged = results.filter((r) => !r.ignored && r.warnings.length).map((r) => r.source);
    assert.deepEqual(flagged, [join(dir, "src/components/a.css")]);
  });

  it("reads noHardcode.allow / ignore from package.json", async () => {
    const dir = mkdtempSync(join(tmpdir(), "nh-"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ noHardcode: { allow: ["src/app/globals.css"], ignore: ["src/gen/**"] } }),
    );
    mkdirSync(join(dir, "src/app"), { recursive: true });
    mkdirSync(join(dir, "src/gen"), { recursive: true });
    writeFileSync(join(dir, "src/app/globals.css"), `@theme { --color-brand: #0d8275; }`);
    writeFileSync(join(dir, "src/gen/a.css"), `.a { color: #fff; }`);
    writeFileSync(join(dir, "src/b.css"), `.a { color: #fff; }`);
    const { results } = await stylelint.lint({ files: join(dir, "src/**/*.css"), config: createConfig({ cwd: dir }) });
    const flagged = results.filter((r) => !r.ignored && r.warnings.length).map((r) => r.source);
    assert.deepEqual(flagged, [join(dir, "src/b.css")]);
  });

  it("respects stylelint-disable comments", async () => {
    assert.deepEqual(await lint(`/* stylelint-disable-next-line color-no-hex */\n.a { color: #fff; }`), []);
  });
});
