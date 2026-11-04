# Design: token, theme and @property pruning (F2)

Status: implemented (see "As built"). From `docs/todo-later.md` (Deferred designs). Facts about the current
code are cited by file.

## Where it stands

`narrowConfig` (`packages/generate/src/usage.ts`) narrows components, variant values and keyframes.
It leaves everything else in the config, so a pruned build still emits all of:

- every token var on `:root` (`tokenVars` in `packages/css-adapter/src/stylesheet.ts`),
- every named theme block (`themeRules`),
- every `@property` registration (`registeredProperties` in `packages/css-lowering/src/config.ts`),
  including those of components that were left out. That last one is the cheapest win:
  `registeredProperties` reads `config.components`, which `narrowConfig` has already narrowed, so
  **left-out components' `@property`s are already gone**. What stays is the tokens of kept components.

So the real work is the token tiers and themes.

## What can read a token at runtime

A token can be referenced from places a static scan of the config doesn't see:

1. **Components:** `AliasNode` paths (`{ type: "alias", path: [...] }`), plus inlined
   `tokenValue`s, including inside `conditional` and `dynamic` nodes (`dynamic.default`).
2. **Other tokens**: a semantic token aliasing a base token.
3. **Instance tokens:** `selection.tokens` becomes `instanceTokenVars`, whose var names derive from
   `["components", name, token]` or a `dynamic` node's own `path`.
4. **Themes:** a theme override (`ThemeOverride`) sets token vars and component token vars; a
   runtime theme (`styling-web/src/runtime-theme.ts`) is a `pf-<hash>` scope generated at runtime.
5. **App code and app CSS:** `var(--colors-primary)` in a user's own stylesheet, inline styles,
   Tailwind arbitrary values, or `tokenVarName(...)` built from a string.
6. **Springs:** `springTokenEntries` expands one spring token to several vars
   (`--springs-<role>-duration`, `-easing`); `instanceSpringVars` references the prefix only.

Items 5 and the string-built part of 3 and 6 can't be proven unused, so the pruner has to
treat them as keep.

## Proposal: reachability, conservative by default

Prune only what's provably unreachable; otherwise keep. Same stance as `keptKeyframes` ("errs
toward keeping").

1. **Roots** (always kept): every token referenced by a kept component's styles/tokens
   (alias walk, through `conditional`, `dynamic.default`, arrays and `inlineStyles`), every token a
   kept theme override _sets_, all `fonts`/`durations`/`easings`/`springs` roles reachable from
   kept components, plus anything on a user `keep` list.
2. **Closure:** follow token-to-token aliases until a fixed point.
3. **Prune** unreachable tokens in `tokens`, `semanticTokens`, `fonts`, `durations`, `easings`,
   `zIndices`, `springs`. Springs prune as a role (all of its vars together).
4. **Themes:** keep a named theme if the app might select it. A theme is selected by an attribute
   value, so it can't be known statically. Default keep; prune a theme only when a `themes: [...]`
   list (usage input) says which are used, and always drop the _tokens inside_ a kept theme that
   nothing reaches.
5. **@property:** emit a registration only for a token whose var is reachable (it already follows
   kept components; add the same reachability filter for tokens kept only by a `keep` list).
6. **Runtime themes** (`themeScope`) are generated at runtime from the _source config_, not the
   pruned stylesheet, so they can reference a pruned token. This is the main risk: either
   runtime-theme sources register the tokens they set as roots, or any app using
   `runtime-theme` turns token pruning off. Proposal: the latter first (safe, and explicit
   in the plugin's report), and the former as a follow-up.

## Escape hatches

- `usage.keepTokens: string[]` (globs over token paths: `colors.*`, `semanticTokens.surface.*`),
  next to `Usage.components`/`variants` in `packages/generate/src/usage.ts`.
- `usage.themes?: string[]`: undefined keeps all.
- A bundler-plugin option `pruneTokens: "off" | "safe"`, default **off** until the fixture
  proves it (below), then `"safe"`.
- Scan fallbacks: any app CSS/source reference to a `var(--…)` the scan can find is a root. The
  scan already reads JSX for variants; add a regex for `var(--<prefix>-…)` and
  `tokenVarName`/`tokens.` strings. A dynamic or unscannable file turns pruning off with a warning,
  like the existing dynamic `useClassFactory` rule.

## Where it goes

- `narrowConfig` gets a `tokens` step after keyframes (`keptTokens(config, narrowed, keep)`), sharing
  the substring-mention helper with keyframes for the text-based check, plus a structural alias walk
  for correctness (the substring check isn't enough for tokens: `colors.primary` is a prefix of
  `colors.primaryContainer`).
- CSS, Tailwind, Panda and RN adapters call `narrowConfig` already, so they inherit it. The RN
  precomputed tables read the same narrowed config. The token factory modules still read the whole
  config (documented in `narrowConfig`'s comment); that can stay, since they ship no CSS.
- The factory/`instanceTokenVars` path is the reason `selection.tokens` names must be roots: the
  var name derives from the component and token, so those component tokens (not alias targets) are
  kept for every kept component regardless of use.

## Verification

- Unit (`usage.spec.ts`): alias chains, conditional/dynamic defaults, springs (role atomic),
  prefix collision (`primary` vs `primaryContainer`), `keepTokens` globs, theme kept/dropped.
- Stylesheet spec (`stylesheet.spec.ts`): compare `compileCss(narrowConfig(...))` against the full
  build; every `var(--x)` in the pruned output must resolve to a declared var or a registered
  `@property` (a generic "no dangling var" assertion; it catches every missed root).
- Fixture app (p7 style): record sizes before/after.
- Browser e2e: the existing parity suite on a pruned build must match the unpruned one.

## Decisions (resolved)

- **Runtime themes:** disable token pruning when `runtime-theme` is in use (any import of it). The
  plugin reports why ("token pruning disabled: runtime-theme in use"). Registering runtime-theme
  sources as roots is a follow-up, only if it proves worth it.
- **`pruneTokens` default:** opt-in (`"off"`) for now. Promote `"safe"` to the default only when all
  hold: the savings are meaningful, the scan covers app CSS and source `var(--...)` references, and
  the parity e2e passes on at least one real app. The build logs what it did ("pruned N tokens
  (X KB)").
- **Payoff gate:** measuring is a go/no-go step before any pruning code. If tokens + themes +
  `@property` are under about 2-3 KB gzipped on a realistic fixture, skip Tier B and ship only
  Tier A.

## Tiers

- **Tier A (low risk):** `usage.themes` (drop unused named themes) and the `@property`
  reachability filter.
- **Tier B (higher risk):** token reachability and `keepTokens`, behind `pruneTokens`. Only if the
  measurement justifies it.

## Suggested order

1. Measure token/theme/`@property` bytes on a fixture; build the "no dangling var" test first.
2. Tier A.
3. Tier B, if the measurement passes the gate.

## Measurement

`compileCss(narrowConfig(pureform(), ["button"]))`: 13.2 KB gzipped, of which the `:root` token vars
are 9.0 KB (843 vars). The default preset has no named themes and 4 `@property` registrations, so
Tier A saves little here; Tier B is where the bytes are. The gate passed. With `pruneTokens`, the
button-only stylesheet is 8.1 KB gzipped (-39%); button + menu + textField 17.7 KB to 12.8 KB.

## As built

- `generate/src/tokens.ts`: `pruneConfigTokens`, called last by `narrowConfig(config, components,
  variants, pruning)`. `Usage` gains `themes`, `pruneTokens`, `keepTokens`, `appVars`; the codegen
  context carries them as `pruning`, and they're part of the output hash.
- Roots are the narrowed config outside the token tiers (components, keyframes, utilities,
  `componentBaseStyles`, theme component overrides). The closure follows aliases through tokens
  and text styles, and any `var(--name)` in the config or in `appVars` (matched as text, so it errs
  toward keeping).
- Unreached **text styles are pruned too**: `validateConfig` walks them, and a text style
  aliasing a pruned token would fail the build. A style is kept when a reached node aliases it.
- **Springs always stay** (an instance names a spring role at runtime), as does any scale of a
  scale-bound utility.
- **The `@property` filter is a no-op**: registrations are component tokens, not tier tokens, and
  left-out components' are already gone. Nothing to add.
- Only the CSS adapter applies it. Tailwind (class names in markup reach tokens) and native (theme
  values are read at runtime) don't.
- Plugin: `prune.tokens: "safe" | "off"` (default `"off"`), `prune.themes`, `prune.keepTokens`.
  `"safe"` also scans the app's scripts, styles and markup for `--name` references (`appVars`), and
  turns itself off, with a warning, when a file uses `runtime-theme`, builds custom property names at runtime (`` `--${name}` ``), or can't be read.
- Known limit: `usesColorScheme` reads the semantic tokens, so a build that prunes every
  scheme-conditional semantic token also drops the root `color-scheme`. A kept component that
  uses a conditional color keeps it.
- Report: `GenerateResult.tokenPruning` has token entries and named themes, kept of total, for
  the CSS adapter only (it computes them by running `narrowConfig` again, which is cheap). The
  plugin's pruning line appends it: `; kept 312 of 843 tokens, 2 of 4 themes`, naming only what
  was dropped. Counts only, not bytes: the stylesheet is built inside the adapter.
