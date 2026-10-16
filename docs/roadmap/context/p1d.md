# p1d: Icon fill, mirror, and toggle icon buttons (output context)

Commits: eea83d6..d978a90, plus the `docs(roadmap)` commit that adds this file.

## Built

- **`@pureform/core`**:
    - New value node and style property:

        ```ts
        export interface FontVariationNode {
            type: "fontVariation";
            axes: Record<string, NumericValue>;
        }
        export const fontVariations: (axes: Record<string, NumericValue>) => FontVariationNode;
        // StyleMap
        fontVariationSettings?: ValueNodeMap["fontVariation" | "literal"];
        ```

    - New portable condition `MarkCondition = "mirrored"` (in `PortableCondition`), and
      `STATE_ATTRIBUTES.mirrored = "data-pf-mirror"`.
    - Transform helpers `scaleX(s)` and `scaleY(s)` (the ops existed, the helpers didn't).
- **`@pureform/css-lowering`**: `fontVariation` compiles to `"FILL" <value>, "wght" <value>`;
  `conditionKey("mirrored")` is `&[data-pf-mirror]`. Panda, CSS, and Tailwind follow
  (Panda's nested `_rtl` → `&[data-pf-mirror]`).
- **`@pureform/rn-adapter`**: `fontVariationSettings` is in `DROPPED` (no diagnostic);
  `lowerNode` throws `Unsupported` for a `fontVariation` reached elsewhere. `State` gains
  `mirrored?: boolean`.
- **`@pureform/preset`** (`src/components/shared.ts`):

    ```ts
    /** FILL axis: `rest`, or `filled.fill` while `filled.on` holds. */
    export const iconFill: (
        rest: NumericValue,
        filled?: { on: Condition | Condition[]; fill: NumericValue },
    ) => NonNullable<StyleMap["fontVariationSettings"]>;
    export const iconBox: (
        size: NonNullable<StyleMap["width"]>,
        options?: {
            fill?: StyleMap["fontVariationSettings"];
            transform?: TransformOp[];
        },
    ) => StyleMap;
    ```

    `iconBox` now always adds `states.rtl.states.mirrored.transform = transform(...transform,
  scaleX(-1))`, and `transform(...transform)` as the base when given (field icons pass
    `[translateY(-50%)]`). `slotStateLayer`'s `selected` takes an optional `disabled`
    (case `[selected, disabled]`), and `shapedColors(fill, rest, selected?)` (in
    `shaped.ts`, with the exported `ShapedFill` type) draws selected colors.

- **The fill token**: every component with an icon slot has `iconFill: unitless(0)`
  (`--components-<name>-iconFill`): button, chip,
  dialog, fab, iconButton, listItem and menu (`ROW_TOKENS`), navigationBar and
  navigationRail (`NAV_TOKENS`), searchBar, tabs, textField, textArea, select
  (`FIELD_TOKENS`). Slots: `icon`, `leading`/`trailing`, `itemLeading`/`itemTrailing`,
  `leadingIcon`/`trailingIcon`. States that fill:

    | Component                         | State                                                        | Token                  |
    | --------------------------------- | ------------------------------------------------------------ | ---------------------- |
    | `navigationBar`, `navigationRail` | `slot("item", "selected")` (`aria-current`, `aria-selected`) | `activeIconFill` (1)   |
    | `iconButton`                      | `slot("root", "selected")` (`aria-pressed="true"`)           | `selectedIconFill` (1) |

    The standalone `icon` has a `filled` variant: `inherit` (default, no declaration, follows
    the slot), `false` (`"FILL" 0`), `true` (`"FILL" 1`).

- **Mirror**: an **attribute**, `data-pf-mirror` (`STATE_ATTRIBUTES.mirrored`), on the icon
  element (the icon slot's element, or the standalone icon). Under `rtl` it gets
  `scaleX(-1)` after the slot's own transform. React Native: the `mirrored` state.
- **Toggle icon button** (`src/components/icon-button.ts`): new variant
  `toggle: "false" | "true"` (default `"false"`), and five compound variants
  `{ variant, toggle: "true" }`, each drawing unselected colors and, under
  `slot("root", "selected")`, selected ones:

    | `variant`  | Unselected container / content                   | Selected container / content                                   |
    | ---------- | ------------------------------------------------ | -------------------------------------------------------------- |
    | `standard` | transparent / `onSurfaceVariant`                 | transparent / `accent`                                         |
    | `filled`   | `surfaceContainerHighest` / `accent`             | `accent` / `onAccent`                                          |
    | `tonal`    | `surfaceContainerHighest` / `onSurfaceVariant`   | `accentContainer` / `onAccentContainer`                        |
    | `outlined` | transparent / `onSurfaceVariant` (outline shown) | `inverseSurface` / `inverseOnSurface`, outline `display: none` |
    | `elevated` | `surfaceContainerLow` / `accent`                 | `accent` / `onAccent`                                          |

    (`accent…` are the group tokens the `color` variant points.) Selected and disabled keeps
    a 12% on-surface container unless the selected container is transparent.

- **Tests**: `packages/preset/src/icons.spec.ts` (every icon slot's fill and mirror, the
  filled states, the standalone icon), `icon-button.spec.ts` ("toggle icon buttons": colors
  per fill, outline, disabled), `css-lowering` `conditions.spec.ts`, `panda-adapter`
  `compile-node.spec.ts` (font variations), `rn-adapter` `direction.spec.ts` (mirror,
  dropped axis), `tests/browser-e2e-tests/src/icons.e2e.test.ts` (33 tests: 11 each for Panda,
  CSS, Tailwind), `state-matching.e2e.test.ts` (`mirrored`). Preset snapshots updated (8 files).
- READMEs updated: `core` (mirrored, variable fonts), `css-lowering` (selector table),
  `rn-adapter` (mirror, icon fonts), `preset` (toggle table, Icons section, mirror under
  Direction), `tests/browser-e2e-tests` (suite table). Design doc §5.9, §9.4, §9.6 record the
  decisions.

## Deviations from the design

- **States don't set the fill token; they switch to a second one.** Only root slots may
  set tokens (React Native resolves a component at once), and a navigation item isn't a
  root slot, so the icon slot reads `when(state, FILL activeIconFill, FILL iconFill)`.
- **The toggle needs a variant**, `toggle: "true"`, beyond the `selected` state the phase
  asked for: Material draws an unselected toggle differently from a plain icon button
  (`filled` rests on `surfaceContainerHighest`), and nothing in a plain button's markup says
  it's a toggle. Selected colors live in the compound variants, so `aria-pressed="true"` on
  a non-toggle button changes only the icon's fill.
- `elevated` isn't a Material toggle; it selects to the group's color (preset's choice).
- The preset's plain `standard` and `outlined` icon buttons draw their icon in the group's
  color (pre-existing); Material's plain ones use `onSurfaceVariant`. Not changed here; the
  toggle uses Material's colors.

## Stubs and gaps

- **Binding work, not started** (p2a, p2b, p6a, p8):
    - the icon part's `mirror` prop writing `data-pf-mirror` (web) or passing `mirrored` into
      selection for that slot (React Native: the state is per component, so a component
      with two icons needs the icon resolved on its own);
    - the icon button's `selected`/`defaultSelected`/`onSelectedChange` setting
      `toggle: "true"` and `aria-pressed`;
    - `useIconStyle()` → `{ size, color, filled }`. React Native drops
      `fontVariationSettings`, so p8 has to compute `filled` (evaluate the same state, or
      lower the axis to a private key the hook reads).
- Other states Material might draw filled aren't wired: tabs, chips, list items (a
  navigation drawer's current item), segmented buttons (not in the preset). The switch's
  handle icon and the snackbar's close button don't use `iconBox`, so they have no fill or
  mirror.
- The select's trailing arrow rotates while expanded; marked mirrored under `rtl`, the
  mirror's transform would replace the rotation. Nobody mirrors a down arrow.
- `fontVariationSettings` replaces every axis: an app's `wght` or `opsz` set on an ancestor is
  lost inside an icon slot; set them on the icon element.
- Pre-existing, unchanged: `rn-parity` "every variant value at rest" fails with the same 99
  diff lines (none from the toggle variant or icons).

## How to verify

- `task_run` `build` and `test:unit` over the workspace: all pass (preset 446 tests).
- `task_run` `test:e2e` on `@pureform/browser-e2e-tests` (needs `.env.local`): 244 of 245
  pass; the failure is the pre-existing rn-parity case.
- Single files: `cd tests/browser-e2e-tests && bun x vitest --config vitest.config.e2e.ts run
src/icons src/state-matching` (after `set -a; source .env.local; set +a`).
- Unit: `packages/preset/src/icons.spec.ts`, `packages/preset/src/components/icon-button.spec.ts`,
  `packages/rn-adapter/src/direction.spec.ts`.

## Notes for the next phases

- **p1f (anatomy)**: the icon button gains the `toggle` variant; icon slots are unchanged in
  name. Every icon part takes `mirror` (attribute `data-pf-mirror`).
- **p2a, p2b**: import `STATE_ATTRIBUTES.mirrored`; don't hard-code `data-pf-mirror`. Mark a
  toggle with `aria-pressed` (the `selected` condition matches it), and set `toggle: "true"`
  in the selection whenever the toggle props are present.
- **p6a (icon button)**: the selected colors and fill come from the preset; the binding only
  sets the variant and ARIA.
- **New icon slots** in the preset: build them with `iconBox(size, { fill: iconFill(ref("iconFill"), …) })`
  and add `iconFill: unitless(0)` to the component's tokens, then list the slot in
  `ICON_SLOTS` in `src/icons.spec.ts`. An icon slot with its own `transform` passes it as
  `transform: [...]` so the mirror composes with it.
- A component that sets `states` on an icon slot after spreading `iconBox` replaces the
  mirror's `states.rtl`; merge them instead.
