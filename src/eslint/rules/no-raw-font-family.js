import { attributeName, isNonStylingString } from "../strings.js";

const CSS_WIDE = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);

/** A font-family value is fine when it is only var(--token) (nested var fallbacks ok) or a CSS-wide keyword. */
export function isTokenFontFamily(raw) {
  let v = String(raw).replace(/!important/i, "").trim();
  if (CSS_WIDE.has(v.toLowerCase())) return true;
  let prev;
  do {
    prev = v;
    v = v.replace(/var\(\s*--[\w-]+\s*(?:,\s*V\s*)?\)/g, "V");
  } while (v !== prev);
  return v === "V";
}

const CSS_DECL_RE = /(?<![\w-])font-family\s*:\s*([^;}"'`]*)/gi;

function keyName(prop) {
  if (prop.computed) return null;
  if (prop.key.type === "Identifier") return prop.key.name;
  if (prop.key.type === "Literal") return String(prop.key.value);
  return null;
}

function staticString(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
  }
  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid raw font families (fontFamily: 'Inter', font-family: Inter); use a font token such as var(--font-sans).",
    },
    schema: [],
    messages: {
      font: "Raw font family '{{value}}'. Use a font token such as var(--font-sans) or a theme value.",
    },
  },
  create(context) {
    const reported = new Set();
    const report = (node, value) => {
      if (reported.has(node)) return;
      reported.add(node);
      context.report({ node, messageId: "font", data: { value: value.trim().slice(0, 60) } });
    };
    const checkCssText = (node, text) => {
      if (!text || !/font-family/i.test(text)) return;
      if (isNonStylingString(node)) return;
      for (const m of text.matchAll(CSS_DECL_RE)) {
        const value = m[1].trim();
        if (!value) continue; // value comes from an interpolation
        if (!isTokenFontFamily(value)) report(node, value);
      }
    };
    return {
      Property(node) {
        const name = keyName(node);
        if (name !== "fontFamily" && name !== "font-family") return;
        const value = staticString(node.value);
        if (value !== null && !isTokenFontFamily(value)) report(node.value, value);
      },
      JSXAttribute(node) {
        const name = attributeName(node);
        if (name !== "fontFamily" && name !== "font-family") return;
        let v = node.value;
        if (v && v.type === "JSXExpressionContainer") v = v.expression;
        const value = staticString(v);
        if (value !== null && !isTokenFontFamily(value)) report(v, value);
      },
      Literal(node) {
        if (typeof node.value === "string") checkCssText(node, node.value);
      },
      TemplateElement(node) {
        checkCssText(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};
