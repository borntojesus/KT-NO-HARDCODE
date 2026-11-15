import stylelint from "stylelint";
import { findArbitraryClasses } from "../shared/tailwind.js";

const {
  createPlugin,
  utils: { report, ruleMessages },
} = stylelint;

const CSS_WIDE = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);
const SYSTEM_FONTS = new Set(["caption", "icon", "menu", "message-box", "small-caption", "status-bar"]);

function collapseVars(value) {
  let v = value;
  let prev;
  do {
    prev = v;
    v = v.replace(/var\(\s*--[\w-]+\s*(?:,\s*V\s*)?\)/g, "V");
  } while (v !== prev);
  return v;
}

/** font-family: only var(--token) or a CSS-wide keyword. */
export function isTokenFontFamily(raw) {
  const v = raw.replace(/!important/i, "").trim();
  if (CSS_WIDE.has(v.toLowerCase())) return true;
  return collapseVars(v) === "V";
}

/** font shorthand: a single var(), a keyword, or anything that ends in var(--family). */
export function isTokenFontShorthand(raw) {
  const v = raw.replace(/!important/i, "").trim();
  const lower = v.toLowerCase();
  if (CSS_WIDE.has(lower) || SYSTEM_FONTS.has(lower)) return true;
  return /(?:^|\s)V$/.test(collapseVars(v));
}

const fontRuleName = "no-hardcode/font-family-tokens";
const fontMessages = ruleMessages(fontRuleName, {
  rejected: (prop, value) =>
    `Raw font family in "${prop}: ${value}". Use a font token such as var(--font-sans).`,
});

const fontRule = (primary) => (root, result) => {
  if (!primary) return;
  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase();
    if (prop !== "font-family" && prop !== "font") return;
    const ok = prop === "font" ? isTokenFontShorthand(decl.value) : isTokenFontFamily(decl.value);
    if (ok) return;
    report({
      ruleName: fontRuleName,
      result,
      node: decl,
      message: fontMessages.rejected(decl.prop, decl.value),
      word: decl.value,
    });
  });
};
fontRule.ruleName = fontRuleName;
fontRule.messages = fontMessages;
fontRule.meta = { url: "https://github.com/borntojesus/KT-NO-HARDCODE#rules" };

const twRuleName = "no-hardcode/no-arbitrary-tailwind";
const twMessages = ruleMessages(twRuleName, {
  rejected: (token) => `Arbitrary Tailwind value "${token}" in @apply. Use a theme token utility.`,
});

const twRule = (primary) => (root, result) => {
  if (!primary) return;
  root.walkAtRules("apply", (atRule) => {
    for (const hit of findArbitraryClasses(atRule.params)) {
      report({
        ruleName: twRuleName,
        result,
        node: atRule,
        message: twMessages.rejected(hit.token),
        word: hit.token,
      });
    }
  });
};
twRule.ruleName = twRuleName;
twRule.messages = twMessages;
twRule.meta = { url: "https://github.com/borntojesus/KT-NO-HARDCODE#rules" };

export const fontFamilyPlugin = createPlugin(fontRuleName, fontRule);
export const arbitraryTailwindPlugin = createPlugin(twRuleName, twRule);

export default [fontFamilyPlugin, arbitraryTailwindPlugin];
