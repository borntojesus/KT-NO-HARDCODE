/** Colour-literal detection shared by the ESLint rules. */

export const COLOR_FUNCTIONS = [
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "oklch",
  "oklab",
  "lab",
  "lch",
  "hwb",
  "color",
];

// A hex colour as a standalone token: not glued to a word, a path, an entity
// (`&#123;`) or a URL fragment (`/#abc`). 3, 4, 6 or 8 hex digits.
const HEX_RE = /(?<![\w#&/.\-$@])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;
const FN_RE = new RegExp(`(?<![\\w-])(${COLOR_FUNCTIONS.join("|")})\\(`, "gi");

/**
 * Find colour literals in a string. Returns [{ index, text }].
 */
export function findColorLiterals(str) {
  const out = [];
  if (typeof str !== "string" || str.length < 4) return out;
  for (const m of str.matchAll(HEX_RE)) out.push({ index: m.index, text: m[0] });
  for (const m of str.matchAll(FN_RE)) out.push({ index: m.index, text: `${m[1]}()` });
  return out.sort((a, b) => a.index - b.index);
}
