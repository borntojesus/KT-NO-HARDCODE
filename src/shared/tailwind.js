/**
 * Tailwind class parsing for the "no arbitrary values" rule.
 *
 * A class like `md:hover:!-mt-[13px]` is split on `:` outside brackets and
 * parentheses; everything before the last part is a variant (variants may use
 * brackets freely: `data-[state=open]:`, `[&>svg]:`, `max-[600px]:`), only the
 * final utility is checked.
 */
import { findColorLiterals } from "./colors.js";

const ARBITRARY_VALUE_RE = /^[a-z][a-z0-9-]*-\[(.+)\](?:\/[\w.%\[\]()-]+)?$/;
const ARBITRARY_PROPERTY_RE = /^\[([a-z-]+):(.+)\](?:\/[\w.%\[\]()-]+)?$/;

/** Split on a separator character, ignoring separators inside [] and (). */
export function splitOutside(str, sep) {
  const parts = [];
  let depth = 0;
  let cur = "";
  let quote = null;
  for (const ch of str) {
    if (quote) {
      if (ch === quote) quote = null;
      cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') quote = ch;
    else if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  return parts;
}

/** The final utility of a class token, with `!` and negative `-` stripped. */
export function finalUtility(token) {
  const parts = splitOutside(token, ":");
  let util = parts[parts.length - 1];
  util = util.replace(/^!/, "").replace(/!$/, "").replace(/^-/, "");
  return util;
}

// Viewport units at 100 are "the whole screen", not a design value.
const FULL_VIEWPORT = /^100(?:vh|vw|dvh|dvw|svh|svw|lvh|lvw|%)$/;
const MATH_FNS = new Set(["calc", "min", "max", "clamp"]);

/**
 * True when the bracket content only references tokens:
 * - contains at least one `var(--name)` (no fallback, or a fallback that is itself var())
 * - everything else is calc/min/max/clamp, + - * / , ( ), unitless numbers,
 *   `0`, `100%` or a full-viewport unit (100vh, 100dvh, 100vw ...).
 * Raw lengths (px, rem, em, ...), colours, font names and keywords fail.
 */
export function isTokenOnlyValue(raw) {
  let v = raw.replace(/_/g, " ").trim();
  v = v.replace(/^[a-z-]+:(?=.*var\()/, ""); // type hint: `length:var(--x)`
  if (!v.includes("var(--")) return false;
  if (findColorLiterals(v).length) return false;
  // collapse var() calls, innermost first, so var(--a,var(--b)) also collapses
  let prev;
  do {
    prev = v;
    v = v.replace(/var\(\s*--[\w-]+\s*(?:,\s*V\s*)?\)/g, "V");
  } while (v !== prev);
  if (v.includes("var(")) return false; // var with a literal fallback
  const tokens = v.match(/[a-z]+(?=\()|[0-9.]+[a-z%]*|V|[()+\-*/,]|\S+/gi) ?? [];
  for (const t of tokens) {
    if (t === "V" || /^[()+\-*/,]$/.test(t)) continue;
    if (MATH_FNS.has(t.toLowerCase())) continue;
    if (/^[0-9.]+$/.test(t)) continue; // unitless number / multiplier
    if (FULL_VIEWPORT.test(t)) continue;
    return false;
  }
  return true;
}

/**
 * Inspect one class token. Returns null when fine, or
 * { kind: "value" | "property", utility } when it is a forbidden arbitrary value.
 */
export function checkClassToken(token) {
  if (!token || token.length < 4 || !token.includes("[")) return null;
  const util = finalUtility(token);
  let m = util.match(ARBITRARY_PROPERTY_RE);
  if (m) {
    return isTokenOnlyValue(m[2]) ? null : { kind: "property", utility: util };
  }
  m = util.match(ARBITRARY_VALUE_RE);
  if (m) {
    return isTokenOnlyValue(m[1]) ? null : { kind: "value", utility: util };
  }
  return null;
}

/** Check every whitespace-separated token in a string. */
export function findArbitraryClasses(str) {
  if (typeof str !== "string" || !str.includes("[")) return [];
  const out = [];
  for (const m of str.matchAll(/\S+/g)) {
    const hit = checkClassToken(m[0]);
    if (hit) out.push({ ...hit, token: m[0], index: m.index });
  }
  return out;
}
