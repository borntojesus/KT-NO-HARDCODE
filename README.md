# no-hardcode

No hardcode, checked by the machine. Components use semantic token roles only:
colours, spacing, radii, type sizes and font families come from design tokens,
never from literals typed into a component. This package is the shared lint for
that rule: an ESLint plugin, a stylelint config and a CLI for CI.

## Why

A component that says `bg-[#0d8275]` or `fontFamily: "Inter"` cannot be
re-themed, cannot follow a tenant palette and drifts from the design system the
day it is written. If tokens are the only source of values, swapping a theme or
a design system is a token-file change, not a hunt through components.

## What it forbids

| Rule | Where | Fails on |
| --- | --- | --- |
| `no-hardcode/no-color-literal` | JS/TS/JSX/TSX/Astro strings and template literals | hex (`#fff`, `#0d8275`, `#rrggbbaa`), `rgb() rgba() hsl() hsla() oklch() oklab() lab() lch() hwb() color()` in classNames, style objects, SVG `fill`/`stroke`, chart colour props, RN `StyleSheet.create` |
| `no-hardcode/no-arbitrary-tailwind` | same | arbitrary values `bg-[#123456]`, `p-[13px]`, `rounded-[6px]`, `text-[14px]`, `font-['Inter']`, `w-[37rem]`, arbitrary properties `[mask-type:luminance]` |
| `no-hardcode/no-raw-font-family` | same | `fontFamily: "Inter"`, `<text fontFamily="Inter">`, `font-family: Inter` inside CSS-in-JS strings |
| `color-no-hex`, `function-disallowed-list`, `color-named: never` | CSS and `<style>` in `.astro` `.vue` `.html` `.svelte` | hex, colour functions, named colours (`red`) |
| `no-hardcode/font-family-tokens` (stylelint) | same | `font-family` / `font` with anything but `var(--…)` or a CSS-wide keyword |
| `no-hardcode/no-arbitrary-tailwind` (stylelint) | same | arbitrary values inside `@apply` |

Fine everywhere: `currentColor`, `transparent`, `inherit`, `none`, `var(--x)`,
`color-mix()` over tokens, theme utilities (`bg-card`, `p-4`), Tailwind v4
token shorthand `bg-(--brand)`, theme objects (`fontFamily: theme.fonts.sans`).

Not false positives: `href="#about"` and other anchors (attributes `href`, `id`,
`to`, `htmlFor`, `for`, `xlinkHref`, `xlink:href`, `src`, `srcSet`, `action`,
`formAction`, `key` are skipped), import/export/require sources, URL fragments
(`/#abc`), HTML entities (`&#123;`), words like `issue#123`. A hex match must be a
standalone colour token. Named colours are only checked in CSS, not in JS.

### Tailwind classes, how they are parsed

Every string literal and template quasi is split on whitespace (this covers
`className`, `class`, `class:list`, `cn()`, `clsx()`, `cva()`, `tv()` objects and
object keys). For each token the important `!` (prefix or v4 suffix) and the
negative `-` are stripped and variants are split on `:` outside brackets. Only the
final utility is checked, and only if it looks like Tailwind:
`^[a-z][a-z0-9-]*-\[.+\]$` or `^\[[a-z-]+:.+\]$`. Variants with brackets are
fine: `data-[state=open]:`, `[&>svg]:`, `group-data-[x]:`, `aria-[…]:`,
`supports-[…]:`, `max-[600px]:`.

### Arbitrary values that reference tokens are allowed

An arbitrary value (or arbitrary property value) passes when it only references
tokens:

- it contains at least one `var(--name)`; a fallback is allowed only if it is
  itself a `var()`: `var(--a,var(--b))` passes, `var(--a,12px)` fails;
- the rest is `calc` / `min` / `max` / `clamp`, operators, parentheses, commas,
  unitless numbers (`*2`, `*-1`), `0`, `100%` and full-viewport units
  (`100vh`, `100dvh`, `100svh`, `100lvh`, `100vw`, …);
- an optional type hint is fine: `text-[length:var(--step-1)]`.

So `w-[var(--sidebar-width)]`, `h-[calc(100vh-var(--header))]`,
`max-w-[min(100%,var(--content))]` and `[--x:var(--y)]` pass, while
`w-[calc(var(--a)+4px)]`, `h-[calc(50vh-var(--a))]` and `[--sidebar:16rem]` fail.
Prefer the v4 shorthand `w-(--sidebar-width)` where it works.

## Install

```sh
pnpm add -D "no-hardcode@github:borntojesus/KT-NO-HARDCODE#v0.1.0"
```

Node 22.5+. The package ships ESLint 10, stylelint 17, `typescript-eslint`
(parser) and `postcss-html`, so the CLI works without anything else installed.
For `.astro` scripts and markup add `astro-eslint-parser` (and usually
`eslint-plugin-astro`) to the project; without them `.astro` `<style>` blocks are
still checked.

## Usage

### CI (the part that enforces it)

```sh
pnpm exec no-hardcode            # whole project
pnpm exec no-hardcode src app    # or specific paths
```

It runs only these rules, independent of the project's own `eslint.config` and
stylelint config, prints `file:line:col message [rule]` and exits 1 on any
finding. GitHub Actions step:

```yaml
- run: pnpm exec no-hardcode
```

Always skipped: `node_modules`, `.next`, `dist`, `build`, `out`,
`storybook-static`, `public`, `.astro`, `coverage`, `.turbo`, `.vercel`,
`.netlify`, lockfiles.

### ESLint (editor feedback), `eslint.config.mjs`

```js
import noHardcode from "no-hardcode/eslint";

export default [
  // ...your configs
  ...noHardcode.configs.recommended, // **/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}
  ...noHardcode.configs.astro,       // **/*.astro, after eslint-plugin-astro's config
];
```

Named exports from `no-hardcode/eslint`: `plugin` (default), `rules`, `configs`,
`recommended`, `astro`, `createRecommended({ cwd })`, `createAstroConfig({ cwd, parser })`.
Rule ids: `no-hardcode/no-color-literal`, `no-hardcode/no-arbitrary-tailwind`,
`no-hardcode/no-raw-font-family`. Works with ESLint 9 and 10 flat config.

### stylelint, `.stylelintrc.json`

```json
{ "extends": ["no-hardcode/stylelint"] }
```

Combine with `stylelint-config-standard` by listing it first. Our config does
not touch at-rules, so Tailwind v4 `@theme`, `@custom-variant`, `@apply`,
`@utility`, `@source`, `@plugin`, `@reference` never error from it; if another
config enables `at-rule-no-unknown`, the list is exported as
`TAILWIND_AT_RULES` from `no-hardcode/stylelint`. `.astro`, `.vue`, `.html` and
`.svelte` files get `postcss-html` as their syntax automatically.

## Token files and the `noHardcode` key

Token files are where literals live, so they are allowed by default:

```
**/tokens/**
**/*.tokens.{css,ts,js,mjs,json}
**/tenant*.{css,ts,js,json}
**/theme/tokens*
**/styles/tenant/**
```

Extend per project in `package.json` (globs relative to that package.json):

```json
{
  "noHardcode": {
    "allow": ["src/app/globals.css"],
    "ignore": ["src/generated/**", "storybook-static/**"]
  }
}
```

- `allow`: files that may contain literals (token definitions). A Tailwind v4
  `globals.css` with `@theme { --color-brand: #0d8275; }` usually goes here.
- `ignore`: files not linted at all (generated code, vendored files).

The CLI, `configs.recommended` and the stylelint config all read the nearest
`package.json` from the working directory.

For a rare, justified exception use the usual comments:

```tsx
{/* eslint-disable-next-line no-hardcode/no-color-literal -- brand-mandated logo colour */}
```

```css
/* stylelint-disable-next-line color-no-hex -- third-party embed */
```

## Release

1. Change code, `pnpm test` green.
2. Bump `version` in `package.json` (semver), commit `chore(release): vX.Y.Z`.
3. `git tag vX.Y.Z && git push && git push origin vX.Y.Z`.
4. Consumers bump the ref: `pnpm add -D "no-hardcode@github:borntojesus/KT-NO-HARDCODE#vX.Y.Z"`.

Tags are immutable; never move a published tag.

## License

MIT, Dmytro Antonyuk.
