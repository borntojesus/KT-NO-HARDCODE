import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

export const tsx = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

export const err = (messageId, n = 1) => Array.from({ length: n }, () => ({ messageId }));
export const file = "src/components/Thing.tsx";
