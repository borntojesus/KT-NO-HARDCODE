import rule from "../src/eslint/rules/no-raw-font-family.js";
import { tsx, err, file } from "./setup.js";

const v = (code) => ({ code, filename: file });
const bad = (code, n = 1) => ({ code, filename: file, errors: err("font", n) });

tsx.run("no-raw-font-family", rule, {
  valid: [
    v(`const s = { fontFamily: "var(--font-sans)" };`),
    v(`const s = { fontFamily: "var(--font-sans, var(--font-fallback))" };`),
    v(`const s = { fontFamily: "inherit" };`),
    v(`const s = { fontFamily: theme.fonts.sans };`),
    v(`const s = { fontFamily: fonts.mono };`),
    v(`const s = { fontFamily: FONT };`),
    v(`<text fontFamily="var(--font-mono)" />`),
    v(`const css = \`font-family: \${theme.font};\`;`),
    v(`const css = "font-family: var(--font-sans);";`),
    v(`const s = { fontWeight: "600", font: "inherit" };`),
  ],
  invalid: [
    bad(`const s = { fontFamily: "Inter" };`),
    bad(`const s = { fontFamily: "Inter, sans-serif" };`),
    bad(`const s = { "font-family": "Inter" };`),
    bad(`const s = { fontFamily: \`Inter\` };`),
    bad(`const s = { fontFamily: "var(--font-sans), Inter" };`),
    bad(`const s = StyleSheet.create({ t: { fontFamily: "Roboto-Bold" } });`),
    bad(`<div style={{ fontFamily: "Georgia" }} />`),
    bad(`<text fontFamily="Inter" />`),
    bad(`const Title = styled.h1\`font-family: Inter, sans-serif;\`;`),
    bad(`<div style="font-family: Inter" />`),
  ],
});
