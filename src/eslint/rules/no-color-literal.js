import { findColorLiterals } from "../../shared/colors.js";
import { stringVisitor } from "../strings.js";

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid colour literals (hex, rgb(), hsl(), oklch(), ...) in components; use semantic token roles.",
    },
    schema: [],
    messages: {
      color:
        "Colour literal '{{text}}' in a component. Use a semantic token (var(--role), a token class or a theme value) instead.",
    },
  },
  create(context) {
    return stringVisitor((node, text) => {
      const seen = new Set();
      for (const hit of findColorLiterals(text)) {
        if (seen.has(hit.text)) continue;
        seen.add(hit.text);
        context.report({ node, messageId: "color", data: { text: hit.text } });
      }
    });
  },
};
