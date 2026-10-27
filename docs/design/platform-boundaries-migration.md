# Platform-boundary API migration

Implementation status and validation gates are tracked in
[the phase plan](platform-boundaries-refactor.md).

## Web binding helpers

Import `cx`, `ClassValue`, `ClassDictionary`, `classEntry`, `lazyFactoryError`,
`serverLazyFactoryMessage`, `combineProps`, `CombineRules`, `mergeStyleObjects`, `partClasses`,
`spreadableProps`, and `outsideRootMessage` from `@pureform/binding-web`, not binding-core.
`rippleClasses` and `RippleClasses` move from `@pureform/binding-core/indication` to
`@pureform/binding-web/indication`. No compatibility web re-exports remain in binding-core.
React's existing public `cx` and `ClassValue` re-exports are unchanged.

Portable keyed readers and types (`forSlot`, `forInstance`, `isPerInstance`, `createSlotReader`,
`SlotKeyed`, `SlotKeyedEach`, `PerInstance`), `partAsRoot`, and neutral anatomy inspection stay
in binding-core. Neutral Material indication identity/options/defaults and `noIndication` also
stay there. Class factory output types (`ClassFactory`, `SlotClasses`, `ClassSlots`) now come
from `@pureform/styling-web` (see the styling boundary below).

## Mixed binding contracts (phase 3)

- Core `ProviderOptions`/`ProviderState` and `ROOT_PROVIDER` contain only registry, direction,
  motion, defaults, generic slot props, indication and inherited focus color. Web uses
  `WebProviderOptions`, `WebProviderState`, `ROOT_WEB_PROVIDER` and `resolveWebProvider` from
  binding-web. `ProviderTheme`, `ThemeName`, `ThemeOverrides` and `ThemeHydration` moved there.
  HTML projection uses the provider's own theme/motion, not its inherited values. Native
  resolves named themes and scheme overrides itself; runtime themes remain web-only.
- Core `IconStyle.color` is `string | undefined`, with no default color or size-unit assumption.
  Binding-web's `IconStyle` narrows color to `string` and its `DEFAULT_ICON_STYLE` retains
  `currentColor`. React/Solid's public types use the web extension; Native uses the neutral one.
- Core `overDefaults(defaults, own, mergeKey)` requires a platform merge policy for keys both
  sides set. It still skips undefined own keys and merges `tokens` shallowly itself.
  `mergeKeyedDefaults` merges part by part, keeping per-instance resolution lazy, and
  `mergeShallowDefaults` is the former shallow merge (an explicit nested `undefined` still wins). Web callers import the two-argument wrapper from
  binding-web. Native's internal wrapper handles StyleProp arrays/registered styles with
  `StyleSheet.flatten`, without altering `nativeSlots` handler or cache policy.
- HTML/Zag adapters moved to binding-web with no compatibility re-exports from core. See the
  [exact export ledger](platform-boundaries-phase3-exports.md). Field consumers needing state
  use `fieldControlState`, not HTML `fieldControlProps`. Core card/list-item selection and card
  layout take a boolean interaction default; web wrappers still accept elements. Native uses
  `selectionListDefaults`, `fabMenuPositioning` and `splitButtonPositioning` rather than creating
  machine props just to obtain defaults.
- Neutral `ToasterOptions.offsets` is numeric (default 16 logical units); binding-web's extension
  retains the existing CSS string/default `"16px"`. Native adapts the neutral value at its
  shared toast-store transport boundary; its rendered placement is unchanged.

## Styling boundary (phase 4)

`@pureform/styling` is now target-neutral and depends on `@pureform/core` alone. Its web half
moved to the new `@pureform/styling-web` (depending on core, styling and CSS lowering), with no
compatibility re-exports:

```ts
// before
import { joinClasses, withTokenStyle, themeScope } from "@pureform/styling";
import type { ClassFactory, CssVars } from "@pureform/styling";
// after
import { joinClasses, withTokenStyle, themeScope } from "@pureform/styling-web";
import type { ClassFactory, CssVars } from "@pureform/styling-web";
import { tokenVar, themeVars } from "@pureform/styling-web/theme-vars";
import { tokenVar, themeVars } from "@pureform/styling/theme-vars";
```

- Moved: `TokenStyle`, `SlotClasses`, `ClassSlots`, `ClassFactory`, `CssVars`,
  `componentClasses`/`Choice`/`ComponentClasses`/`ComponentManifest`, `joinClasses`,
  `tokenStyle`, `withTokenStyle`, `TokenVars`, `SpringVars`, the runtime themes
  (`defineRuntimeTheme`, `isRuntimeTheme`, `preloadTheme`, `themeScope`, `AnyRuntimeTheme`,
  `RuntimeTheme`, `ThemeGenerator`, `ThemeInput`, `ThemeSchemeVars`, `ThemeSource`),
  `ThemeAttributes`, `VarOptions`, and the `./theme-vars` subpath (removed from styling).
- Retained in styling: component/selection types and `ComponentRegistry`/`SpringRoleRegistry`
  augmentation points (generated `registry.d.ts` still augments `@pureform/styling`),
  `StyleFactory`, `TokenValue`, `selectionCache`/`selectionKey`/`deepFreeze`, `VERSION`, and
  `createRegistry` with its entry types.
- Registry: the neutral `Registry` has only `version`, `names`, `has`, `entry`, `preload`;
  `RegistryOptions` has only `version`. `createWebRegistry(input, { version, themeAttribute,
  vars })` returns a frozen `WebRegistry` (adds `themeAttribute`, `themeAttributes(name)`,
  `vars`); `webRegistry(registry, options)` extends an existing neutral registry. Entries are
  the neutral registry's own objects and static/lazy entry types infer as before.
- Generated indexes: web targets (CSS, Tailwind, Panda) now import `createWebRegistry` from
  `@pureform/styling-web`; React Native targets keep `createRegistry` with `{ version }` only
  (adapter `themeAttribute`/`vars` are ignored there). Web factory modules import
  `selectionCache`/`Selection` from styling and `withTokenStyle`/`ClassFactory`/`ClassSlots` from
  styling-web. **Regenerate** existing `.pureform/` output, and add `@pureform/styling-web` to web
  apps' dependencies (React/Solid list it as a peer beside styling).
- Providers: binding-core's `ProviderOptions<P, R>`/`ProviderState<P, R>`/`resolveProvider` take
  the registry type (default neutral `AnyRegistry`); `requireRegistry` returns it. Web providers
  (`WebProviderOptions`, React/Solid `PureformProvider`, storybook decorators, `useRegistry`) take
  and return `AnyWebRegistry`, so hand-made web test registries use `createWebRegistry`.
  `@pureform/bundler/client` types `virtual:pureform/registry` as the neutral `Registry`; web
  apps use `@pureform/bundler/client-web` for a `WebRegistry` (see the bundler types below).
- `@pureform/react` and `@pureform/solid` still re-export `preloadTheme`, `RuntimeTheme`, and
  `ThemeSchemeVars` (now from styling-web). `@pureform/css-adapter/runtime` still re-exports
  `componentClasses`. Material's runtime theme depends on styling-web instead of styling.

## Web wire contracts

Web bindings and CSS compilers now import their shared wire names from
`@pureform/web-contracts`, not a platform-neutral core package:

```ts
import {
    STATE_ATTRIBUTES,
    MOTION_ATTRIBUTE,
    PART_ATTRIBUTE,
    SCOPE_ATTRIBUTE,
    TEST_ID_ATTRIBUTE,
    REDUCED_MOTION_QUERY,
} from "@pureform/web-contracts";
```

Attribute construction (`partAttributes`, `stateAttributes`, `partSources`,
`providerAttributes`, and theme-attribute helpers) belongs to `@pureform/binding-web`.
Anatomy still owns part identity, slot mapping, default test IDs and `partTestId`; Native writes
those test-ID values using its own host prop. Semantic states and `MotionSetting` remain in core.

The old core/anatomy encoder exports are removed rather than forwarded to a web package. All
existing attribute strings remain unchanged, including `pressed` → `data-pf-active` and
`dragged` → `data-pf-dragging`, so existing markup and CSS selectors continue to agree.

## Structured Native easing

Native transition, animation, presence, and theme easing values now carry core `EasingNode`
objects rather than CSS timing strings. Use the semantic constructors from `@pureform/core/ast`:

```ts
import { linearEasing } from "@pureform/core/ast";

const easing = linearEasing(0, [0.5, 20], 1);
```

The Native factory entry exports the `Easing` and `ThemeValue` types. Interpolatable `Concrete`
style values remain numbers or strings; allowing curve objects in theme timing tokens does not
make every style property accept arbitrary objects.

Regenerate existing Native output: old generated modules that encode curves as CSS strings are
not supported by the new transport. Animated and Reanimated consume structured curves directly.
RN-Web serializes curves only at browser animation calls. The existing Native fallback for step
curves remains linear; this refactor does not add step interpolation behavior.

## CSS easing codecs

`formatLinearEasing` and `parseLinearEasing` move from `@pureform/core` to
`@pureform/css-lowering`. Web/compiler code may import the codecs there. Native code should not
switch to that import: it should use the structured curve itself.

Core retains spring sampling, point validation, stop resolution, and curve evaluation as
platform-neutral mathematical operations. Serialized output at web boundaries retains existing
stop percentages, omitted positions, and spring overshoot.

## Ripple timing defaults

`@pureform/js-effects/core` exposes target-neutral ripple timing: the default easing is the
numeric cubic tuple `[0.2, 0, 0, 1]`, with unchanged 450ms grow and 375ms fade durations.
`RippleTiming` remains generic for a target-specific curve representation.

Browser consumers that need CSS-string timing should import the default and timing type from
`@pureform/js-effects`. That browser API retains its previous CSS easing and behavior. Native
consumers continue to import only `/core`; they must not switch to the browser entry.

## Bundler client types (phase 6)

`virtual:pureform/registry` has one ambient declaration per entry, and a registry's type depends
on the target, so `@pureform/bundler/client` no longer assumes the web:

| Entry                          | `registry` type | Use                                               |
| ------------------------------ | --------------- | ------------------------------------------------- |
| `@pureform/bundler/client`     | `Registry`      | React Native (Metro) and any neutral consumer     |
| `@pureform/bundler/client-web` | `WebRegistry`   | CSS, Tailwind, Panda apps (React/Solid providers) |

```jsonc
// web app tsconfig.json
{ "compilerOptions": { "types": ["@pureform/bundler/client-web"] } }
```

Add exactly one: both declare the same module. The neutral entry imports only `@pureform/styling`,
so a Native app type-checks without `@pureform/styling-web` installed (a bundler test lists the
files `tsc` loads to prove it). `@pureform/styling-web` is an optional peer dependency of the
bundler, for the web entry. No app in this repository used the client types.

## Consolidated breaking changes

Public helper APIs changed; generated selectors, HTML attributes, merge precedence, hydration and
reactive-node budgets did not. There are no compatibility re-exports. Regenerate every
`.pureform/` output after upgrading.

**Packages and dependencies**

- New `@pureform/web-contracts` (wire names) and `@pureform/styling-web` (web styling half). Web
  apps depend on `@pureform/styling-web`; `@pureform/react` and `@pureform/solid` list it as a
  peer beside `@pureform/styling`. `@pureform/styling` now depends on `@pureform/core` alone;
  binding-web depends on CSS lowering. Material's runtime theme depends on styling-web.
- `@pureform/styling/theme-vars` is removed; use `@pureform/styling-web/theme-vars`.

**Moved exports**

- core → web-contracts: `STATE_ATTRIBUTES`, `AttributeState`, `StateAttribute`, `MOTION_ATTRIBUTE`.
  core → css-lowering: `formatLinearEasing`, `parseLinearEasing`.
- anatomy → web-contracts: `PART_ATTRIBUTE`, `SCOPE_ATTRIBUTE`, `TEST_ID_ATTRIBUTE`,
  `PartAttributes`; anatomy → binding-web: `partAttributes`.
- binding-core → web-contracts: `REDUCED_MOTION_QUERY`.
- binding-core → binding-web: `stateAttributes`, `StateAttributes`, `partSources`,
  `PartSourcesInput`, `providerAttributes`, `ProviderAttributes`, `themeAttributes`,
  `themeAttributeOf`, `ProviderTheme`, `ThemeName`, `ThemeOverrides`, `ThemeHydration`, `cx`,
  `ClassValue`, `ClassDictionary`, `classEntry`, `lazyFactoryError`, `serverLazyFactoryMessage`,
  `combineProps`, `CombineRules`, `mergeStyleObjects`, `partClasses`, `spreadableProps`,
  `outsideRootMessage`, `rippleClasses`, `RippleClasses` (on `/indication`), the CSS indication
  serializers, and every Zag/HTML/layout adapter listed in the
  [phase 3 ledger](platform-boundaries-phase3-exports.md).
- styling → styling-web: `TokenStyle`, `SlotClasses`, `ClassSlots`, `ClassFactory`, `CssVars`,
  `componentClasses` and its types, `joinClasses`, `tokenStyle`, `withTokenStyle`, `TokenVars`,
  `SpringVars`, the runtime-theme API, `ThemeAttributes`, `VarOptions`.

**Changed contracts**

- Registries: the neutral `Registry`/`RegistryOptions` no longer have `themeAttribute`,
  `themeAttributes`, or `vars`. Web providers take `AnyWebRegistry` (`createWebRegistry`), so
  hand-made web test registries must use it. Generated web indexes call `createWebRegistry`;
  `registryIndex` in `@pureform/generate` takes a `platform` argument.
- Providers: core `ProviderOptions`/`ProviderState` lose `theme`, `overrides`, `hydrate` (now
  `WebProviderOptions`/`WebProviderState`/`resolveWebProvider`/`ROOT_WEB_PROVIDER`) and gain a
  registry type parameter.
- Icons: core `IconStyle.color` may be `undefined` and `DEFAULT_ICON_STYLE.color` is
  `undefined`; web's `IconStyle`/`DEFAULT_ICON_STYLE` keep `currentColor`.
- Defaults: core `overDefaults` requires a merge policy; web callers use binding-web's
  `overDefaults`. **Native behavior change:** `StyleProp` arrays and registered styles in
  list-item defaults are now flattened and merged, where they were replaced wholesale.
- Card/list-item selection helpers take a boolean interaction default; field consumers use
  `fieldControlState`; `ToasterOptions.offsets` is numeric in core (CSS string in web).
- Native: easing values are structured `EasingNode`s (`Easing`/`ThemeValue` types); modules
  generated with CSS-string curves are unsupported. Runtime themes are rejected by shape, with no
  styling import. RN-Web serializes curves only at its WAAPI boundary.
- js-effects: `/core` ripple timing uses the numeric cubic tuple `[0.2, 0, 0, 1]` (generic
  `RippleTiming<Curve>`); the browser entry keeps its CSS-string timing.
- Bundler: `/client` types the neutral registry; web apps switch to `/client-web`.
