import { describe, it } from "node:test";
import assert from "node:assert/strict";
import plugin, { configs, rules, recommended, astro } from "no-hardcode/eslint";
import stylelintConfig from "no-hardcode/stylelint";
import { checkClassToken, isTokenOnlyValue, finalUtility } from "../src/shared/tailwind.js";

describe("exports", () => {
  it("eslint plugin shape", () => {
    assert.deepEqual(Object.keys(rules).sort(), ["no-arbitrary-tailwind", "no-color-literal", "no-raw-font-family"]);
    assert.equal(plugin.meta.name, "no-hardcode");
    assert.equal(configs.recommended, recommended);
    assert.equal(configs.astro, astro);
    assert.ok(Array.isArray(recommended) && recommended[0].plugins["no-hardcode"] === plugin);
    assert.deepEqual(astro[0].files, ["**/*.astro"]);
    assert.ok(recommended[0].ignores.includes("**/tokens/**"));
  });
  it("stylelint config shape", () => {
    assert.equal(stylelintConfig.rules["color-no-hex"], true);
    assert.equal(stylelintConfig.rules["color-named"], "never");
    assert.ok(stylelintConfig.ignoreFiles.includes("/**/tokens/**"));
  });
});

describe("tailwind parsing", () => {
  it("final utility strips variants, ! and -", () => {
    assert.equal(finalUtility("md:hover:!-mt-[13px]"), "mt-[13px]");
    assert.equal(finalUtility("data-[state=open]:bg-accent"), "bg-accent");
    assert.equal(finalUtility("[&>svg:hover]:size-4"), "size-4");
    assert.equal(finalUtility("-mt-[2px]!"), "mt-[2px]");
  });
  it("token-only values", () => {
    for (const ok of ["var(--a)", "calc(100vh-var(--h))", "calc(var(--a)*-1)", "min(100%,var(--w))", "length:var(--x)", "var(--a,var(--b))", "calc(100dvh_-_var(--h))"]) {
      assert.equal(isTokenOnlyValue(ok), true, ok);
    }
    for (const no of ["13px", "#fff", "var(--a,12px)", "calc(var(--a)+4px)", "calc(50vh-var(--a))", "'Inter'", "luminance", "var(--a)_#fff"]) {
      assert.equal(isTokenOnlyValue(no), false, no);
    }
  });
  it("only Tailwind-looking tokens are checked", () => {
    assert.equal(checkClassToken("a[0]"), null);
    assert.equal(checkClassToken("[x]"), null);
    assert.equal(checkClassToken("max-[600px]:hidden"), null);
    assert.equal(checkClassToken("bg-(--brand)"), null);
    assert.deepEqual(checkClassToken("p-[13px]"), { kind: "value", utility: "p-[13px]" });
  });
});
