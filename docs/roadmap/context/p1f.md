# p1f: @pureform/anatomy (output context)

Commits: 11aa942, plus the `docs(roadmap)` commit that adds this file.

## Built

A new package, `packages/anatomy` (`@pureform/anatomy`), scaffolded with the `ts-package`
generator. `sideEffects: false`. Dependencies: `@pureform/core` (types only). Dev dependency:
`@pureform/preset` (the generator and the drift test). Root catalog entry
`"@pureform/anatomy": "workspace:^"`. Refreshed after p1d: icon slots are marked `mirror`.

### The shape (`src/types.ts`)

```ts
interface PartAnatomy<P extends string = string> {
    readonly name: P; // AST slot name, or an extra part's
    readonly attribute: string; // data-pf-part value, kebab case: "touch-target"
    readonly testId: string; // "pf-<scope>-<attribute>"
    readonly parent: P | null; // from structure; null for the root
    readonly children: readonly P[]; // structure's order, then extra parts
    readonly styled: boolean; // true for AST slots, false for extra parts
    readonly mirror: boolean; // reads the `mirrored` state: an icon slot that takes `mirror`
}
interface ComponentAnatomy<
    N extends string = string,
    P extends string = string,
> {
    readonly name: N; // "iconButton"
    readonly scope: string; // data-scope value: "icon-button"
    readonly root: P; // "root" for every preset component
    readonly partNames: readonly P[]; // slots in AST order, then extras
    readonly parts: { readonly [K in P]: PartAnatomy<P> };
}
type PartName<A extends ComponentAnatomy> = A["partNames"][number];
interface ExtraPart {
    readonly name: string;
    readonly parent: string;
}
```

Example (generated, `as const satisfies ComponentAnatomy`):

```ts
export const buttonAnatomy = {
    name: "button",
    scope: "button",
    root: "root",
    partNames: ["root", "label", "icon", "touchTarget"],
    parts: {
        root: {
            name: "root",
            attribute: "root",
            testId: "pf-button-root",
            parent: null,
            children: ["touchTarget", "icon", "label"],
            styled: true,
            mirror: false,
        },
        icon: {
            name: "icon",
            attribute: "icon",
            testId: "pf-button-icon",
            parent: "root",
            children: [],
            styled: true,
            mirror: true,
        },
        // label, touchTarget ("touch-target", "pf-button-touch-target")
    },
} as const satisfies ComponentAnatomy;
```

### `@pureform/anatomy` (runtime)

| Export                                                                     | Signature / value                                                                                                                                   |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<name>Anatomy`                                                            | one per preset component (34): `buttonAnatomy`, `iconButtonAnatomy`, `selectAnatomy`, `switchControlAnatomy`, …                                     |
| `anatomy`                                                                  | `{ button: buttonAnatomy, … } as const`, keyed by the config's component names                                                                      |
| `testIds`                                                                  | `{ button: { root: "pf-button-root", … }, … } as const` (literal types)                                                                             |
| `partTestId`                                                               | `<A extends ComponentAnatomy>(component: A, part: PartName<A>, testId?: TestIdOverride<PartName<A>>) => string`; throws for an unknown part         |
| `partAttributes`                                                           | same arguments → `PartAttributes` = `{ "data-scope", "data-pf-part", "data-testid" }`                                                               |
| `TestIdOverride<P>`                                                        | `string \| { readonly [K in P]?: string }`: a string prefixes every part (`save` → `save-root`), a record sets ids per part, the rest keep defaults |
| `PART_ATTRIBUTE`, `SCOPE_ATTRIBUTE`, `TEST_ID_ATTRIBUTE`, `TEST_ID_PREFIX` | `"data-pf-part"`, `"data-scope"`, `"data-testid"`, `"pf"`                                                                                           |
| `kebabCase(name)`                                                          | `"touchTarget"` → `"touch-target"`                                                                                                                  |
| `Anatomies`, `AnatomyName`, `PartOf<N>`                                    | `typeof anatomy`, its keys, `PartName<Anatomies[N]>`                                                                                                |

### `@pureform/anatomy/derive` (build time)

```ts
const deriveAnatomy: (
    spec: AnyComponentSpec,
    extras?: readonly ExtraPart[],
) => ComponentAnatomy;
// extras default to EXTRA_PARTS[spec.name]
const deriveAnatomies: (
    components: Readonly<Record<string, AnyComponentSpec>>,
) => Record<string, ComponentAnatomy>;
const renderAnatomyModule: (
    anatomies,
    options: { header: string; typesFrom?: string /* "@pureform/anatomy" */ },
) => string;
const EXTRA_PARTS: Readonly<Record<string, readonly ExtraPart[]>>; // { select: [{ name: "hiddenSelect", parent: "root" }] }
```

- A single-slot component (`kind: "component"`: avatar, media, supportingText, separator,
  icon, touchTarget, text) has one part, `root`.
- `mirror`: any of the slot's styles (base, every variant value, every compound) has a
  `mirrored` key anywhere under `states`. Today: every `iconBox` slot (p1d's `ICON_SLOTS`) and
  the standalone `icon`'s `root`.
- Throws on a slot nested twice, `structure` naming an unknown slot, an extra part named like
  a slot, or an extra part's parent not being a slot. Root: the outermost slot named `root`,
  else the first outermost slot.

### Files

`src/types.ts`, `src/attributes.ts`, `src/components.ts`, `src/generated.ts` (generated),
`src/derive.ts`, `src/extras.ts`, `scripts/generate.ts`, specs `src/anatomy.spec.ts` (drift),
`src/derive.spec.ts`, `src/attributes.spec.ts` (108 tests with type checks). README in the
package; the preset README says to regenerate after slot changes. Design doc §9.2 records the
decisions ("Decided in building it").

## Deviations from the design

- **Generated** (the phase left it open): `scripts/generate.ts` writes `src/generated.ts` from
  `pureform().components` and formats it with oxfmt. Deriving at import would bundle the whole
  preset (recipes, theme) into apps just for part names; the generated module is plain data
  with literal types and tree-shakes per component.
- **Kebab case** in attribute values and test ids (`pf-icon-button-touch-target`,
  `data-pf-part="touch-target"`, `data-scope="icon-button"`), matching Zag's own `data-part`
  style. Keys (`testIds.iconButton.touchTarget`, `parts.touchTarget`) keep the AST's names.
- The anatomy holds only what the AST says. §3's "roles, prop contract, state shape" aren't
  here: the phase scoped them out, and the binding phases decide them.
- Added `mirror` and `styled` per part (not in the phase's list): bindings need to know which
  parts take `mirror` (p1d), and that `hiddenSelect` gets no registry class.

## Stubs and gaps

- No repeat information: a menu's `item`, tabs' `tab`, and the navigation `item` render many
  times; nothing marks it (p6c, p6d).
- `data-scope` vs Zag: Zag's part props set their own `data-scope` (`"switch"` for the switch,
  which the config names `switchControl`). §9.2 spreads ours after the machine's, so ours wins.
  Zag queries elements by id, not scope, as far as checked; p2a/p2b should confirm per machine.
- The anatomy covers the preset's default components only. Apps' own components need
  `@pureform/generate` (p4a) to call `deriveAnatomies` and `renderAnatomyModule` into
  `.pureform/`.

## How to verify

- `task_run` `test:unit` and `build` on `@pureform/anatomy`: pass (108 tests, no type
  errors). Workspace `build` + `test:unit`: everything passes except the pre-existing rn-parity
  e2e case (244 of 245).
- Drift: change a slot or `structure` in the preset and `src/anatomy.spec.ts` fails with "the
  preset changed: run @pureform/anatomy's generate task".
- Refresh: `task_run` with `tasks: ["generate"]`, `project: ["@pureform/anatomy"]` (or
  `bun run generate` in `packages/anatomy`); a clean run leaves `src/generated.ts` unchanged.

## Notes for the next phases

- **p2a, p2b:** import the component's constant (`buttonAnatomy`), not `anatomy`, so bundles
  keep only what they use. Spread `partAttributes(buttonAnatomy, part, props.testId)` after the
  machine's props; Root's `testId` prop is a `TestIdOverride<PartName<typeof buttonAnatomy>>`.
  Parts with `mirror: true` take the `mirror` prop and write `STATE_ATTRIBUTES.mirrored` from
  `@pureform/core`. Parts with `styled: false` get no registry class.
- **p8 (React Native):** use `partTestId` for `testID`; `partAttributes` is web only.
- **p3c, e2e:** select with `testIds.<component>.<part>` (or `[data-pf-part=…]`).
- **p4a:** reuse `@pureform/anatomy/derive` for user components; `renderAnatomyModule`
  imports `ComponentAnatomy` from `@pureform/anatomy` by default.
- **Preset changes** to slots, `structure`, or icon slots: run the `generate` task and commit
  `src/generated.ts`. New extra parts go in `src/extras.ts`.
- **bun install:** in this phase a plain `bun install` (1.4.3) did resolve the new workspace,
  but it also re-resolved unrelated lockfile entries (commander, lightningcss, …), so the lock
  was restored and only the anatomy entries were added by hand (three hunks: the workspace, the
  catalog line, the package line). `bun install` afterwards reports no changes.
