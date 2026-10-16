# p1e: @pureform/styling (output context)

Commits: 90107a5..be9334b, plus the `docs(roadmap)` commit that adds this file.

## Built

A new package, `packages/styling` (`@pureform/styling`), scaffolded with the `ts-package`
generator. `sideEffects: false`. Dependencies: `@pureform/core` (types only),
`@pureform/css-lowering` (only for the `/theme-vars` subpath). Root catalog entry
`"@pureform/styling": "workspace:^"`.

### Entry points

| Import                         | Exports                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `@pureform/styling`            | the types, `createRegistry`, `selectionCache`, `selectionKey`, `deepFreeze`, `tokenStyle`, `withTokenStyle`, `joinClasses`, `componentClasses` |
| `@pureform/styling/theme-vars` | `themeVars`, `ThemeVarsOptions` (re-exported from `@pureform/css-lowering`)                                                                    |

### Types (`src/types.ts`)

```ts
type ComponentState = InteractionCondition | FormCondition | MarkCondition
    | "indeterminate" | "rtl" | "reducedMotion";
// = hover focus focusVisible active pressed dragged disabled selected checked invalid
//   readOnly filled expanded mirrored indeterminate rtl reducedMotion (rn-adapter's State booleans)

interface ComponentShape {
    variants?: Record<string, string>; // group → union of values
    slots?: string;                    // union; default "root"
    states?: string;                   // union; default ComponentState
    tokens?: string;                   // union of dynamic tokens an instance may set; default never
    lazy?: boolean;                    // true: the registry entry is lazy
}
interface ComponentRegistry {}         // augmented by generated .d.ts, name → ComponentShape

type ComponentName = keyof ComponentRegistry & string  // or string while nothing is registered
type ComponentRef = ComponentName | ComponentShape;     // what every generic below takes
type StaticComponentName; type LazyComponentName;       // registered names split by `lazy: true`
type ShapeOf<C>;                                         // registered shape, the shape itself, or open

type VariantValue<V extends string> = V | ("true" extends V ? boolean : never);
type Variants<C extends ComponentRef> = { [G]?: VariantValue<…> };
type SlotOf<C extends ComponentRef>;      // slots, or "root"
type StateOf<C extends ComponentRef>;     // states, or ComponentState
type States<C extends ComponentRef> = { [S in StateOf<C>]?: boolean };
type TokenOf<C extends ComponentRef>;
type TokenValue = string | number;
type InstanceTokens<C extends ComponentRef> = { [T in TokenOf<C>]?: TokenValue };
type Selection<C extends ComponentRef> = Variants<C> & { tokens?: InstanceTokens<C> };

type TokenStyle = Readonly<Record<`--${string}`, string>>;
interface SlotClasses { readonly class: string; readonly style?: TokenStyle }
type ClassSlots<C extends ComponentRef> = { readonly [S in SlotOf<C>]: SlotClasses };
type ClassFactory<C extends ComponentRef> = (selection: Selection<C>) => ClassSlots<C>;

interface SlotStyle<Style = object, Drawing = object> { readonly style: Style; readonly drawing?: Drawing }
type StyleSlots<C extends ComponentRef, Style = object, Drawing = object> = { readonly [S in SlotOf<C>]: SlotStyle<Style, Drawing> };
type StyleFactory<C extends ComponentRef, Style = object, Drawing = object> =
    (selection: Selection<C> & States<C>) => StyleSlots<C, Style, Drawing>;
```

Once `ComponentRegistry` is augmented, an unregistered name is a type error everywhere
(`Variants<"missing">`), and names autocomplete.

### Registry (`src/registry.ts`)

```ts
type AnyFactory = (selection: never) => unknown;
interface LazyInput<M = unknown> { lazy: () => Promise<M> }
type RegistryInput = Record<string, AnyFactory | LazyInput>;
interface StaticEntry<F> { readonly kind: "static"; readonly name: string; readonly factory: F }
interface LazyEntry<F> { readonly kind: "lazy"; readonly name: string; load(): Promise<F> }
type RegistryEntry<F> = StaticEntry<F> | LazyEntry<F>;
type FactoryOf<E, N>; type EntryOf<E, N>;          // the factory / entry type per input name
type StaticEntryName<E>; type LazyEntryName<E>;    // input names by kind
interface Registry<E extends RegistryInput = RegistryInput> {
    readonly names: readonly (keyof E & string)[];
    has(name: string): name is keyof E & string;
    entry<N extends keyof E & string>(name: N): EntryOf<E, N>;
    preload(name: keyof E & string): Promise<void>;
}
const createRegistry: <const E extends RegistryInput>(input: E) => Registry<E>;
```

- Entries are built once and frozen; `entry(name)` returns the same object every call and
  throws `pureform: no component "x" in the registry (it has …)` for an unknown name.
- A lazy loader's result gives the factory as the module itself (a function), its `default`
  export, or its export named after the entry; otherwise `load()` rejects.
- `load()` returns one shared promise (stable for React's `use`); a rejected load is cleared,
  so the next call tries again.
- `preload(name)` starts the load and never rejects (resolves at once for a static entry);
  it throws synchronously for an unknown name.

### Cache (`src/cache.ts`)

```ts
interface SelectionOrder {
    readonly variants: readonly string[];
    readonly states?: readonly string[];
    readonly defaults?: Readonly<Record<string, string>>;
}
interface SelectionCache<S, R> {
    (selection: S): R;
    readonly size: number;
    clear(): void;
}
const selectionKey: (order: SelectionOrder, selection: object) => string;
const selectionCache: <S extends object, R>(
    order: SelectionOrder,
    compute: (selection: S) => R,
) => SelectionCache<S, R>;
const deepFreeze: <T>(value: T) => T;
```

- Key: each group's value (`true`/`false` → `"true"`/`"false"`, else the default, else empty)
  followed by `|`, then `1`/`0` per state: `"text|true|01"`. Tokens and unknown keys are left out.
- `compute` gets the **normalized** selection the key stands for (groups as strings with
  defaults, states as booleans, no tokens), so `{ toggle: true }` and `{ toggle: "true" }`
  compute once. Results are deep-frozen. `undefined` results are cached too.

### Tokens and classes (`src/tokens.ts`)

```ts
type TokenVars<T extends string = string> = Readonly<Record<T, `--${string}`>>;
const tokenStyle: (
    tokens: Readonly<Record<string, TokenValue | undefined>> | undefined,
    vars: TokenVars,
) => TokenStyle | undefined;
const withTokenStyle: <Slots extends Readonly<Record<string, SlotClasses>>>(
    slots: Slots,
    tokens,
    vars: TokenVars,
    slot?: string /* "root" */,
) => Slots;
const joinClasses: (
    ...classes: (string | false | null | undefined)[]
) => string;
```

`withTokenStyle` returns `slots` itself when no known token is set (so the cached object
passes through), else a new frozen object with that slot's `style` merged.

### Moved (`src/component-classes.ts`)

`componentClasses`, `ComponentManifest`, `Choice`, `ComponentClasses`, unchanged, moved from
`packages/css-adapter/src/runtime.ts` (git rename) with its tests
(`src/component-classes.spec.ts`).

## How a generated factory module should look

Both are working fixtures in `packages/styling/src/__fixtures__/` (`web-button.ts`,
`native-button.ts`), exercised by `src/factory.spec.ts`. Generated code names the component
(`ClassFactory<"button">`) and relies on the generated `.d.ts` augmenting
`ComponentRegistry`; the fixtures pass a shape instead.

```ts
// .pureform/web/button.ts
import { joinClasses, selectionCache, withTokenStyle } from "@pureform/styling";
import type { ClassFactory, ClassSlots, Selection } from "@pureform/styling";

const variant = { filled: { root: "pf-button__root--variant_filled" }, text: { root: "…" } };
const classes = selectionCache<Selection<"button">, ClassSlots<"button">>(
    { variants: ["variant", "size"], defaults: { variant: "filled", size: "medium" } },
    (s) => ({
        root: { class: joinClasses("pf-button__root", variant[s.variant as "filled"].root) },
        label: { class: "pf-button__label" },
    }),
);
const vars = { accent: "--pf-components-button-accent" } as const;
export const button: ClassFactory<"button"> = (s) => withTokenStyle(classes(s), s.tokens, vars);

// .pureform/native/button.ts
export const button: StyleFactory<"button"> = selectionCache<
    Selection<"button"> & States<"button">, StyleSlots<"button">
>({ variants: [...], states: ["pressed", "disabled"], defaults: {...} }, (s) => table(s));

// .pureform/index.ts
export const registry = createRegistry({ button, card: { lazy: () => import("./web/card") } });

// .pureform/registry.d.ts
declare module "@pureform/styling" {
    interface ComponentRegistry {
        button: { variants: { variant: "filled" | "text"; size: "small" | "medium" };
                  slots: "root" | "label"; states: "pressed" | "disabled"; tokens: "accent" };
        card: { variants: {…}; slots: "root"; lazy: true };
    }
}
```

A Panda factory (p2c) can skip `selectionCache` if `sva` is cheap enough, but it must still
return `{ [slot]: { class } }`, not Panda's `{ [slot]: string }`.

## Deviations from the design

- `themeVars` is **wrapped, not moved**: it needs `css-lowering`'s whole lowering
  (`compileNodeToCSS`, var naming), and `css-lowering` can't depend on `styling` without a
  cycle. `@pureform/styling/theme-vars` re-exports it; `css-lowering` and `panda-adapter`
  still export it as before. It's on a subpath so the root entry (shared with React Native)
  never imports CSS lowering.
- The design's `Variants<C>` etc. are "typed from the AST via `defineComponent`'s inference";
  `defineComponent` doesn't infer variant types, so they're typed from `ComponentRegistry`
  (or an inline `ComponentShape`), which the generator writes from the config.
- `StyleFactory` takes `Style` and `Drawing` type parameters (default `object`), since
  `styling` can't import `rn-adapter`'s `Drawing`.
- Added `lazy?: true` to the registry shape so `useClassFactory` can accept only static
  names (`StaticComponentName`), as §5.3 asks.

## Stubs and gaps

- No hooks here: `useClasses`, `useClassFactory`, `useLazyClassFactory`, `useStyles` are p2a,
  p2b, p8.
- `@pureform/css-adapter`'s generated modules still import `componentClasses` from
  `@pureform/css-adapter/runtime` (re-export); moving them to `ClassFactory` modules in
  `.pureform/` is p4b-css.
- No generated `.d.ts` augments `ComponentRegistry` yet (p4a, p4b).

## How to verify

- `task_run` `build` and `test:unit` over the workspace: all pass (styling: 51 tests, with
  type checks).
- `task_run` `build` on `@pureform/css-demo` and `@pureform/tailwind-demo`: both build.
- `task_run` `test:e2e` on `@pureform/browser-e2e-tests`: 244 of 245 pass; the failure is the
  pre-existing rn-parity "every variant value at rest" case.
- Specs: `packages/styling/src/{registry,cache,tokens,types,factory,component-classes}.spec.ts`.

## Notes for the next phases

- **Type tests and the registry:** augmenting `ComponentRegistry` in a spec reaches every file
  in that type check. In `styling` only `types.spec.ts` does; elsewhere, describe components
  by shape, or keep augmentation in one file.
- **p2a, p2b:** the provider holds a `Registry`; `useClasses` branches on `entry.kind`. Use
  `entry.load()` directly as the promise for `use()` / async memos; it's stable.
- **p2c, p4b:** factories must be pure and return every slot. Use `selectionCache` for the
  per-selection table and `withTokenStyle` for instance tokens; a variant value can't contain
  `|`.
- **bun install trap (this checkout, Bun 1.4.3):** after a workspace package's dependencies
  change, `bun install` fails with `Workspace dependency "@pureform/css-adapter" not found
(Searched in "./^")`: it reads the catalog's `workspace:^` as a path. This phase edited
  `bun.lock` by hand instead (the new `packages/styling` workspace, its catalog entry, its
  `packages` entry, and css-adapter's new dependency) and the `node_modules` links were
  already in place; `bun install` then has nothing to change. Add a new package's lockfile
  entries the same way.
- **Don't run `bun install --force`** while a dev server (the rn-web-demo's `bunx vite --port
4313`) is running: on this NTFS-over-FUSE disk, Bun can't delete the loaded rolldown
  binding (`.fuse_hidden*` files) and loops forever, after deleting the package's other files.
  This phase hit it and restored
  `node_modules/.bun/@rolldown+binding-linux-x64-gnu@1.2.14/…` from `~/.bun/install/cache`.
  A plain `bun install` with no lockfile changes is fine.
