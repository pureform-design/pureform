# p4b-rn: React Native adapter codegen (output context)

Commits: 55f575c..6bcbc77, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                          |
| --------- | --------------------------------------------------------------------------------------------- |
| `55f575c` | `feat(rn-adapter)`: the `/factory` and `/codegen` subpaths, `splitPrecomputed`, specs, README |
| `574856d` | `refactor(rn-adapter)`: the hooks select through the component's factory                      |
| `6bcbc77` | `docs(design)`: "Built (p4b-rn)" in §5.2, and a note under §5.4                               |

## Built

### `@pureform/rn-adapter/factory` (`packages/rn-adapter/src/factory.ts`)

New subpath (runtime: imports `@pureform/styling`, `resolve.ts`, `select.ts`; no React, no
lowering, no chroma). New dependency `@pureform/styling` (`catalog:`).

```ts
interface AnyComponent {
    variants: Record<string, string>;
    slots: string;
    states: ComponentState;
    tokens: string;
}
interface NativeSlot extends SlotStyle<Style, Drawing> {
    readonly style: Style;
    readonly drawing?: Drawing; // only with svg
    readonly transitions: readonly Transition[]; // a token's own under `$token:<key>`
    readonly animation?: Animation;
    readonly parent?: string;
}
type NativeSlots<C extends ComponentRef> = {
    readonly [S in SlotOf<C>]: NativeSlot;
}; // no slots → root
type NativeSelection<C extends ComponentRef> = Selection<C> & States<C>;
interface Environment {
    theme?: string;
    scheme?: Scheme /* "light" */;
    overrides?: Overrides;
    svg?: boolean;
    width?: number;
    containers?: Readonly<Record<string, number>>;
}
interface NativeStyleFactory<C> {
    (selection: NativeSelection<C>): NativeSlots<C>;
    selected(selection: NativeSelection<C>): Selected; // the hooks' shape; "" for no slots
}
interface NativeFactory<
    C extends ComponentRef = AnyComponent,
> extends NativeStyleFactory<C> {
    readonly component: string;
    readonly styles: Styles;
    readonly order: SelectionOrder;
    for(environment?: Environment): NativeStyleFactory<C>; // one per environment
}
const nativeFactory: <C extends ComponentRef = AnyComponent>(
    component: string,
    styles: Styles /* precomputed or runtime */,
    tokens?: Readonly<Record<string, string>>, // instance token → theme key
) => NativeFactory<C>;
const componentFactory: (styles: Styles, component: string) => NativeFactory; // one per styles + name
const selectionOrder: (
    component: ComponentStyles<unknown>,
) => SelectionOrder & { states: readonly string[]; bounds: readonly string[] };
// re-exported types: Overrides, PrecomputedStyles, RuntimeStyles, Styles, Drawing, Selected,
// State, Style, Scheme, Animation, Concrete, ThemeValues, Transition, Value
```

- **Key:** `selectionCache` from `@pureform/styling` with `selectionOrder`: groups =
  `Object.keys(component.variants)`, defaults = `defaultVariants`, states = every `when` name in
  the rules, minus width/container bounds, `svg`, `light`/`dark` (environment), and names equal
  to a group; `ltr` becomes `rtl`. Ordered hover, focus, focusVisible, active, pressed,
  dragged, disabled, selected, checked, indeterminate, invalid, readOnly, filled, expanded,
  mirrored, rtl, reducedMotion, then others alphabetically.
- **Compute:** exactly what `useSelected` did: `selectWithTransitions` over
  `resolvedWith(styles, key, overrides)[name]` with `{ scheme, svg, width?, containers?,
...states }`, then `withSetTokens`. Results are deep-frozen; `{ selected, slots }` are computed
  together.
- **Environments:** `for(env)` keys a table by theme key, scheme, svg, the bits of
  `order.bounds` that hold for `width`/`containers`, and `JSON.stringify(overridesFor(env.overrides,
scheme))`; up to 64 per factory, then it starts again.
- **Instance tokens:** `selection.tokens` (names mapped through `tokens`, unknown names taken as
  theme keys, `{ light, dark }` per scheme accepted) resolve the component again with
  `stylesFor(..., { ...overrides, ...tokens })` and pass `tokens` to `withSetTokens`, as the hook
  did; cached per selection key and tokens JSON (64, then cleared). Empty `tokens` is the plain
  path.

### `@pureform/rn-adapter/codegen` (`packages/rn-adapter/src/codegen.ts`)

New subpath, `lib.entry.codegen`; dependency `@pureform/generate` (`catalog:`) in
`package.json`, `project.omni.yaml` (also `@pureform/styling`), and `bun.lock` (by hand, two
lines; `bun install --frozen-lockfile` reports no changes). `generate({ target: "native" })`
resolves it from `dist` (checked by hand from `apps/rn-web-demo`'s root).

```ts
type RnCodegenOptions = Omit<BuildOptions, "components">; // target, remBase, fontStack, themes, schemes
const codegen: CodegenAdapter<RnCodegenOptions>; // name "native", platform "native"; also default
const THEMES_FILE = "native/theme-values.ts"; // "-" keeps it off any component's path
const instanceTokenKeys: (
    name,
    spec: AnyComponentSpec,
) => Record<string, string>; // dynamic path joined by ".", else components.<name>.<token>
const factoryModule: (input: {
    name;
    styles: PrecomputedStyles;
    tokens;
}) => string;
const themesModule: (styles: PrecomputedStyles) => string;
```

Plus `splitPrecomputed(styles): Record<string, PrecomputedStyles>` in the root entry
(`build.ts`): each component's templates, values sliced per theme, its own `dependents`; the
`themes`/`formulas` objects shared. Equal to `precompute(config, { components: [name] })`
(tested for every preset component). `resolvedWith`, `holds`, and `BOUND` are now exported from
`resolve.ts`/`select.ts` (not from the root entry).

Output, for `precompute(config, { ...options, components })`:

```ts
// native/linearProgress.ts
import { nativeFactory } from "@pureform/rn-adapter/factory";
import type { NativeFactory, PrecomputedStyles } from "@pureform/rn-adapter/factory";

import { formulas, themes } from "./theme-values";

const data: Pick<PrecomputedStyles, "templates" | "values" | "dependents"> =
    JSON.parse("…"); // this component's split styles

const tokens = { value: "components.linearProgress.value", … } as const; // only with tokens

export const linearProgress: NativeFactory<"linearProgress"> = nativeFactory(
    "linearProgress",
    { mode: "precomputed", themes, formulas, ...data },
    tokens,
);

// native/theme-values.ts
export const themes: Record<string, ThemeValues> = JSON.parse("…");
export const formulas: Record<string, Record<string, Value>> = JSON.parse("…");
```

Each `ComponentModule` returns `shape: { ...context.shape(name), states: selectionOrder(...).states }`,
so `registry.d.ts` declares e.g. `button.states: "hover" | "focusVisible" | "pressed" | "dragged"
| "disabled" | "mirrored" | "rtl"`. The preset's modules total 2.7 MB (`iconButton` 0.4 MB);
generating them takes about 0.2 s.

### The hooks (`react.ts`)

`useSelected` (behind `useComponentState`, `useComponentStyles`, `useAnimatedComponentStyles`,
`useReanimatedComponentStyles`) now does
`componentFactory(context.styles, name).for({ theme, scheme, overrides, svg, width, containers })
.selected({ reducedMotion, ...states, ...variants, tokens })`, then `slowed` for `timeScale`.
The context gained `theme`; the provider resolves with `resolvedWith` (the cache the factories
share). `useMovingTokens` is unchanged: each tween frame is a `tokens` selection.

### What it replaced

Nothing is removed. The codegen **succeeds** precomputing the whole config at build time
(`*.pureform.ts` through `withPureform`'s Metro transformer, or rn-web-demo's
`virtual:pureform-rn`): the same precomputed data, split per component, behind a registry entry
and `ComponentRegistry` types. `precompute`, `runtimeStyles`, `withPureform`, and the provider
taking `styles` are unchanged; rn-web-demo still uses them (p8 moves it).

### Equivalence

- `src/factory.spec.ts`: for every preset component, each group's values one at a time × no
  state, each read state alone, all of them × light and dark × with and without SVG (over 10,000
  selections), the factory over the split styles and `componentFactory` over the whole equal the
  previous hook computation (`withSetTokens(selectWithTransitions(stylesFor(...)))`) as JSON;
  each instance token moved off its theme value equals the previous token path. A small config
  covers themes, overrides, `rtl`, a container and a viewport bound, per-scheme tokens, runtime
  styles.
- `src/codegen.spec.ts`: generates the preset's glue into a temp app (`node_modules/@pureform/
{styling,rn-adapter}` linked), imports `index.ts`, and for every combination of every group's
  values (over 40,000) compares each generated factory with `nativeFactory` over the whole
  precomputed styles; states, schemes, SVG, instance tokens; a lazy entry; `--check` ok; and
  runs TypeScript 7's `tsc` on an app using `registry.entry("button").factory.for(...)`, with
  `@ts-expect-error`s for a wrong variant, an unread state, and a wrong slot.
- By hand: the rn-web-demo's config (35 components, both themes, both schemes, SVG, container
  widths 200/400, a primary override): 143,280 selections, 0 differences.
- Chromium (`tests/browser-e2e-tests`, React Native Web through the hooks): 440 of 441 before
  and after, with the identical 99 differences in the pre-existing rn-parity "every variant
  value at rest" case; rn-motion (token tweens), visual screenshots, direction, reduced motion
  pass.

## Deviations from the design

- **The theme is the environment, not the selection.** §5.1's `StyleFactory` reads only its
  selection, but native styles depend on the provider's theme, scheme, overrides, SVG drawing,
  and widths. Calling the factory is the base theme's light scheme; `factory.for(environment)`
  gives the factory for any other (one table each). Recorded in §5.2.
- **Lazily filled cache, not a table written out** (§5.2's `table.get(...)`): the module carries
  the component's precomputed styles and selects on a key's first lookup (§2's "the cache fills
  lazily"). No per-variant fragments (§5.4): nothing stores a product. Recorded in §5.2, §5.4.
- **Slots carry more than `{ style, drawing }`**: `transitions`, `animation`, `parent`, which
  token tweening and the animated hooks need. `NativeSlots<C>` is assignable to
  `StyleSlots<C, Style, Drawing>`.
- **Data as `JSON.parse("…")`**, not object literals: faster to parse, and TypeScript doesn't
  infer a 0.4 MB literal.
- **Hook edge cases** (no caller hits them): a missing `rtl` now counts as left to right (the key
  holds it as a bit), which only matters to a config with an `ltr` condition (none have one);
  a `scheme` in a hook's `state` now picks that scheme's theme values too, not only its
  conditions; a state named like a group of the same component is the group's.

## Stubs and gaps

- **No app uses the generated modules yet.** rn-web-demo still precomputes in its Vite plugin
  and passes `styles` to `PureformProvider`; p8 builds `@pureform/react-native`'s provider and
  `useStyles`/`useStyleFactory` over the registry and moves the demo.
- **No pruning of states or variants** in the generated data: the allow-list narrows
  components only (p7).
- **`useTokens()` and the provider still need the whole `Styles`** (theme values, formulas).
  A registry-based provider can take `themes`/`formulas` from `native/theme-values.ts` (or any
  factory's `styles.themes`), see the notes.

## How to verify

- `task_run` `build` and `test:unit` on `@pureform/rn-adapter`: 320 tests pass, with type checks
  (`factory.spec.ts`, `codegen.spec.ts`, and the existing `react.spec.ts`, now through the
  factory). Workspace `test:unit` passes.
- `task_run` `test:e2e` on `@pureform/browser-e2e-tests`: 440 of 441, the failure being the
  pre-existing rn-parity case with the same 99 differences.
- `task_run` `build` on `@pureform/rn-web-demo`: builds.
- By hand: from `apps/rn-web-demo`, `generate({ root, config, target: "native", options: {
fontStack: "all" } })` writes 36 `native/` files, `index.ts`, `registry.d.ts`.

## Notes for the next phases

- **p8 (`@pureform/react-native`):**
    - The registry entries are `NativeFactory<"name">`s. `useStyleFactory(name)` returns the entry's
      factory; `useStyles(name, selection)` is `factory.for(environment).selected(...)` (or the
      call itself for `NativeSlots`) with the provider's environment memoized:
      `{ theme, scheme, overrides, svg, width, containers }`. Copy rn-adapter's `useSelected`
      (`react.ts`) for the shape: merge `{ reducedMotion, ...states, ...variants, tokens }`, then
      `slowed` for `timeScale`, and wrap `useMovingTokens` as `useComponentState` does (it reads
      `tokenTransitions(selected.transitions, reducedMotion)`).
    - Instance tokens are `selection.tokens` by the component's token name (`{ value: 40 }`); the
      module maps them to theme keys.
    - Pass `rtl` (from `I18nManager` / the provider's `dir`) and `reducedMotion` (from
      `AccessibilityInfo`) in every selection; declared `states` list only what each component
      reads, so a typed hook adds them internally.
    - The provider's `useTokens()` and overrides' derived tokens need the theme values and
      formulas: import `themes`/`formulas` from `.pureform/native/theme-values` or read
      `factory.styles.themes`/`.formulas`.
    - A lazy entry's `load()` resolves to the factory; `for()` works the same.
    - `pressableState` gives `focus` and `active`; a component's declared states may not include
      them, which TypeScript rejects in an object literal for a registered component.
- **p4c-bundler / p4c-cli:** target `"native"`, options `RnCodegenOptions` (rn-web-demo would pass
  `{ fontStack: "all" }`). Metro has no bundler plugin: run `pureform generate` before Metro, or
  keep `withPureform` for the old path.
- **p7:** native pruning narrows `context.components` today; narrowing variants would need the
  lowering to drop entries of unused variant values before `precompute`.
- **Lockfile:** two lines added to rn-adapter's dependencies by hand.
