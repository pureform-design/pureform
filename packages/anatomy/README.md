# @pureform/anatomy

Each preset component's parts, the attributes every part carries, and its default test ids,
generated from the preset's AST. It knows no framework: `@pureform/solid`, `@pureform/react`, and
later `@pureform/react-native` read it to render one element per part, and tests read its
`testIds` instead of hard-coding strings (design doc §9.1, §9.2).

It depends on `@pureform/core` for types only. `@pureform/preset` is a dev dependency: the
generator and the drift test read it, and nothing at runtime does.

## Architecture

```
@pureform/preset ──pureform().components──► scripts/generate.ts ──writes──► src/generated.ts
                                                  │                              │
                                       deriveAnatomy (src/derive.ts)     buttonAnatomy, …, anatomy,
                                                  │                       testIds (literal types)
                    src/anatomy.spec.ts ◄─────────┘ compares them ──────────────┘
```

| Module          | What it does                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `types.ts`      | `ComponentAnatomy`, `PartAnatomy`, `ExtraPart`, `PartName`.                                                     |
| `generated.ts`  | Generated. One constant per component (`buttonAnatomy`), `anatomy` by name, and `testIds`.                      |
| `components.ts` | Types over the generated anatomy: `Anatomies`, `AnatomyName`, `PartOf`.                                         |
| `attributes.ts` | The attribute names, `kebabCase`, `partTestId`, `partAttributes`.                                               |
| `derive.ts`     | The `/derive` subpath: `deriveAnatomy`, `deriveAnatomies`, `renderAnatomyModule`.                               |
| `extras.ts`     | `EXTRA_PARTS`: parts that aren't AST slots (the select's `hiddenSelect`).                                       |
| `composites.ts` | Written by hand: anatomies outside the preset's slots (`radioGroupAnatomy`, `selectMenuAnatomy`, the overlays). |

**Generated, not derived at import.** Deriving at import would pull the whole preset (every
recipe, the theme) into every app bundle just to learn part names. The generated module is plain
data with literal types, so `testIds.button.root` is the type `"pf-button-root"`, and a
bundler drops the components an app doesn't import (`sideEffects: false`).

## The anatomy

```ts
interface ComponentAnatomy<
    N extends string = string,
    P extends string = string,
> {
    readonly name: N; // "iconButton": the name in the config
    readonly scope: string; // "icon-button": the value of data-scope
    readonly root: P; // the outermost part, "root" for every preset component
    readonly partNames: readonly P[]; // the AST's slots in order, then extra parts
    readonly parts: { readonly [K in P]: PartAnatomy<P> };
    readonly indication?: readonly IndicationAnatomy<P>[]; // one per interactive surface
}

interface IndicationAnatomy<P extends string = string> {
    readonly trigger: P; // the part whose interactions feed the interaction source
    readonly surface: P; // the part the state layer tints and the ripple fills (and clips to)
    readonly centered: boolean; // the ripple starts at the surface's center
    readonly focus: P; // the part that draws the focus indicator
    readonly layer?: P; // the part holding the ripple's layer, when not the surface (a card's action area)
}

interface PartAnatomy<P extends string = string> {
    readonly name: P; // "touchTarget"
    readonly attribute: string; // "touch-target": the value of data-pf-part
    readonly testId: string; // "pf-icon-button-touch-target"
    readonly parent: P | null; // from the AST's structure
    readonly children: readonly P[];
    readonly styled: boolean; // false for extra parts, which the registry doesn't style
    readonly mirror: boolean; // an icon slot: takes `mirror`, sets data-pf-mirror
    readonly slot?: string | null; // the registry slot that draws it, when not its name; null: none
}
```

- One part per AST slot. A single-slot component (`icon`, `avatar`, `text`) has one part,
  `root`.
- `parent` and `children` come from the slot component's `structure`.
- `mirror` is `true` when any of the slot's styles (base, variants, compounds) reads the
  `mirrored` state, which every icon slot built with the preset's `iconBox` does.
- Extra parts come after the slots, with `styled: false`. The select's `hiddenSelect` (Zag's
  hidden native `<select>`, §9.5) sits in `root`.
- Names in attribute values and test ids are kebab case: `touchTarget` is
  `data-pf-part="touch-target"` and `pf-<scope>-touch-target`.
- `indication` comes from the component spec's `indication`, which the preset declares beside
  each component's state layer (design doc §9.8, "Where indication draws"). Only interactive
  components have it; the card and the list item have it for when they're interactive (the
  binding knows when), the card a second for its action area (the container its surface, the
  action area holding the layer), and the snackbar has two, its action and its close button. The select's
  options are the menu's items, so `menuAnatomy`, `selectMenuAnatomy`, and `menuOverlayAnatomy`
  carry the menu's entry; `tabsCompositeAnatomy` carries the tabs'.

| Component                     | Trigger      | Surface                        | Centered | Focus    |
| ----------------------------- | ------------ | ------------------------------ | -------- | -------- |
| button, chip, card, list item | `root`       | `root`                         | no       | `root`   |
| card, with an action area     | `actionArea` | `root` (layer in `actionArea`) | no       | `root`   |
| tabs                          | `tab`        | `tab`                          | no       | `tab`    |
| menu (items, select options)  | `item`       | `item`                         | no       | `item`   |
| snackbar                      | `action`     | `action`                       | no       | `action` |
|                               | `close`      | `close`                        | no       | `close`  |
| icon button                   | `root`       | `container`                    | yes      | `root`   |
| FAB                           | `root`       | `container`                    | no       | `root`   |
| navigation bar and rail       | `item`       | `indicator`                    | yes      | `item`   |
| checkbox, radio               | `input`      | `root`                         | yes      | `root`   |
| switch                        | `input`      | `stateLayer`                   | yes      | `root`   |
| slider                        | `handle`     | `stateLayer`                   | yes      | `handle` |

## Public API

### `@pureform/anatomy`

```ts
import {
    buttonAnatomy,
    partAttributes,
    partTestId,
    testIds,
} from "@pureform/anatomy";

buttonAnatomy.parts.icon.mirror; // true
testIds.button.label; // "pf-button-label"

// What a part spreads on the web, after the machine's props:
partAttributes(buttonAnatomy, "label");
// { "data-scope": "button", "data-pf-part": "label", "data-testid": "pf-button-label" }

// Root's testId: a string prefixes every part, a record names parts one by one.
partTestId(buttonAnatomy, "label", "save"); // "save-label"
partTestId(buttonAnatomy, "label", { root: "save" }); // "pf-button-label"
```

| Export                                                                             | What it is                                                       |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `<name>Anatomy` (`buttonAnatomy`, …)                                               | One component's anatomy. Import these in bindings to tree-shake. |
| `anatomy`                                                                          | Every preset component's anatomy, by name.                       |
| `testIds`                                                                          | Default test ids by component and part.                          |
| `partTestId(component, part, testId?)`                                             | A part's test id under Root's `testId` (a `TestIdOverride`).     |
| `partAttributes(component, part, testId?)`                                         | `data-scope`, `data-pf-part`, `data-testid` for a part.          |
| `PART_ATTRIBUTE`, `SCOPE_ATTRIBUTE`, `TEST_ID_ATTRIBUTE`, `TEST_ID_PREFIX`         | The attribute names, and `"pf"`.                                 |
| `kebabCase(name)`                                                                  | `touchTarget` → `touch-target`.                                  |
| `partSlot(part)`                                                                   | The registry slot a part is drawn by: its `slot`, else its name. |
| `ComponentAnatomy`, `PartAnatomy`, `IndicationAnatomy`, `PartName<A>`, `ExtraPart` | The shape.                                                       |
| `Anatomies`, `AnatomyName`, `PartOf<N>`                                            | Types over the preset's components: `PartOf<"button">`.          |

React Native takes the test id as `testID`: use `partTestId` there, not `partAttributes`.

### `@pureform/anatomy/derive`

Build time only: the generator and `@pureform/generate` (for an app's own components) use it.

| Export                                    | What it is                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `deriveAnatomy(spec, extras?)`            | A component spec's anatomy. `extras` defaults to `EXTRA_PARTS[spec.name]`. |
| `deriveAnatomies(components)`             | Every spec's anatomy, by key.                                              |
| `renderAnatomyModule(anatomies, options)` | The source of a module like `generated.ts` (unformatted).                  |
| `EXTRA_PARTS`                             | The extra parts, by component name.                                        |

`deriveAnatomy` throws when `structure` puts a slot in two places or names a slot that doesn't
exist, an extra part's name is a slot or its parent isn't one, or the spec's `indication` names a
part the component doesn't have.

## Refreshing after a preset change

Run the `generate` task (omni `task_run` with `tasks: ["generate"]` on `@pureform/anatomy`, or
`bun run generate` here). It rewrites `src/generated.ts` from `pureform().components` and formats
it with oxfmt. Until then, `src/anatomy.spec.ts` fails with "the preset changed: run
@pureform/anatomy's generate task".

To add an extra part, list it in `src/extras.ts` and regenerate.

**Composites** group preset components without being one, so the generator doesn't write them and
the registry doesn't style them: `radioGroupAnatomy` is the element around a group's radios
(`data-scope="radio-group"`, `data-pf-part="root"`, test id `pf-radio-group-root`, also in
`compositeTestIds.radioGroup.root`). Bindings render them with the same attributes and test id
rules as any part (`useUnstyledComponent`), and they stay out of `anatomy` and `testIds`.

`selectMenuAnatomy` is the select's list of options, drawn by another component's slots: its
`name` is `"menu"`, so a binding's `useComponent` styles its parts with the menu's registry entry,
and its part names are the menu's slots (`root`, `itemGroup`, `itemGroupLabel`, `item`,
`itemLabel`) plus an unstyled `positioner`. Its `scope` and test ids are the select's: `data-scope="select"`, the list's
`data-pf-part="content"` and `pf-select-content`, then `pf-select-item-group`,
`pf-select-item-group-label`, `pf-select-item`, `pf-select-item-label`,
`pf-select-positioner` (`compositeTestIds.selectMenu`).

**The overlays** (`menuOverlayAnatomy`, `tooltipOverlayAnatomy`, `dialogOverlayAnatomy`) are the
menu, tooltip, and dialog as the bindings render them: an unstyled `root` (the element around
everything, `pf-<scope>-root`), `trigger`, and `positioner`, then the preset's slots. The preset's
`root` slot is the surface, so its part is `content` (`data-pf-part="content"`,
`pf-menu-content`) with `slot: "root"`: a part's `slot` names the registry slot that draws it and
takes the provider's `slotProps` (`partSlot(part)` reads it; `null` for none, as on the wrapper).
The dialog also has an unstyled `closeTrigger`, and its backdrop is `dialogBackdropAnatomy`, drawn
by the scrim's entry (`name: "scrim"`) under the dialog's scope (`pf-dialog-backdrop`). Their test
ids are in `compositeTestIds.menu`, `.tooltip`, `.dialog`, `.dialogBackdrop`; the snackbar uses
its generated anatomy as is.

**The tabs** (`tabsCompositeAnatomy`) are the same idea: an unstyled `root` (`pf-tabs-root`, Zag's
root) around the tab list and the panels. The preset's `root` slot is the tab list, so its part
is `list` (`data-pf-part="list"`, `pf-tabs-list`, `slot: "root"`), holding `tab`, `tabContent`
(`data-pf-part="tab-content"`, `pf-tabs-tab-content`), `icon`, `label`, and `indicator` as the
preset has them (a tab around its content, the content around the rest); each panel is an unstyled `content`
(`pf-tabs-content`). Their test ids are in `compositeTestIds.tabs`. The navigation bar and rail,
the list (`listAnatomy`, a styled `ul` and an `li` per item, `pf-list-root` and `pf-list-item`;
it was a composite until the preset drew it), and the list item use their generated anatomies as
they are.

## Building and testing

- `task_run` `build` and `test:unit` on `@pureform/anatomy`.
- `src/anatomy.spec.ts` is the drift test: every preset component's written anatomy equals
  `deriveAnatomy` of its spec, the icon parts match the preset's icon slots, and `testIds`
  agrees with the parts.
- `src/derive.spec.ts` and `src/attributes.spec.ts` cover deriving, rendering, the test id
  rules, and the types (type checks run with the unit tests).

## Limits

- Only what the AST says: which parts repeat (a menu's `item`), each part's role, the prop
  contract, and the state shape aren't here yet; the binding phases decide them.
- The anatomy covers the preset's default components. An app's own components get theirs from
  `@pureform/generate` (p4a) through `/derive`.
