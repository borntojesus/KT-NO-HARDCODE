# KT-NO-HARDCODE

Shared "no hardcode" lint for the fleet: ESLint plugin + stylelint config + CLI
(`no-hardcode`). Public on purpose (consumed as a git dependency from Docker/CI),
so no private data here.

- **Stack:** plain ESM JS, no build. Node >= 22.5, pnpm 11 only.
- **Consumers:** `pnpm add -D "no-hardcode@github:borntojesus/KT-NO-HARDCODE#vX.Y.Z"`, CI runs `pnpm exec no-hardcode`.

## Commands

```sh
pnpm install
pnpm test                              # node:test: RuleTester, stylelint lint(), CLI on fixtures/
node bin/no-hardcode.js fixtures/bad   # exits 1
node bin/no-hardcode.js fixtures/good  # exits 0
```

Release: bump `version`, commit, `git tag vX.Y.Z`, push the tag. Never move a tag.

## Layout

- `src/shared/` colour regexes, Tailwind class parsing (`isTokenOnlyValue`), `noHardcode` package.json key, project-relative import.
- `src/eslint/` plugin, rules, `configs.recommended` / `configs.astro`.
- `src/stylelint/` shareable config + plugin (font-family tokens, `@apply` arbitrary values).
- `src/cli.js` walks files, runs ESLint (`overrideConfigFile: true`) and stylelint with only our rules.

## Gotchas

- stylelint resolves relative `ignoreFiles` against the config file's dir (inside node_modules), so default allow globs are written as `/**/tokens/**`; project globs are joined to the project root.
- `customSyntax` is passed as the imported `postcss-html` module, not a string, so it resolves from this package.
- `astro-eslint-parser` only has an `import` export: `require.resolve` fails, use `src/shared/resolve.js`.
- `typescript-eslint` 8 supports TypeScript < 6.1, so `typescript` is pinned `~6.0`.
- Object keys are checked on purpose (clsx/cn/class:list keys are class strings).
- In `.astro` an inline `style="color:#fff"` is reported twice by the CLI (ESLint string + stylelint postcss-html); harmless.
