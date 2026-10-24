# readme-pass: full README pass

Branch `readme-pass`, from main. Covers every `packages/*/README.md`, `apps/*/README.md` and a new root `README.md`.

## What was checked

- Relative links in all READMEs: no dead links.
- Every `@pureform/*` package and subpath named in a README exists in `package.json` exports (the `reset.css` hit is a CSS file, not a subpath).
- Every named import in README code blocks (68 import lines, all packages and apps) resolves against the built exports, via a scratch file per package (deleted). Names exist; full snippet bodies were not compiled.
- Searched for removed props (`listTokens`, `groupTokens`, `setTokens`, `pureformRn`, `binding-core/dom`, RN `inputProps`): remaining hits are current props (`searchBarProps`, `inputProps` on web `Field`) or the "there's no `inputProps`" note.
- Codegen text (`.pureform/<target>/full|pruned`, `targets`, `--prune`) in bundler, cli, generate already matched the code.
- `oxfmt --check` on all READMEs: clean.

## What changed

- `README.md` (root): new; packages table with links, getting started, codegen output.
- `packages/core`: bindings are no longer "planned".
- `packages/release`: `react-native` is in the Bindings group (matches `cog.toml`).
- `packages/preset`, `binding-core`, `react`, `solid`, `react-native`, `anatomy`, `generate`, `styling`: removed batch ids (c5b, c9c, p4a ...) and a link to a batch context.
- `apps/react-demo`: dropped the "waits for p5b" note; points to css-demo for theme switching.
- `docs/todo-later.md`: README pass entry removed.

## Uncertain / not done

- Section order is the same across react, solid and react-native (Where it sits, Architecture, Public API, Build and test, Worth knowing), but they don't have separate install, customization, platform or browser-support sections; `react-native` adds "Navigation variants" at the end. Restructuring ~1000-line READMEs was left out.
- Prop-level claims in the large component tables were spot-checked, not verified one by one.
- Packages without a README: `oxfmt-config`, `oxlint-config`, `tsconfig`, `type-utils`, `utils`, `vite-config`.
