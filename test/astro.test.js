import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import * as astroParser from "astro-eslint-parser";
import "./setup.js";
import noColor from "../src/eslint/rules/no-color-literal.js";
import noTw from "../src/eslint/rules/no-arbitrary-tailwind.js";
import noFont from "../src/eslint/rules/no-raw-font-family.js";

const astro = new RuleTester({
  languageOptions: {
    parser: astroParser,
    parserOptions: { parser: tseslint.parser, extraFileExtensions: [".astro"], sourceType: "module" },
  },
});
const filename = "src/components/Hero.astro";
const v = (code) => ({ code, filename });
const bad = (code, messageId, n = 1) => ({
  code,
  filename,
  errors: Array.from({ length: n }, () => ({ messageId })),
});

astro.run("astro: no-arbitrary-tailwind", noTw, {
  valid: [
    v(`<div class="p-4 data-[state=open]:bg-accent" />`),
    v(`<div class:list={["p-4", { "w-[var(--w)]": true }]} />`),
  ],
  invalid: [
    bad(`<div class="p-[13px]" />`, "value"),
    bad(`<div class:list={["text-[14px]", { "border-[3px]": ok }]} />`, "value", 2),
    bad(`---\nconst c = "m-[2px]";\n---\n<div class={c} />`, "value"),
  ],
});

astro.run("astro: no-color-literal", noColor, {
  valid: [v(`<a href="#about">x</a>`), v(`<div style="color: var(--fg)" />`)],
  invalid: [
    bad(`<div style="color: #fff" />`, "color"),
    bad(`<path fill="#000" />`, "color"),
    bad(`---\nconst accent = "#ff0000";\n---\n<p>{accent}</p>`, "color"),
    bad(`<div class:list={[{ "bg-[#abc]": true }]} />`, "color"),
  ],
});

astro.run("astro: no-raw-font-family", noFont, {
  valid: [v(`<p style="font-family: var(--font-sans)" />`)],
  invalid: [
    bad(`<p style="font-family: Inter" />`, "font"),
    bad(`<p style={{ fontFamily: "Inter" }} />`, "font"),
  ],
});
