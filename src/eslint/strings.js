/**
 * Shared string-visiting logic for the no-hardcode ESLint rules.
 * Visits every string Literal and template quasi, skipping places where a
 * string is a path or an identifier rather than styling.
 */

export const SKIP_ATTRIBUTES = new Set([
  "href",
  "id",
  "to",
  "htmlFor",
  "for",
  "xlinkHref",
  "xlink:href",
  "src",
  "srcSet",
  "action",
  "formAction",
  "key",
]);

export function attributeName(attr) {
  const n = attr && attr.name;
  if (!n) return null;
  if (n.type === "JSXIdentifier") return n.name;
  if (n.type === "JSXNamespacedName") return `${n.namespace.name}:${n.name.name}`;
  if (typeof n.name === "string") return n.name;
  return null;
}

const ATTRIBUTE_TYPES = new Set([
  "JSXAttribute",
  "AstroShorthandAttribute",
  "AstroTemplateLiteralAttribute",
]);

/** The JSX/Astro attribute a string value belongs to, if any (up to 2 levels). */
export function enclosingAttribute(node) {
  let cur = node.parent;
  for (let i = 0; i < 3 && cur; i++) {
    if (ATTRIBUTE_TYPES.has(cur.type)) return cur;
    if (cur.type !== "JSXExpressionContainer" && cur.type !== "TemplateLiteral") return null;
    cur = cur.parent;
  }
  return null;
}

/** True when the string is a module path or the value of a skipped attribute. */
export function isNonStylingString(node) {
  const target = node.type === "TemplateElement" ? node.parent : node;
  const p = target.parent;
  if (!p) return false;
  switch (p.type) {
    case "ImportDeclaration":
    case "ExportNamedDeclaration":
    case "ExportAllDeclaration":
    case "ImportExpression":
    case "ImportAttribute":
    case "TSExternalModuleReference":
    case "TSImportType":
    case "TSModuleDeclaration":
      return true;
    // Object keys are checked on purpose: clsx/cn/class:list objects use
    // class strings as keys ({ "bg-[#fff]": active }).
    case "CallExpression":
      if (p.callee.type === "Identifier" && p.callee.name === "require") return true;
      break;
    case "TSLiteralType":
      return false;
    default:
  }
  const attr = enclosingAttribute(target);
  if (attr && SKIP_ATTRIBUTES.has(attributeName(attr))) return true;
  return false;
}

/**
 * Build a visitor that calls `check(node, text)` for every styling string.
 */
export function stringVisitor(check) {
  return {
    Literal(node) {
      if (typeof node.value !== "string") return;
      if (isNonStylingString(node)) return;
      check(node, node.value);
    },
    TemplateElement(node) {
      const text = node.value.cooked ?? node.value.raw;
      if (!text) return;
      if (isNonStylingString(node)) return;
      check(node, text);
    },
  };
}
