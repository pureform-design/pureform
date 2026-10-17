# p9b: Indication tokens and the anatomy entry (output context)

Commits: fb56207..ee7e1fd, plus the `docs(roadmap)` commit that adds this file.

| Commit    | What                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `fb56207` | `test(browser-e2e-tests)`: fixtures recorded from the output before any change (web and React Native)   |
| `4e8898c` | `feat(theme, material)`: `focusIndicatorThickness` (3px) and `focusIndicatorOuterOffset` (2px)          |
| `383cf94` | `feat(core)`: `IndicationDeclaration`, a component spec's `indication`                                  |
| `8cb703f` | `feat(preset)`: the seven indication tokens per interactive component, the root reset, the declarations |
| `a4ce93d` | `feat(anatomy)`: `IndicationAnatomy`, `ComponentAnatomy.indication`, regenerated `src/generated.ts`     |
| `e76734a` | `docs(binding-core)`: `IndicationTokens`' comment                                                       |
| `eac3947` | `docs(design)`: "Built (p9b)" in §9.8 (Tokens; Where indication draws)                                  |
| `ee7e1fd` | `docs`: READMEs (preset, theme, material, core, anatomy, browser-e2e-tests)                             |

## Built

### Theme tokens (`@pureform/theme`, `@pureform/material`)

```ts
// @pureform/theme (contracts/foundations.ts, refs.ts)
const FOCUS_INDICATOR_ROLES = ["focusIndicatorThickness", "focusIndicatorOuterOffset"] as const;
type FocusIndicatorRole = (typeof FOCUS_INDICATOR_ROLES)[number];
interface StateContract {
    opacities: Record<StateRole, NumericScalarNode> & Record<string, NumericScalarNode>;
    focusIndicator: Record<FocusIndicatorRole, NumericScalarNode> & Record<string, NumericScalarNode>; // new, required
}
const focusIndicator: (name: FocusIndicatorRole) => AliasNode; // alias("tokens", "sizes", name)

// @pureform/material
const MATERIAL_FOCUS_INDICATOR = { focusIndicatorThickness: 3, focusIndicatorOuterOffset: 2 }; // px
materialState(opacities?, focusIndicator?: Partial<Record<FocusIndicatorRole, number>>): StateProvider;
```

`resolveTheme` requires both names (lengths) and lowers them into `tokens.sizes` beside the
layout's sizes. `ThemeVocabulary.tokens.sizes` includes them.

### Component tokens (`@pureform/preset`, `src/state-layer.ts`, exported from the root)

```ts
type IndicationToken =
    | "stateHoverOpacity" | "stateFocusOpacity" | "statePressedOpacity" | "stateDraggedOpacity"
    | "focusIndicatorThickness" | "focusIndicatorOuterOffset" | "focusIndicatorColor";
const INDICATION_TOKENS: Record<IndicationToken, AliasNode>; // the theme's: opacity("stateHover"), …,
                                                            // focusIndicator(...), colorRole("secondary")
type IndicationRef = (token: IndicationToken) => AliasNode; // a recipe's `token` or componentTokens' `ref`
const themeIndication: IndicationRef;                      // the theme's values themselves
const STATE_LAYER_OPACITY: { hover: "stateHoverOpacity"; focus: …; pressed: …; dragged: … };
stateLayer(token: IndicationRef, { base, content }): ConditionalNode; // signature changed
```

`src/components/shared.ts` (not exported from the package root): `INDICATION_ROOT: StyleMap =
{ tokens: INDICATION_TOKENS }`; `focusRing(token, focused?)` (thickness, color, offset from the
tokens, no literals); `pressableRoot(token)` is now a function; `interactiveColors(token,
container, content)`; `slotStateLayer(token, slotName, rest, selected?)`; `fillTokenColors(fill,
token)` reads them through its token argument. `control.ts`: `controlStateLayer(token, content,
checkedContent)`. `shaped.ts`: `shapedColors(token, fill, colors, selected?)`.

**Per component**: every component with a state layer spreads `...INDICATION_TOKENS` into its
`componentTokens` defaults and `...INDICATION_ROOT` into its base `root` style, and passes its
`ref`/`token` to the helpers. Those are: button, iconButton, fab, chip, card, checkbox, radio,
switchControl, slider, listItem, menu, tabs, navigationBar, navigationRail, snackbar, and
searchBar (tokens and reset, but no indication entry). `ROW_TOKENS` (list, list item, menu) and
`NAV_TOKENS` (bar, rail) include them.

**Var names per target** (component `<c>`, token `<t>`, the demo's prefix `pf`):

| Target                   | Component token                                                                   | Theme tokens                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Panda (demo prefix `pf`) | `--pf-components-<c>-<t>` (`--components-<c>-<t>` with none)                      | `--opacity-state-hover`, …, `--sizes-focus-indicator-thickness`, `--sizes-focus-indicator-outer-offset`, `--colors-secondary` |
| CSS adapter (`prefix`)   | `--pf-components-<c>-<t>`                                                         | the same                                                                                                                      |
| Tailwind adapter         | `--pf-components-<c>-<t>`                                                         | the same                                                                                                                      |
| React Native             | path `components.<c>.<t>` (instance `tokens: { <t> }` through the generated glue) | paths `opacity.stateHover`, `sizes.focusIndicatorThickness`, …                                                                |

Every state-layer value reads `var(--pf-components-<c>-stateHoverOpacity, var(--opacity-state-hover))`;
each component's root rule sets all seven back to the theme's
(`--pf-components-button-stateHoverOpacity: var(--opacity-state-hover)`, …). On React Native the
base-set tokens go through `withSetTokens` (instance tokens win).

### The declaration (`@pureform/core`)

```ts
interface IndicationDeclaration<S extends string = string> {
    trigger: S;
    surface: S;
    centered: boolean;
    focus: S;
}
// BaseComponentSpec.indication?: IndicationDeclaration[]
// typed slotComponent: indication?: IndicationDeclaration<NoInfer<S>>[]; component: IndicationDeclaration<"root">[]
```

### The anatomy entry (`@pureform/anatomy`)

```ts
interface IndicationAnatomy<P extends string = string> {
    readonly trigger: P;
    readonly surface: P;
    readonly centered: boolean;
    readonly focus: P;
}
// ComponentAnatomy.indication?: readonly IndicationAnatomy<P>[]  (absent when not interactive)
```

`deriveAnatomy` copies the spec's `indication` (throws when it names an unknown part);
`src/generated.ts` regenerated. Composites: `selectMenuAnatomy` and `menuOverlayAnatomy` carry the
menu's entry, `tabsCompositeAnatomy` the tabs'; `radioGroupAnatomy` has none (its items are
`radio`s).

| Component                     | Entries (trigger → surface, centered, focus)          |
| ----------------------------- | ----------------------------------------------------- |
| button, chip                  | root → root, no, root                                 |
| card, listItem                | root → root, no, root (applies when interactive)      |
| tabs                          | tab → tab, no, tab                                    |
| menu (items; select options)  | item → item, no, item                                 |
| snackbar                      | action → action, no, action; close → close, no, close |
| iconButton                    | root → container, yes, root                           |
| fab                           | root → container, no, root                            |
| navigationBar, navigationRail | item → **indicator**, yes, item                       |
| checkbox, radio               | input → root, yes, root                               |
| switchControl                 | input → stateLayer, yes, root                         |
| slider                        | input → stateLayer, yes, handle                       |

## Deviations from the design

- **All seven names are component tokens**, including `focusIndicatorThickness` and
  `focusIndicatorOuterOffset` (the phase listed the four opacities and `focusIndicatorColor`).
  Otherwise a component's `indication` prop couldn't set thickness or offset on its root without
  the value reaching nested components; it also makes binding-core's `IndicationTokens` (p9a)
  literally the component tokens' names, unchanged. Recorded in §9.8.
- **Navigation's surface is `indicator`** (the pill), not `activeIndicator`: the active indicator
  has opacity 0 except on the current destination, so a ripple there would be invisible. Both
  carry the state layer. Recorded in §9.8 and in the anatomy spec's table.
- **`ComponentAnatomy.indication` is a list**, for the snackbar's two surfaces.
- **Theme lengths live in `tokens.sizes`** (`--sizes-focus-indicator-thickness`), declared by the
  state contract.
- **The declaration is a core spec field** (`indication`), not preset-only data, so app components
  (p4a's generate) can declare it too.
- **Search bar**: has the tokens (its state layer and focus ring read them) but no anatomy entry,
  per §9.8 ("No indication").
- **`stateDraggedOpacity` is unread** where the state layer follows another slot
  (`slotStateLayer`: iconButton, fab, checkbox, radio, switchControl, slider, navigationBar,
  navigationRail): `slotStateLayer` has no drag case, as before, and adding one would change the
  slider's drag color (pressed 10% today). Listed as unread in `css-adapter`'s codegen spec and
  `panda-factories.e2e.test.ts`.
- **Helper signatures changed**: the token reader is the first argument (`stateLayer(ref, {…})`,
  `focusRing(ref, focused?)`, …); `pressableRoot` became a function.

## Stubs and gaps

- **Provider or named-theme overrides of a component's indication token**
  (`overrides={{ "components.button.stateHoverOpacity": … }}`) no longer reach it: the root resets
  the token, as with `densityOffset`. Theme-level tokens (`opacity.stateHover`,
  `sizes.focusIndicatorThickness`) and instance tokens on the root work. p9c's provider indication
  should write theme-level tokens (as designed); `focusIndicatorColor` has no theme token (it
  defaults to `colors.secondary`), so a provider indication that changes the color needs a theme
  token for it or writes each component's `focusIndicatorColor` var (p9c decides).
- **The ripple** (`components/ripple.ts`) still reads `opacity("statePressed")` directly (p9c).
- **No `indication` prop, layer part, or provider default** yet (p9c web, p9d React Native).
- **The anatomy doesn't say when the card's and list item's entries apply** (interactive only);
  the bindings already know.

## How to verify

- Fixtures (recorded at `fb56207` before any change): `tests/browser-e2e-tests/src/indication.e2e.test.ts`,
  `src/__fixtures__/indication/web.txt` (Panda, CSS, Tailwind compare to the same file) and
  `native.txt` (React Native's selected styles): every component at each variant value, at rest,
  hovered, focused, pressed, dragged, hovered+selected, pressed+checked, focused+checked; background,
  color, outline. Plus "a component's own indication tokens change it and not a nested one of the
  same kind" on the three web targets (button, icon button's container, checkbox) and on React
  Native. `cd tests/browser-e2e-tests && set -a; source ../../.env.local; set +a; bun x vitest --config vitest.config.e2e.ts run src/indication`.
- `packages/preset/src/indication.spec.ts`: every component that draws a state layer declares
  indication (except searchBar); each declared surface reads its own opacity tokens and each focus
  part its focus indicator tokens; each sets all seven back to the theme's on its root.
  `a11y.spec.ts`: the focus ring reads `focusIndicatorThickness`, the theme's is 3px/2px.
- `packages/anatomy/src/anatomy.spec.ts`: every component's entry against §9.8's table (above);
  `composites.spec.ts`, `derive.spec.ts`.
- `task_run` `build` + `test:unit` over the workspace: 142 results, all pass. `test:e2e`:
  `@pureform/component-suites` 42 files, 13140 passed, 294 skipped (six projects, as after p9a);
  `@pureform/browser-e2e-tests` 10 files, 449 passed (parity, rn-parity, visual included);
  `@pureform/rn-web-demo` 9 passed. `@pureform/react-native` `test:unit` passes.
- CSS size (demo config): CSS adapter +32375 B (+3.2%, gzip +1485), Tailwind +32831 B (+3.1%,
  gzip +1525), Panda demo build +30371 B (+2.4%, gzip +1727).

## Notes for the next phases

- **p9c**: write an indication's tokens on a component's root as `--pf-components-<c>-<t>` (the
  registry's `vars`, `tokenVar("components.<c>.<t>", registry.vars)`), or through the factory's
  instance `tokens` (the generated glue maps short names to vars); the provider's as theme vars
  (`tokenVar("opacity.stateHover")` → `--opacity-state-hover`, `tokenVar("sizes.focusIndicatorThickness")`).
  Read where to draw from `<c>Anatomy.indication` (a list): the surface gets the layer; the
  trigger is the element whose machine emits. Navigation's surface is `indicator`. The
  `ripple`'s own opacity still reads the theme.
- **p9d**: React Native instance tokens arrive as `components.<c>.<t>` paths with native values
  (lengths as numbers, colors as strings); the base-set reset goes through `withSetTokens`, and
  instance tokens win. `focusRing` lowers to `outlineWidth`/`outlineColor`/`outlineOffset` from the
  tokens (3, `secondary`, 2 by default).
- **p9e**: `indication.e2e.test.ts`'s fixtures pin today's colors; update with `-u` only for an
  intended change. The anatomy's `indication` list is what the shared suite should iterate.
- **Preset helpers changed signature** (`stateLayer(ref, …)`, `focusRing(ref, …)`,
  `pressableRoot(ref)`): new components spread `INDICATION_TOKENS` and `INDICATION_ROOT` and
  declare `indication`; `indication.spec.ts` fails otherwise.
- **apps/react-demo/.pureform/** was regenerated (`bun x pureform generate`, under Node) and
  committed; `apps/solid-demo/solid-env.d.ts` changes on workspace builds; restore it.
- Lockfile untouched.
