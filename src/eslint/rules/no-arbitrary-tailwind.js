import { findArbitraryClasses } from "../../shared/tailwind.js";
import { stringVisitor } from "../strings.js";

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid arbitrary Tailwind values (p-[13px], bg-[#123], [mask-type:luminance]); token-only values like w-[var(--sidebar)] are allowed.",
    },
    schema: [],
    messages: {
      value:
        "Arbitrary Tailwind value '{{token}}'. Use a theme token utility, or reference a token: '{{prefix}}-(--token)' / '{{prefix}}-[var(--token)]'.",
      property:
        "Arbitrary Tailwind property '{{token}}'. Add a utility or token in the theme instead of an inline property.",
    },
  },
  create(context) {
    return stringVisitor((node, text) => {
      for (const hit of findArbitraryClasses(text)) {
        const prefix = hit.utility.slice(0, hit.utility.indexOf("-["));
        context.report({
          node,
          messageId: hit.kind,
          data: { token: hit.token, prefix: prefix || "utility" },
        });
      }
    });
  },
};
