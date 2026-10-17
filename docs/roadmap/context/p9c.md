# p9c: Indication on the web, Solid and React (output context)

Commits: 7808c40..623276f, plus the `docs` commits that add the READMEs, the design doc's notes,
and this file.

| Commit    | What                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| `7808c40` | `refactor(js-effects)`: `createRipple`, a ripple driven by the presses its caller reports; `ripple()` runs on it  |
| `7eecc18` | `feat(binding-core)`: `materialIndication`, `noIndication`, tokens as CSS, `IndicationHost`, the contracts' props |
| `c3eb283` | `fix(machines)`: the button follows a new `interactionSource`; `pressableItemProps` exported                      |
| `8ed1b04` | `feat(solid)`: indication on every interactive component, the provider's default, the public hooks                |
| `356324e` | `feat(react)`: the same                                                                                           |
| `11b754c` | `feat(bundler)`: pruning keeps the ripple for components that show indication                                     |
| `31d3f06` | `chore(react-demo)`: `ripple` in the demo's allow-list, glue regenerated                                          |
| `623276f` | `fix(solid)`: the same reactive nodes on the server, so hydration finds them                                      |

## Built

### `@pureform/js-effects`

```ts
interface RippleController {
    press(origin: Point | "center", touch?: boolean): void; // touch waits TOUCH_DELAY_MS
    release(origin?: Point): void; // a touch released inside the delay still ripples
    cancel(): void;
}
createRipple(layerOf: () => HTMLElement | null | undefined, options?: RippleOptions): RippleController;
// ripple(container, options) is now pointer events → createRipple; behavior unchanged.
```

New README.

### `@pureform/binding-core`

**`/indication`** (`indication.ts` re-exports `indication-material.ts`, `indication-tokens.ts`,
`indication-host.ts`; new dependency `@pureform/js-effects`, one lockfile line):

```ts
materialIndication(options?: { ripple?: "ink-well" | "ink-sparkle" | false }): Indication;
//   names "material", "material:ink-sparkle", "material:no-ripple"; layer: true unless ripple false;
//   web: subscribes to the source; on a press (unless context.reducedMotion()) makes the
//   controller once and ripples in target.layer from the press's origin ("center" for keys),
//   the ripple elements classed with the registry's `ripple` slot; release/cancel by press id.
//   The same frozen object for the same options.
noIndication: Indication; // "none", tokens: the four state opacities 0; no layer, no web
DEFAULT_INDICATION;       // materialIndication()
rippleClasses(registry): { root?: SlotClasses; ripple?: SlotClasses } | undefined; // static entry only, cached

INDICATION_TOKEN_NAMES; THEME_INDICATION_TOKENS; // stateHoverOpacity → "opacity.stateHover", …,
                                                  // focusIndicatorThickness → "sizes.focusIndicatorThickness"
indicationTokenValue(name, value); indicationTokenValues(tokens); // numbers on lengths → px
providerIndicationOverrides(indication): ThemeOverrides | undefined; // six theme paths, no color
componentIndicationTokens(indication, providerColor): Record<string, string> | undefined;
dropsFocusIndicator(indication); droppedFocusIndicatorMessage(indication);

type IndicationRole = "trigger" | "surface" | "layer" | "state";
indicationRoles(entries, part): readonly { entry: number; role }[]; // cached per entries and part
stateIndicationPart(entry): string; // entry.trigger, or "root" when the trigger is "input"
class IndicationHost {
    constructor(entries, environment: { reducedMotion(): boolean; dir(): Direction });
    configure(indication, registry): void; // restarts effects when either changes
    instance(entry: number, source: InteractionSource): IndicationInstance;
}
class IndicationInstance {
    attach(role, element): () => void;   // the effect starts once trigger, surface (and layer
                                         // when indication.layer) are attached and a registry exists
    subscribeForwarded(listener: (s: { hover; pressed }) => void): () => void;
    readonly forwarded: ForwardedStates;
}
```

**Root:** `ProviderOptions.indication?: Indication`; `ProviderState.indication` (nearest) and
`ProviderState.focusIndicatorColor` (nearest indication that sets one). `components/indication.ts`:
`IndicationProps { indication? }`, `InteractionSourceProps { interactionSource?: MutableInteractionSource }`,
`InteractiveProps`, `INTERACTIVE_PROPS`. Added to the contracts: button, chip, icon button, FAB,
checkbox, switch, slider, card, list item (`InteractiveProps` on Root, in `*_ROOT_PROPS`); radio
group, tabs, menu, select, navigation, snackbar (`indication` on Root); `RadioOwnProps`,
`RadioGroupItem`, `TabsItem`, `MenuItem` (and `menuItemProps`), `SelectItem`,
`NavigationItemOwnProps` (`interactionSource` per item). `isInteractiveListItem(props, element)`.

**`/usage`:** every component with an indication entry (and dialog, tooltip: their trigger is a
button) lists `ripple: {}`; `INDICATION = { entry: "ripple", prop: "indication", hook:
"useIndication", none: "noIndication", material: "materialIndication", define: "defineIndication" }`.

### `@pureform/machines`

The button tracks `prop("interactionSource")` (by its `subscribe` function: Zag copies plain-object
props, so the object's identity changes on every `prop()` read) and follows a new source
(`followSource`, ref `unfollowSource`). `pressableItemProps` is exported from `/interaction`.

### `@pureform/solid` and `@pureform/react` (the same API; accessors in Solid, values in React)

| Export                                 | Solid                                                                                                                                                                                                                                                                                                                                                                        | React                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| make a stable source                   | `createInteractionSource(): MutableInteractionSource`                                                                                                                                                                                                                                                                                                                        | `useInteractionSource()`                                 |
| `useInteractionState(source)`          | `Accessor<InteractionState>`                                                                                                                                                                                                                                                                                                                                                 | `InteractionState` (`useSyncExternalStore`)              |
| `useIndication(source, { centered? })` | `{ surface: SurfaceProps; layer: JSX.Element }`                                                                                                                                                                                                                                                                                                                              | `{ surface: SurfaceProps; layer: ReactElement \| null }` |
| re-exported                            | `defineIndication`, `materialIndication`, `noIndication`; types `Indication`, `IndicationContext`, `IndicationTarget`, `IndicationTokens`, `MaterialIndicationOptions`, `MaterialRipple`, `Interaction`, `InteractionKinds`, `InteractionSource`, `InteractionState`, `MutableInteractionSource`, `PointerKind`, `SurfaceIndication`, `SurfaceProps`, `UseIndicationOptions` | same                                                     |

- **Provider:** `indication` prop; its six theme-level tokens go in the element's `style` under
  `overrides` (via `overrideVars`), rendered on the server.
- **`useComponent`** options gain `indication` (the prop), `interactionSource` (the component's
  source), `interactive` (default true); `RenderOptions.interactionSource` (an item part's source).
  For an anatomy with `indication` entries it resolves `prop ?? provider ?? DEFAULT_INDICATION`
  (dev warning once if the thickness is 0), adds `componentIndicationTokens(prop, providerColor)`
  under the selection's own `tokens` while interactive, and for each part the entries name:
  attaches its element (after mount) as trigger/surface/state, renders the layer first inside a
  surface while `interactive && indication.layer` (server too), and ORs forwarded hover/press into
  the state part's attributes (`data-pf-hover`, `data-pf-active`). React does this in an internal
  `IndicatedPartElement`.
- **Components:** each own-source Root uses `useOwnInteractionSource(props.interactionSource)`
  (internal; the app's, else its own, none on the server) for the machine and `useComponent`.
  Composites use `itemInteractionSources()` / `useItemInteractionSources()` (internal; `{
machineProps, item(value, given) }`), and each item part passes `interactionSource` to `render`
  (navigation's `Indicator` gets it from the item context). The card, list item (only while
  interactive), and the snackbar's `Action`/`Close` emit with `useInteractionHandlers(source,
disabled)` (internal, over `pressableItemProps`).
- Specs: `src/indication.spec.tsx` in each binding (7): the default layer and ripple, the
  provider's vars, a nested provider and the prop (tokens on the root only, effect target), the
  provider's color, the dev warning, a shared source (`data-pf-active`/`data-pf-hover` on the
  other, both ripple, `useInteractionState`), `useIndication`. Structure specs now expect the
  layer first.

### `@pureform/bundler`

The scan adds `ripple` when a component with an indication entry, `useIndication`, or an
indicated anatomy in `useComponent` is used, unless every `<PureformProvider>` seen (at least one)
and every component `indication={…}` is statically layerless: `noIndication`,
`materialIndication({ ripple: false })`, `defineIndication({…})` or an object without
`layer: true`. The `Ripple` subpath and `registry.entry("ripple")` still draw it explicitly.

### Demos

react-demo's allow-list gains `ripple` (glue regenerated with `bun x pureform generate`). solid-demo
(all components) and css-demo/tailwind-demo (pruned; the ripple now kept) need nothing: their
pureform buttons and checkboxes ripple with no app code. solid-demo's raw-recipe routes still use
its own `src/lib/ripple.tsx` over `ripple()`; they don't use pureform components.

## A custom indication (both bindings)

```tsx
import { defineIndication, PureformProvider } from "@pureform/solid"; // or "@pureform/react"

const pressScale = defineIndication({
    name: "app:press-scale",
    tokens: {
        stateHoverOpacity: 0.04,
        statePressedOpacity: 0.16,
        focusIndicatorThickness: 4,
    },
    layer: false, // no layer element: nothing to draw in
    web(target, source, context) {
        return source.subscribe((_, state) => {
            if (context.reducedMotion()) return;
            target.surface.style.scale = state.pressed ? "0.97" : "";
        });
    },
});

<PureformProvider registry={registry} indication={pressScale}>
    …
</PureformProvider>;
<Button label="Save" indication={pressScale} />; // or per component
```

## How p9e should find each component's trigger, surface, and layer

- Iterate `<c>Anatomy.indication` (`@pureform/anatomy`; a list, the snackbar has two). Each part
  is `[data-scope="<anatomy.scope>"][data-pf-part="<kebab part>"]` (`testIds`/`partAttributes`
  give the same). Navigation's surface is `indicator`; checkbox/radio surface is `root`, trigger
  `input`; switch and slider surface `stateLayer` (`state-layer`), trigger `input`.
- **The layer:** `surface.querySelector(":scope > [data-ripple-layer]")`, always the surface's
  first element child, `aria-hidden="true"`, with the ripple's `root` class; it has **no**
  `data-pf-part`/`data-scope`. Each ripple inside it is `[data-ripple]` (a `span`, or a `canvas` for
  the sparkle). None while the indication has no layer (`noIndication`, `{ ripple: false }`), nor
  on a non-interactive card or list item.
- **Forwarded states** are on the trigger, or on `root` when the trigger is `input`
  (`stateIndicationPart`).
- Composite items: one surface per tab, menu item, select option, radio, destination; each has its
  own source (pass `interactionSource` on the item part, or in the item's data).

## Deviations from the design

- **"Over the ripple machine"** is over its drawing code: binding-core can't depend on machines
  (machines depends on binding-core), so `materialIndication` draws with `createRipple`. Recorded
  in §9.8 "Built (p9c)".
- **The layer isn't marked as the ripple's root part** (no `data-pf-part`): as a part it matched
  `[data-pf-part=root]` queries inside components (the radio group's own spec counted it).
- **A provider's `focusIndicatorColor`** goes on each interactive component's root as an
  instance token (resolved through nesting), since there's no theme-level token and each root
  resets the component token. p9b's open issue; no theme token was added. A provider or named-theme
  `overrides` of `components.<c>.<indication token>` still doesn't reach the component.
- **Forwarded attributes go on the root for a native-input trigger**, where the preset matches
  hover and press, not on the input.
- **`context.reducedMotion()`** reads the provider's setting and the media query when called,
  instead of each component subscribing through `useReducedMotion()` (same result).
- **`materialIndication` without options sets no tokens**: under a provider whose indication
  changed the theme-level opacities, a component's `indication={materialIndication()}` keeps the
  provider's values (tokens left out keep the theme's, which the provider set).
- **Composites take `interactionSource` per item** (item part or item data), `indication` on Root;
  the snackbar's ready-made component takes no sources (its `Action` and `Close` parts do).

## Stubs and gaps

- **Per-item `disabled`** (a tab, radio, destination) still doesn't end a press in progress (p9a's
  gap; not addressed): only the machine's own `disabled` does. The card, list item, and snackbar
  buttons end theirs when disabled.
- **The ripple's opacity** still reads the theme's `statePressed` (its own `ripple.opacity` token),
  not the surface component's `statePressedOpacity`: a component-level prop doesn't change it; a
  provider-level one does.
- **A swapped `interactionSource`** on a mounted component: the button machine follows it; the other
  machines read their source at each emit (p9a), and the binding's indication re-attaches.
  The machines other than the button don't mirror source state in their API.
- **The layer is eager** (one span per surface), as designed; p9e measures it.
- **React Native** untouched (p9d): binding-core's `materialIndication` has only `web`; p9d adds a
  `native` half (e.g. `{ ...materialIndication(o), native }` in `@pureform/react-native`).
- The menu trigger and dialog/tooltip triggers rendered `as={Button}` get the button's indication.
- solid-demo's raw-recipe pages keep their app-level `Ripple` helper.

## How to verify

- Unit: `task_run` `build` + `test:unit` over the workspace: 142 results, all pass. Per package:
  `packages/binding-core` (`src/indication-web.spec.ts`), `packages/solid` and `packages/react`
  (`src/indication.spec.tsx`; Solid 336 tests, React 320), `packages/machines`
  (`interaction.spec.ts` "follows a new source"), `packages/js-effects` (`createRipple`),
  `packages/bundler` (`prune/scan.spec.ts` ripple cases, `prune/fixture.spec.ts`).
- `tests/component-suites` `test:e2e`: 42 files, 13140 passed, 294 skipped (six projects, server
  rendering included), as before p9c.
- `task_run` `test:e2e` on `@pureform/browser-e2e-tests` (p9b's indication fixtures unchanged) and
  `@pureform/rn-web-demo`: pass. `@pureform/react-native` `test:unit`: pass.

## Notes for the next phases

- **p9d:** `ProviderOptions.indication` and `ProviderState.indication`/`focusIndicatorColor` are
  shared; the RN provider resolves the same way. Combine the native half with binding-core's web
  half rather than redefining names (`materialIndication(o).name` is `"material"`, …), so
  equality and names match across platforms. `noIndication` has no platform half. Contracts already
  carry `indication`/`interactionSource`. Pruning lists `ripple` for indicated components on RN
  too (harmless if RN doesn't need the entry).
- **p9e:** see "How p9e should find…" above. Forwarded states appear only after mount; the ripple
  under reduced motion: none (the context's `reducedMotion()`). Touch presses wait 150 ms before
  rippling. React elements carry fibers: compare elements with `toBe`, never `toMatchObject` (it
  hangs). In Solid, anything created conditionally on `isServer` inside a component breaks
  hydration keys: create the same primitives on both sides (effects don't run on the server).
- **Traps:** Zag copies plain-object props on every `prop()` read; track a source by a function it
  carries. React's `createElement(tag, props, layer, children)` on a void element throws: only
  surfaces get the layer argument.
- `apps/solid-demo/solid-env.d.ts` changes on workspace builds; restore it before committing.
